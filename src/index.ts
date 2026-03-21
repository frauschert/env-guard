import type { EnvFormat, EnvOptions, EnvSchema, InferEnv } from "./types";
import { defaultEnvFiles, loadEnvFiles } from "./env-file";

export { loadEnvFiles, defaultEnvFiles } from "./env-file";
export type { EnvOptions } from "./types";

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

/**
 * Creates a strongly typed environment object based on the provided schema.
 * @param schema The schema defining the expected environment variables and their types.
 * @param options Optional configuration (e.g. .env file loading).
 * @returns A strongly typed object with the parsed environment variables.
 * @throws Error if required variables are missing or have invalid values.
 */
export function createEnv<S extends EnvSchema>(
  schema: S,
  options?: EnvOptions,
): InferEnv<S> {
  // Load .env files if requested
  if (options?.envFiles) {
    const files = Array.isArray(options.envFiles)
      ? options.envFiles
      : defaultEnvFiles();
    loadEnvFiles(files);
  }

  const parsedEnv: Record<
    string,
    string | number | boolean | (string | number | boolean)[] | undefined
  > = {};
  const validationErrors: string[] = [];

  // 1. Iterate over each key in the schema and validate/parse the corresponding env variable
  for (const [key, config] of Object.entries(schema)) {
    // Guard: choices, validate, and format are mutually exclusive
    const hasChoices = "choices" in config && config.choices;
    const hasValidate = "validate" in config && config.validate;
    const hasFormat = "format" in config && config.format;
    if ([hasChoices, hasValidate, hasFormat].filter(Boolean).length > 1) {
      validationErrors.push(
        `❌ '${key}': 'choices', 'validate', and 'format' are mutually exclusive — use only one.`,
      );
      continue;
    }

    const envKey = options?.prefix ? `${options.prefix}${key}` : key;
    const rawValue = process.env[envKey];

    // 2. Check if the variable is required but missing
    if (config.required && rawValue === undefined) {
      validationErrors.push(
        `❌ '${envKey}': Is marked as required but was not found.`,
      );
      continue;
    }

    // Handle array type separately
    if (config.type === "array") {
      if (rawValue === undefined) {
        parsedEnv[key] =
          config.default !== undefined ? config.default : undefined;
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
              `❌ '${key}': Array item '${item}' is not a valid number.`,
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
              `❌ '${key}': Array item '${item}' is not a valid boolean.`,
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
    } else if (config.type === "number") {
      const parsedNumber = Number(rawValue);
      if (Number.isNaN(parsedNumber)) {
        validationErrors.push(
          `❌ '${key}': Expected 'number', but got '${rawValue}'.`,
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
          `❌ '${key}': Expected 'boolean' (true/false/1/0), but got '${rawValue}'.`,
        );
      }
    } else {
      // If it's a string, we just take it as is
      parsedEnv[key] = rawValue;
    }

    // 4. Check format constraint
    if ("format" in config && config.format && parsedEnv[key] !== undefined) {
      const formatFn = FORMAT_VALIDATORS[config.format];
      if (!formatFn(String(parsedEnv[key]))) {
        validationErrors.push(
          `\u274c '${key}': Value '${parsedEnv[key]}' does not match format '${config.format}'.`,
        );
      }
    }

    // 5. Check choices constraint
    if (config.choices && parsedEnv[key] !== undefined) {
      if (
        !config.choices.includes(parsedEnv[key] as string | number | boolean)
      ) {
        validationErrors.push(
          `❌ '${key}': Value '${parsedEnv[key]}' is not in allowed choices [${config.choices.map((c) => `'${c}'`).join(", ")}].`,
        );
      }
    }

    // 5. Run custom validate function if provided
    if (config.validate && parsedEnv[key] !== undefined) {
      if (!config.validate(parsedEnv[key] as string | number | boolean)) {
        validationErrors.push(
          `❌ '${key}': Custom validation failed for value '${parsedEnv[key]}'.`,
        );
      }
    }
  }

  // Fail-Fast: If errors are found, abort the app IMMEDIATELY!
  if (validationErrors.length > 0) {
    if (options?.onError) {
      options.onError(validationErrors);
    } else {
      const errorMessage =
        `\n\ud83d\udea8 Env-Guard validation errors on app start:\n` +
        validationErrors.join("\n");
      throw new Error(errorMessage);
    }
  }

  // Everything successful, return the clean object with type safety
  return parsedEnv as InferEnv<S>;
}
