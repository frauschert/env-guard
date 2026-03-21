export type EnvDataType = "string" | "number" | "boolean";

export type EnvArrayItemType = "string" | "number" | "boolean";

export type EnvFormat = "url" | "email" | "ip" | "port" | "uuid";

interface EnvVarConfigBase {
  type: EnvDataType;
  required?: boolean;
  default?: string | number | boolean;
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
}

export type EnvVarConfig =
  | EnvVarConfigWithValidate
  | EnvVarConfigWithChoices
  | EnvVarConfigWithFormat
  | EnvVarConfigPlain
  | EnvArrayConfig;

export type EnvSchema = Record<string, EnvVarConfig>;

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

export type InferEnv<S extends EnvSchema> = {
  [K in keyof S]: S[K]["required"] extends true
    ? InferDataType<S[K]>
    : S[K]["default"] extends undefined
      ? InferDataType<S[K]> | undefined
      : InferDataType<S[K]>;
};

export interface EnvOptions {
  /** Load `.env` files before validation. Defaults to `false`. */
  envFiles?: boolean | string[];
  /** Prefix to prepend when reading each env variable (e.g. `"MYAPP_"`). */
  prefix?: string;
}
