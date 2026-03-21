export type EnvDataType = "string" | "number" | "boolean";

export interface EnvVarConfig {
  type: EnvDataType;
  required?: boolean;
  default?: string | number | boolean;
}

export type EnvSchema = Record<string, EnvVarConfig>;

type InferDataType<T extends EnvVarConfig> = T["type"] extends "number"
  ? number
  : T["type"] extends "boolean"
    ? boolean
    : string;

export type InferEnv<S extends EnvSchema> = {
  [K in keyof S]: S[K]["required"] extends true
    ? InferDataType<S[K]>
    : S[K]["default"] extends undefined
      ? InferDataType<S[K]> | undefined
      : InferDataType<S[K]>;
};
