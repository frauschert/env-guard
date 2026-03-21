export type EnvDataType = "string" | "number" | "boolean";

interface EnvVarConfigBase {
  type: EnvDataType;
  required?: boolean;
  default?: string | number | boolean;
}

interface EnvVarConfigWithValidate extends EnvVarConfigBase {
  validate: (value: string | number | boolean) => boolean;
  choices?: never;
}

interface EnvVarConfigWithChoices extends EnvVarConfigBase {
  choices: readonly (string | number | boolean)[];
  validate?: never;
}

interface EnvVarConfigPlain extends EnvVarConfigBase {
  validate?: never;
  choices?: never;
}

export type EnvVarConfig =
  | EnvVarConfigWithValidate
  | EnvVarConfigWithChoices
  | EnvVarConfigPlain;

export type EnvSchema = Record<string, EnvVarConfig>;

type InferDataType<T extends EnvVarConfig> =
  T["choices"] extends readonly (infer C)[]
    ? C
    : T["type"] extends "number"
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
