import type { z } from "zod";
import { loadEnvFiles, defaultEnvFiles } from "@frauschert/env-guard";
import type {
  ZodEnvSchema,
  ZodEnvOptions,
  InferZodEnv,
  WatchableZodEnv,
  ZodChangeListener,
} from "./types";

export type {
  ZodEnvSchema,
  ZodEnvOptions,
  InferZodEnv,
  WatchableZodEnv,
  ZodChangeListener,
} from "./types";

type ParsedRecord = Record<string, unknown>;

/**
 * Returns `true` when the value looks like a Zod schema (has `safeParse`).
 * Plain nested-group objects won't have this method.
 */
function isZodType(value: unknown): value is z.ZodTypeAny {
  return (
    typeof value === "object" &&
    value !== null &&
    "safeParse" in value &&
    typeof (value as Record<string, unknown>).safeParse === "function"
  );
}

/**
 * Internal: parse + validate a Zod schema against the current process.env.
 */
function parseSchema(
  schema: ZodEnvSchema,
  prefix?: string,
): { parsed: ParsedRecord; errors: string[] } {
  const parsedEnv: ParsedRecord = {};
  const validationErrors: string[] = [];

  for (const [key, entry] of Object.entries(schema)) {
    if (!isZodType(entry)) {
      // Nested group
      const groupPrefix = prefix
        ? `${prefix}${key.toUpperCase()}_`
        : `${key.toUpperCase()}_`;
      const { parsed: groupParsed, errors: groupErrors } = parseSchema(
        entry as Record<string, z.ZodTypeAny>,
        groupPrefix,
      );
      parsedEnv[key] = groupParsed;
      validationErrors.push(...groupErrors);
      continue;
    }

    const envKey = prefix ? `${prefix}${key}` : key;
    const rawValue = process.env[envKey];

    // Pass the raw string (or undefined) through Zod's safeParse.
    // Zod handles defaults, optional, coercion, transforms, refinements, etc.
    const result = entry.safeParse(rawValue);

    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message).join("; ");
      validationErrors.push(`❌ '${envKey}': ${issues}`);
    } else {
      parsedEnv[key] = result.data;
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
      `\n🚨 env-guard-zod validation errors:\n` + errors.join("\n"),
    );
  }
}

function applyStrict<T extends object>(obj: T, allowedKeys: Set<string>): T {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && !allowedKeys.has(prop)) {
        throw new Error(
          `[env-guard-zod] Attempted to access unknown env variable '${prop}'.`,
        );
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * Creates a strongly typed environment object validated by Zod schemas.
 */
export function createZodEnv<S extends ZodEnvSchema>(
  schema: S,
  options: ZodEnvOptions & { watch: true },
): WatchableZodEnv<S>;
export function createZodEnv<S extends ZodEnvSchema>(
  schema: S,
  options?: ZodEnvOptions,
): InferZodEnv<S>;
export function createZodEnv<S extends ZodEnvSchema>(
  schema: S,
  options?: ZodEnvOptions,
): InferZodEnv<S> | WatchableZodEnv<S> {
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
      "[env-guard-zod] 'freeze' and 'watch' cannot be used together — refresh() needs to mutate the object.",
    );
  }

  const schemaKeys = new Set(Object.keys(schema));

  if (!options?.watch) {
    let result = parsed as InferZodEnv<S>;
    if (options?.freeze) {
      for (const val of Object.values(result as Record<string, unknown>)) {
        if (typeof val === "object" && val !== null && !Object.isFrozen(val)) {
          Object.freeze(val);
        }
      }
      Object.freeze(result);
    }
    if (options?.strict) {
      result = applyStrict(result, schemaKeys);
    }
    return result;
  }

  // Watchable mode
  const listeners: Set<ZodChangeListener<S>> = new Set();
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
      const isComplex =
        (typeof oldVal === "object" && oldVal !== null) ||
        (typeof newVal === "object" && newVal !== null);
      const changed = isComplex
        ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
        : oldVal !== newVal;
      if (changed) {
        env[key] = newVal;
        for (const listener of listeners) {
          listener(key, oldVal, newVal);
        }
      }
    }
  }

  function on(_event: "change", listener: ZodChangeListener<S>) {
    listeners.add(listener);
  }

  function off(_event: "change", listener: ZodChangeListener<S>) {
    listeners.delete(listener);
  }

  Object.defineProperty(env, "refresh", { value: refresh, enumerable: false });
  Object.defineProperty(env, "on", { value: on, enumerable: false });
  Object.defineProperty(env, "off", { value: off, enumerable: false });

  if (options?.strict) {
    const watchKeys = new Set([...schemaKeys, "refresh", "on", "off"]);
    return applyStrict(env, watchKeys) as WatchableZodEnv<S>;
  }

  return env as WatchableZodEnv<S>;
}
