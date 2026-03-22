import type {
  EnvFormat,
  EnvOptions,
  EnvSchema,
  FrameworkEnv,
  FrameworkEnvConfig,
  InferEnv,
  ChangeListener,
  WatchableEnv,
} from "./types";
import { defaultEnvFiles, loadEnvFiles } from "./env-file";

export { loadEnvFiles, defaultEnvFiles } from "./env-file";
export type {
  EnvOptions,
  FrameworkEnvConfig,
  FrameworkEnv,
  ChangeListener,
  WatchableEnv,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6_RE = /^\[?([0-9a-f:]+)\]?$/i;

const FORMAT_VALIDATORS: Record<EnvFormat, (value: string) => boolean> = {
  url: (v) => {
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  },
  email: (v) => EMAIL_RE.test(v),
  ip: (v) => IPV4_RE.test(v) || IPV6_RE.test(v),
  port: (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 65535;
  },
  uuid: (v) => UUID_RE.test(v),
};

const REDACTED = "****";

type ParsedRecord = Record<
  string,
  string | number | boolean | (string | number | boolean)[] | undefined
>;

/**
 * Internal: parse + validate a schema against the current process.env.
 * Returns the parsed values and any validation errors collected.
 */
function parseSchema(
  schema: EnvSchema,
  prefix?: string,
): { parsed: ParsedRecord; errors: string[] } {
  const parsedEnv: ParsedRecord = {};
  const validationErrors: string[] = [];

  for (const [key, config] of Object.entries(schema)) {
    const desc = config.describe ? ` (${config.describe})` : "";
    const isSensitive = "sensitive" in config && config.sensitive === true;
    const displayVal = (v: unknown) => (isSensitive ? REDACTED : `${v}`);
    const displayRaw = (v: string) => (isSensitive ? REDACTED : v);

    const hasChoices = "choices" in config && config.choices;
    const hasValidate = "validate" in config && config.validate;
    const hasFormat = "format" in config && config.format;
    if ([hasChoices, hasValidate, hasFormat].filter(Boolean).length > 1) {
      validationErrors.push(
        `❌ '${key}'${desc}: 'choices', 'validate', and 'format' are mutually exclusive — use only one.`,
      );
      continue;
    }

    const envKey = prefix ? `${prefix}${key}` : key;
    const rawValue = process.env[envKey];

    if (config.required && rawValue === undefined) {
      validationErrors.push(
        `❌ '${envKey}'${desc}: Is marked as required but was not found.`,
      );
      continue;
    }

    if (config.type === "array") {
      if (rawValue === undefined) {
        parsedEnv[key] =
          config.default !== undefined ? config.default : undefined;
        continue;
      }

      // Custom coercion: bypass normal split+parse, use coerced result directly
      if (config.coerce) {
        parsedEnv[key] = config.coerce(rawValue) as
          | (string | number | boolean)[]
          | undefined;
        continue;
      }

      const separator = config.separator ?? ",";
      const items = rawValue.split(separator).map((s) => s.trim());
      const parsed: (string | number | boolean)[] = [];
      let hasError = false;

      for (const item of items) {
        if (config.itemType === "number") {
          const n = Number(item);
          if (Number.isNaN(n)) {
            validationErrors.push(
              `❌ '${key}'${desc}: Array item '${displayRaw(item)}' is not a valid number.`,
            );
            hasError = true;
          } else {
            parsed.push(n);
          }
        } else if (config.itemType === "boolean") {
          const lower = item.toLowerCase();
          if (lower === "true" || lower === "1") {
            parsed.push(true);
          } else if (lower === "false" || lower === "0") {
            parsed.push(false);
          } else {
            validationErrors.push(
              `❌ '${key}'${desc}: Array item '${displayRaw(item)}' is not a valid boolean.`,
            );
            hasError = true;
          }
        } else {
          parsed.push(item);
        }
      }

      if (!hasError) {
        parsedEnv[key] = parsed;
      }
      continue;
    }

    if (rawValue === undefined) {
      parsedEnv[key] =
        config.default !== undefined ? config.default : undefined;
    } else if (config.coerce) {
      // Custom coercion: bypass normal type parsing
      parsedEnv[key] = config.coerce(rawValue) as
        | string
        | number
        | boolean
        | undefined;
    } else if (config.type === "number") {
      const parsedNumber = Number(rawValue);
      if (Number.isNaN(parsedNumber)) {
        validationErrors.push(
          `❌ '${key}'${desc}: Expected 'number', but got '${displayRaw(rawValue)}'.`,
        );
      } else {
        parsedEnv[key] = parsedNumber;
      }
    } else if (config.type === "boolean") {
      const lowerCaseVal = rawValue.trim().toLowerCase();
      if (lowerCaseVal === "true" || lowerCaseVal === "1") {
        parsedEnv[key] = true;
      } else if (lowerCaseVal === "false" || lowerCaseVal === "0") {
        parsedEnv[key] = false;
      } else {
        validationErrors.push(
          `❌ '${key}'${desc}: Expected 'boolean' (true/false/1/0), but got '${displayRaw(rawValue)}'.`,
        );
      }
    } else {
      parsedEnv[key] = rawValue;
    }

    if ("format" in config && config.format && parsedEnv[key] !== undefined) {
      const formatFn = FORMAT_VALIDATORS[config.format];
      if (!formatFn(String(parsedEnv[key]))) {
        validationErrors.push(
          `\u274c '${key}'${desc}: Value '${displayVal(parsedEnv[key])}' does not match format '${config.format}'.`,
        );
      }
    }

    if (config.choices && parsedEnv[key] !== undefined) {
      if (
        !config.choices.includes(parsedEnv[key] as string | number | boolean)
      ) {
        validationErrors.push(
          `❌ '${key}'${desc}: Value '${displayVal(parsedEnv[key])}' is not in allowed choices [${config.choices.map((c) => `'${c}'`).join(", ")}].`,
        );
      }
    }

    if (config.validate && parsedEnv[key] !== undefined) {
      if (!config.validate(parsedEnv[key] as string | number | boolean)) {
        validationErrors.push(
          `❌ '${key}'${desc}: Custom validation failed for value '${displayVal(parsedEnv[key])}'.`,
        );
      }
    }
  }

  return { parsed: parsedEnv, errors: validationErrors };
}

function handleErrors(errors: string[], onError?: (errors: string[]) => void) {
  if (errors.length === 0) return;
  if (onError) {
    onError(errors);
  } else {
    throw new Error(
      `\n\ud83d\udea8 Env-Guard validation errors on app start:\n` +
        errors.join("\n"),
    );
  }
}

function applyStrict<T extends object>(obj: T, schemaKeys: Set<string>): T {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && !schemaKeys.has(prop)) {
        throw new Error(
          `[env-guard] Attempted to access unknown env variable '${prop}'.`,
        );
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * Creates a strongly typed environment object based on the provided schema.
 * @param schema The schema defining the expected environment variables and their types.
 * @param options Optional configuration (e.g. .env file loading).
 * @returns A strongly typed object with the parsed environment variables.
 * @throws Error if required variables are missing or have invalid values.
 */
export function createEnv<S extends EnvSchema>(
  schema: S,
  options: EnvOptions & { watch: true },
): WatchableEnv<S>;
export function createEnv<S extends EnvSchema>(
  schema: S,
  options?: EnvOptions,
): InferEnv<S>;
export function createEnv<S extends EnvSchema>(
  schema: S,
  options?: EnvOptions,
): InferEnv<S> | WatchableEnv<S> {
  // Load .env files if requested
  if (options?.envFiles) {
    const files = Array.isArray(options.envFiles)
      ? options.envFiles
      : defaultEnvFiles();
    loadEnvFiles(files);
  }

  const { parsed, errors } = parseSchema(schema, options?.prefix);
  handleErrors(errors, options?.onError);

  if (options?.freeze && options?.watch) {
    throw new Error(
      "[env-guard] 'freeze' and 'watch' cannot be used together — refresh() needs to mutate the object.",
    );
  }

  const schemaKeys = new Set(Object.keys(schema));

  if (!options?.watch) {
    let result = parsed as InferEnv<S>;
    if (options?.freeze) {
      Object.freeze(result);
    }
    if (options?.strict) {
      result = applyStrict(result, schemaKeys);
    }
    return result;
  }

  // Build a watchable env object with refresh() / on() / off()
  const listeners: Set<ChangeListener<S>> = new Set();
  const env = { ...parsed } as Record<string, unknown>;

  function refresh() {
    const { parsed: next, errors: nextErrors } = parseSchema(
      schema,
      options?.prefix,
    );
    handleErrors(nextErrors, options?.onError);

    for (const key of Object.keys(schema)) {
      const oldVal = env[key];
      const newVal = next[key];
      const changed =
        Array.isArray(oldVal) || Array.isArray(newVal)
          ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
          : oldVal !== newVal;
      if (changed) {
        env[key] = newVal;
        const isSensitive =
          "sensitive" in schema[key] && schema[key].sensitive === true;
        for (const listener of listeners) {
          listener(
            key,
            isSensitive ? REDACTED : oldVal,
            isSensitive ? REDACTED : newVal,
          );
        }
      }
    }
  }

  function on(_event: "change", listener: ChangeListener<S>) {
    listeners.add(listener);
  }

  function off(_event: "change", listener: ChangeListener<S>) {
    listeners.delete(listener);
  }

  Object.defineProperty(env, "refresh", { value: refresh, enumerable: false });
  Object.defineProperty(env, "on", { value: on, enumerable: false });
  Object.defineProperty(env, "off", { value: off, enumerable: false });

  if (options?.strict) {
    const watchKeys = new Set([...schemaKeys, "refresh", "on", "off"]);
    return applyStrict(env, watchKeys) as WatchableEnv<S>;
  }

  return env as WatchableEnv<S>;
}

// ---------------------------------------------------------------------------
// Framework adapters
// ---------------------------------------------------------------------------

function createFrameworkEnv<C extends EnvSchema, S extends EnvSchema>(
  config: FrameworkEnvConfig<C, S>,
  clientPrefix: string,
): FrameworkEnv<C, S> {
  const allErrors: string[] = [];
  const collectErrors = (errors: string[]) => allErrors.push(...errors);

  const client = createEnv(config.client, {
    ...config.options,
    prefix: clientPrefix,
    onError: collectErrors,
  } as EnvOptions);

  const server = createEnv(config.server, {
    ...config.options,
    onError: collectErrors,
  } as EnvOptions);

  if (allErrors.length > 0) {
    if (config.options?.onError) {
      config.options.onError(allErrors);
    } else {
      throw new Error(
        `\n\ud83d\udea8 Env-Guard validation errors on app start:\n` +
          allErrors.join("\n"),
      );
    }
  }

  return { client, server };
}

/** Next.js adapter — prefixes client variables with `NEXT_PUBLIC_`. */
export function createNextEnv<C extends EnvSchema, S extends EnvSchema>(
  config: FrameworkEnvConfig<C, S>,
): FrameworkEnv<C, S> {
  return createFrameworkEnv(config, "NEXT_PUBLIC_");
}

/** Vite adapter — prefixes client variables with `VITE_`. */
export function createViteEnv<C extends EnvSchema, S extends EnvSchema>(
  config: FrameworkEnvConfig<C, S>,
): FrameworkEnv<C, S> {
  return createFrameworkEnv(config, "VITE_");
}

/** Astro adapter — prefixes client variables with `PUBLIC_`. */
export function createAstroEnv<C extends EnvSchema, S extends EnvSchema>(
  config: FrameworkEnvConfig<C, S>,
): FrameworkEnv<C, S> {
  return createFrameworkEnv(config, "PUBLIC_");
}

/** SvelteKit adapter — prefixes client variables with `PUBLIC_`. */
export function createSvelteKitEnv<C extends EnvSchema, S extends EnvSchema>(
  config: FrameworkEnvConfig<C, S>,
): FrameworkEnv<C, S> {
  return createFrameworkEnv(config, "PUBLIC_");
}

/** Remix adapter — no automatic prefix; provides client / server separation only. */
export function createRemixEnv<C extends EnvSchema, S extends EnvSchema>(
  config: FrameworkEnvConfig<C, S>,
): FrameworkEnv<C, S> {
  return createFrameworkEnv(config, "");
}
