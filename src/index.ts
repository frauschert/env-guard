import type { EnvSchema, InferEnv } from "./types";

/**
 * Creates a strongly typed environment object based on the provided schema.
 * @param schema The schema defining the expected environment variables and their types.
 * @returns A strongly typed object with the parsed environment variables.
 * @throws Error if required variables are missing or have invalid values.
 */
export function createEnv<S extends EnvSchema>(schema: S): InferEnv<S> {
  const parsedEnv: Record<string, string | number | boolean | undefined> = {};
  const validationErrors: string[] = [];

  // 1. Iterate over each key in the schema and validate/parse the corresponding env variable
  for (const [key, config] of Object.entries(schema)) {
    const rawValue = process.env[key];

    // 2. Check if the variable is required but missing
    if (config.required && rawValue === undefined) {
      validationErrors.push(
        `❌ '${key}': Is marked as required but was not found.`,
      );
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

    // 4. Check choices constraint
    if (config.choices && parsedEnv[key] !== undefined) {
      if (!config.choices.includes(parsedEnv[key]!)) {
        validationErrors.push(
          `❌ '${key}': Value '${parsedEnv[key]}' is not in allowed choices [${config.choices.map((c) => `'${c}'`).join(", ")}].`,
        );
      }
    }

    // 5. Run custom validate function if provided
    if (config.validate && parsedEnv[key] !== undefined) {
      if (!config.validate(parsedEnv[key]!)) {
        validationErrors.push(
          `❌ '${key}': Custom validation failed for value '${parsedEnv[key]}'.`,
        );
      }
    }
  }

  // 5. Fail-Fast: If errors are found, abort the app IMMEDIATELY!
  if (validationErrors.length > 0) {
    const errorMessage =
      `\n🚨 Env-Guard validation errors on app start:\n` +
      validationErrors.join("\n");
    throw new Error(errorMessage);
  }

  // Everything successful, return the clean object with type safety
  return parsedEnv as InferEnv<S>;
}
