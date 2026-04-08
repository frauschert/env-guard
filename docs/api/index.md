# API Reference

## `createEnv(schema, options?)`

Creates a strongly typed environment object based on the provided schema.

### Parameters

| Parameter | Type                      | Description                                             |
| --------- | ------------------------- | ------------------------------------------------------- |
| `schema`  | `EnvSchema`               | Object mapping variable names to their configuration    |
| `options` | `EnvOptions` _(optional)_ | Global options (env files, prefix, error handler, etc.) |

### Returns

- `InferEnv<S>` — a fully typed object with parsed environment variables.
- `WatchableEnv<S>` — when `watch: true`, extends `InferEnv<S>` with `refresh()`, `on()`, and `off()`.

### Throws

- `Error` if any variable fails validation and no `onError` handler is provided.
- `Error` if `freeze` and `watch` are both set.

---

## `EnvOptions`

| Property   | Type                                      | Default     | Description                                                                                                                               |
| ---------- | ----------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `envFiles` | `boolean \| string[]`                     | `false`     | Load `.env` files before validation                                                                                                       |
| `prefix`   | `string`                                  | `undefined` | Prefix prepended when reading env variables                                                                                               |
| `onError`  | `(errors: string[]) => void`              | `undefined` | Custom error handler replaces default throw                                                                                               |
| `strict`   | `boolean`                                 | `false`     | Proxy throws on access to unknown keys                                                                                                    |
| `freeze`   | `boolean`                                 | `false`     | `Object.freeze` the returned object                                                                                                       |
| `watch`    | `true`                                    | `undefined` | Return a watchable env with `refresh()`                                                                                                   |
| `validate` | `(env: InferEnv<S>) => boolean \| string` | `undefined` | Cross-field validation after per-field checks pass. Return `true` to pass, `false` for a generic error, or a string as the error message. |

`freeze` and `watch` are mutually exclusive (type-level and runtime).

---

## `EnvVarConfig`

Configuration for a single scalar environment variable. One of the following variant shapes:

### Common Fields

| Field       | Type                                               | Description                                                                    |
| ----------- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `type`      | `"string" \| "number" \| "boolean"`                | Expected data type                                                             |
| `required`  | `boolean \| ((env: NodeJS.ProcessEnv) => boolean)` | Fail if missing; function receives full `process.env` for conditional required |
| `default`   | `string \| number \| boolean`                      | Fallback value                                                                 |
| `describe`  | `string`                                           | Human-readable description for error messages                                  |
| `sensitive` | `boolean`                                          | Redact value in errors and change events                                       |
| `coerce`    | `(raw: string) => unknown`                         | Custom coercion before type parsing                                            |

### Variant-Specific Fields

These are mutually exclusive — only one of the following can be set per variable:

| Field      | Type                                              | Description                          |
| ---------- | ------------------------------------------------- | ------------------------------------ |
| `choices`  | `readonly (string \| number \| boolean)[]`        | Fixed set of allowed values          |
| `validate` | `(value: string \| number \| boolean) => boolean` | Custom validation function           |
| `format`   | `"url" \| "email" \| "ip" \| "port" \| "uuid"`    | Built-in format preset (string only) |

---

## `EnvArrayConfig`

Configuration for an array environment variable.

| Field       | Type                                               | Description                                    |
| ----------- | -------------------------------------------------- | ---------------------------------------------- |
| `type`      | `"array"`                                          | Must be `"array"`                              |
| `itemType`  | `"string" \| "number" \| "boolean"`                | Type of each array element                     |
| `separator` | `string`                                           | Delimiter (default `","`)                      |
| `required`  | `boolean \| ((env: NodeJS.ProcessEnv) => boolean)` | Fail if missing; supports conditional function |
| `default`   | `string[]`                                         | Fallback value                                 |
| `describe`  | `string`                                           | Human-readable description                     |
| `sensitive` | `boolean`                                          | Redact in errors and change events             |
| `coerce`    | `(raw: string) => unknown`                         | Custom coercion, bypasses split logic          |

---

## `EnvGroup`

A nested group of variables. Any schema key whose value is a plain object (without a `type` string property) is treated as a group:

```ts
type EnvGroup = Record<string, EnvVarConfig>;
```

The group name is upper-cased and used as an env-var prefix: `db` → `DB_HOST`, `DB_PORT`.

---

## `WatchableEnv<S>`

Returned when `watch: true`. Extends `InferEnv<S>` with:

| Method                          | Description                                  |
| ------------------------------- | -------------------------------------------- |
| `refresh(): void`               | Re-read env, re-validate, fire change events |
| `on("change", listener): void`  | Register a change listener                   |
| `off("change", listener): void` | Remove a change listener                     |

### `ChangeListener<S>`

```ts
type ChangeListener<S> = (
  key: keyof S & string,
  oldValue: unknown,
  newValue: unknown,
) => void;
```

---

## `InferEnv<S>`

Utility type that infers the output shape from a schema:

```ts
type InferEnv<S extends EnvSchema> = {
  [K in keyof S]: /* inferred type based on config */
};
```

- `required: true` → non-nullable
- With `default` → non-nullable
- Optional without default → `T | undefined`
- `choices: [...] as const` → literal union type
- Group keys → nested object

---

## Framework Adapters

All framework adapters share the same signature:

```ts
function createXxxEnv<C extends EnvSchema, S extends EnvSchema>(
  config: FrameworkEnvConfig<C, S>,
): FrameworkEnv<C, S>;
```

### `FrameworkEnvConfig<C, S>`

| Field     | Type                         | Description                           |
| --------- | ---------------------------- | ------------------------------------- |
| `client`  | `C extends EnvSchema`        | Schema for client-side (public) vars  |
| `server`  | `S extends EnvSchema`        | Schema for server-side (private) vars |
| `options` | `Omit<EnvOptions, "prefix">` | Shared options (prefix is auto-set)   |

### `FrameworkEnv<C, S>`

```ts
interface FrameworkEnv<C, S> {
  client: InferEnv<C>;
  server: InferEnv<S>;
}
```

### Available Adapters

| Function             | Client prefix  |
| -------------------- | -------------- |
| `createNextEnv`      | `NEXT_PUBLIC_` |
| `createViteEnv`      | `VITE_`        |
| `createAstroEnv`     | `PUBLIC_`      |
| `createSvelteKitEnv` | `PUBLIC_`      |
| `createRemixEnv`     | _(none)_       |

---

## Standalone Utilities

### `loadEnvFiles(files: string[]): void`

Load the specified `.env` files into `process.env`. Existing values are never overwritten.

### `defaultEnvFiles(): string[]`

Returns the default file list for the current `NODE_ENV`:

```ts
defaultEnvFiles();
// → [".env", ".env.production", ".env.local"]
```
