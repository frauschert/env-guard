import type { z } from "zod";

/** A Zod env schema: each key maps to a Zod type or a nested group of Zod types. */
export type ZodEnvSchema = Record<
  string,
  z.ZodTypeAny | Record<string, z.ZodTypeAny>
>;

/** Infer the TypeScript type from a ZodEnvSchema. */
export type InferZodEnv<S extends ZodEnvSchema> = {
  [K in keyof S]: S[K] extends z.ZodTypeAny
    ? z.infer<S[K]>
    : S[K] extends Record<string, z.ZodTypeAny>
      ? { [GK in keyof S[K]]: z.infer<S[K][GK]> }
      : never;
};

interface ZodEnvOptionsBase {
  /** Load `.env` files before validation. Defaults to `false`. */
  envFiles?: boolean | string[];
  /** Prefix to prepend when reading each env variable (e.g. `"MYAPP_"`). */
  prefix?: string;
  /** Custom error handler. Receives the array of error strings. If provided, replaces the default throw behaviour. */
  onError?: (errors: string[]) => void;
  /** Wrap the returned object in a `Proxy` that throws when accessing keys not defined in the schema. */
  strict?: boolean;
}

interface ZodEnvOptionsWithWatch extends ZodEnvOptionsBase {
  /** When `true`, the returned object supports `.refresh()` and `.on("change", …)`. */
  watch: true;
  /** Cannot use `freeze` together with `watch`. */
  freeze?: never;
}

interface ZodEnvOptionsNoWatch extends ZodEnvOptionsBase {
  watch?: false;
  /** Freeze the returned object with `Object.freeze`. Cannot be combined with `watch`. */
  freeze?: boolean;
}

export type ZodEnvOptions = ZodEnvOptionsWithWatch | ZodEnvOptionsNoWatch;

/** Callback fired when `refresh()` detects a value change. */
export type ZodChangeListener<S extends ZodEnvSchema = ZodEnvSchema> = (
  key: keyof S & string,
  oldValue: unknown,
  newValue: unknown,
) => void;

/** Env object returned when `watch: true`. */
export type WatchableZodEnv<S extends ZodEnvSchema> = InferZodEnv<S> & {
  /** Re-read `process.env`, re-validate, update properties in-place, and fire change callbacks. */
  refresh(): void;
  /** Register a listener for value changes detected by `refresh()`. */
  on(event: "change", listener: ZodChangeListener<S>): void;
  /** Remove a previously registered change listener. */
  off(event: "change", listener: ZodChangeListener<S>): void;
};
