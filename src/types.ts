export type EnvDataType = "string" | "number" | "boolean";

export type EnvArrayItemType = "string" | "number" | "boolean";

export type EnvFormat = "url" | "email" | "ip" | "port" | "uuid";

interface EnvVarConfigBase {
  type: EnvDataType;
  required?: boolean;
  default?: string | number | boolean;
  /** Human-readable description. Included in error messages and useful for generated docs. */
  describe?: string;
  /** When `true`, the value is redacted in error messages and change-listener arguments. */
  sensitive?: boolean;
  /** Custom coercion function. Receives the raw string from `process.env` and returns the transformed value. Runs **before** type parsing and validation. */
  coerce?: (raw: string) => unknown;
}

interface EnvVarConfigWithValidate extends EnvVarConfigBase {
  validate: (value: string | number | boolean) => boolean;
  choices?: never;
  format?: never;
}

interface EnvVarConfigWithChoices extends EnvVarConfigBase {
  choices: readonly (string | number | boolean)[];
  validate?: never;
  format?: never;
}

interface EnvVarConfigWithFormat extends EnvVarConfigBase {
  type: "string";
  format: EnvFormat;
  validate?: never;
  choices?: never;
}

interface EnvVarConfigPlain extends EnvVarConfigBase {
  validate?: never;
  choices?: never;
  format?: never;
}

export interface EnvArrayConfig {
  type: "array";
  itemType: EnvArrayItemType;
  separator?: string;
  required?: boolean;
  default?: string[];
  /** Human-readable description. Included in error messages and useful for generated docs. */
  describe?: string;
  /** When `true`, the value is redacted in error messages and change-listener arguments. */
  sensitive?: boolean;
  /** Custom coercion function. Receives the raw string from `process.env` and returns the transformed value. When used with `type: "array"`, the return value replaces the entire parsed array. */
  coerce?: (raw: string) => unknown;
}

export type EnvVarConfig =
  | EnvVarConfigWithValidate
  | EnvVarConfigWithChoices
  | EnvVarConfigWithFormat
  | EnvVarConfigPlain
  | EnvArrayConfig;

export type EnvGroup = Record<string, EnvVarConfig>;

export type EnvSchema = Record<string, EnvVarConfig | EnvGroup>;

type InferArrayItemType<T extends EnvArrayItemType> = T extends "number"
  ? number
  : T extends "boolean"
    ? boolean
    : string;

type InferDataType<T extends EnvVarConfig> = T extends EnvArrayConfig
  ? InferArrayItemType<T["itemType"]>[]
  : T extends { choices: readonly (infer C)[] }
    ? C
    : T["type"] extends "number"
      ? number
      : T["type"] extends "boolean"
        ? boolean
        : string;

type InferEnvVar<V extends EnvVarConfig> = V["required"] extends true
  ? InferDataType<V>
  : V["default"] extends undefined
    ? InferDataType<V> | undefined
    : InferDataType<V>;

export type InferEnv<S extends EnvSchema> = {
  [K in keyof S]: S[K] extends EnvVarConfig
    ? InferEnvVar<S[K]>
    : S[K] extends EnvGroup
      ? {
          [GK in keyof S[K]]: S[K][GK] extends EnvVarConfig
            ? InferEnvVar<S[K][GK]>
            : never;
        }
      : never;
};

interface EnvOptionsBase {
  /** Load `.env` files before validation. Defaults to `false`. */
  envFiles?: boolean | string[];
  /** Prefix to prepend when reading each env variable (e.g. `"MYAPP_"`). */
  prefix?: string;
  /** Custom error handler. Receives the array of error strings. If provided, replaces the default throw behaviour — you must throw or exit yourself if desired. */
  onError?: (errors: string[]) => void;
  /** Wrap the returned object in a `Proxy` that throws when accessing keys not defined in the schema. */
  strict?: boolean;
}

interface EnvOptionsWithWatch extends EnvOptionsBase {
  /** When `true`, the returned object supports `.refresh()` and `.on("change", …)` for runtime re-reading. */
  watch: true;
  /** Cannot use `freeze` together with `watch` — refresh() needs to mutate the object. */
  freeze?: never;
}

interface EnvOptionsNoWatch extends EnvOptionsBase {
  watch?: false;
  /** Freeze the returned object with `Object.freeze` so property mutations throw in strict mode. Cannot be combined with `watch`. */
  freeze?: boolean;
}

export type EnvOptions = EnvOptionsWithWatch | EnvOptionsNoWatch;

/** Callback fired by `WatchableEnv` when `refresh()` detects a value change. */
export type ChangeListener<S extends EnvSchema = EnvSchema> = (
  key: keyof S & string,
  oldValue: unknown,
  newValue: unknown,
) => void;

/** Env object returned when `watch: true`. Extends `InferEnv` with runtime refresh capabilities. */
export type WatchableEnv<S extends EnvSchema> = InferEnv<S> & {
  /** Re-read `process.env`, re-validate, update properties in-place, and fire change callbacks. */
  refresh(): void;
  /** Register a listener for value changes detected by `refresh()`. */
  on(event: "change", listener: ChangeListener<S>): void;
  /** Remove a previously registered change listener. */
  off(event: "change", listener: ChangeListener<S>): void;
};

export interface FrameworkEnvConfig<
  C extends EnvSchema = EnvSchema,
  S extends EnvSchema = EnvSchema,
> {
  /** Schema for client-side (public) environment variables. */
  client: C;
  /** Schema for server-side (private) environment variables. */
  server: S;
  /** Shared options passed to both client and server `createEnv` calls. `prefix` is ignored — the adapter sets it automatically. */
  options?: Omit<EnvOptions, "prefix">;
}

export interface FrameworkEnv<C extends EnvSchema, S extends EnvSchema> {
  client: InferEnv<C>;
  server: InferEnv<S>;
}
