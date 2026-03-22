# Schema Options

Every key in the schema object maps to a configuration describing the expected environment variable. Here's a full reference of available options.

## Scalar Variables

| Option      | Type                                           | Description                                                              |
| ----------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| `type`      | `"string" \| "number" \| "boolean"`            | The expected data type                                                   |
| `required`  | `boolean`                                      | Fail if the variable is missing                                          |
| `default`   | `string \| number \| boolean`                  | Fallback when the variable is unset                                      |
| `choices`   | `readonly (string \| number \| boolean)[]`     | Fixed set of allowed values (exclusive with `validate`/`format`)         |
| `validate`  | `(value) => boolean`                           | Custom validation function (exclusive with `choices`/`format`)           |
| `format`    | `"url" \| "email" \| "ip" \| "port" \| "uuid"` | Built-in format preset for strings (exclusive with `choices`/`validate`) |
| `describe`  | `string`                                       | Human-readable description, shown in error messages                      |
| `sensitive` | `boolean`                                      | Redact the value in error messages and change-listener arguments         |
| `coerce`    | `(raw: string) => unknown`                     | Custom coercion function, runs before type parsing                       |

## Array Variables

| Option      | Type                                | Description                                          |
| ----------- | ----------------------------------- | ---------------------------------------------------- |
| `type`      | `"array"`                           | Declares the variable as an array                    |
| `itemType`  | `"string" \| "number" \| "boolean"` | The type of each element                             |
| `separator` | `string`                            | Delimiter (defaults to `","`)                        |
| `required`  | `boolean`                           | Fail if the variable is missing                      |
| `default`   | `string[]`                          | Fallback when the variable is unset                  |
| `describe`  | `string`                            | Human-readable description, shown in error messages  |
| `sensitive` | `boolean`                           | Redact the value in error messages and change events |
| `coerce`    | `(raw: string) => unknown`          | Custom coercion, bypasses split-by-separator logic   |

## Mutual Exclusivity

`choices`, `validate`, and `format` are **mutually exclusive** — TypeScript will error if you try to combine them on the same variable, and a runtime check guards against it for plain JavaScript consumers.

```ts
// ✅ OK — only one of the three
PORT: { type: "number", required: true, validate: (v) => v >= 1 && v <= 65535 }
NODE_ENV: { type: "string", required: true, choices: ["development", "production"] as const }
API_URL: { type: "string", required: true, format: "url" }

// ❌ Compile error — cannot combine them
PORT: { type: "number", required: true, choices: [3000], validate: (v) => v > 0 }
```

## `createEnv` Options

The second argument to `createEnv` configures global behaviour:

| Option     | Type                         | Description                                                 |
| ---------- | ---------------------------- | ----------------------------------------------------------- |
| `envFiles` | `boolean \| string[]`        | Load `.env` files before validation                         |
| `prefix`   | `string`                     | Prefix prepended when reading each env variable             |
| `onError`  | `(errors: string[]) => void` | Custom error handler — replaces the default throw           |
| `strict`   | `boolean`                    | Proxy that throws on access to keys not in the schema       |
| `freeze`   | `boolean`                    | `Object.freeze` the result — mutations throw                |
| `watch`    | `true`                       | Return a watchable object with `refresh()`, `on()`, `off()` |

::: warning
`freeze` and `watch` are mutually exclusive — both at the type level and at runtime.
:::
