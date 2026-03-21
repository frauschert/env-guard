# env-guard

Strongly typed, fail-fast environment variable validation for Node.js.

## Features

- **Type-safe** — full TypeScript inference from your schema
- **Fail-fast** — throws immediately on startup if required variables are missing or malformed
- **Zero dependencies** — just your code and Node.js
- **Supports** `string`, `number`, and `boolean` types with defaults
- **Custom validators** — supply a `validate` function for domain-specific checks
- **Enum / union types** — restrict values to a fixed set with `choices`

## Installation

```bash
npm install env-guard
```

## Usage

```ts
import { createEnv } from "env-guard";

const env = createEnv({
  PORT: { type: "number", required: true },
  HOST: { type: "string", default: "localhost" },
  DEBUG: { type: "boolean", default: false },
  DATABASE_URL: { type: "string", required: true },
});

// env.PORT   → number
// env.HOST   → string
// env.DEBUG  → boolean
// env.DATABASE_URL → string
```

If a required variable is missing or a value doesn't match its declared type, `createEnv` throws with a descriptive error listing **all** problems at once:

```
🚨 Env-Guard validation errors on app start:
❌ 'PORT': Expected 'number', but got 'abc'.
❌ 'DATABASE_URL': Is marked as required but was not found.
```

## Schema Options

| Option     | Type                                       | Description                                                      |
| ---------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `type`     | `"string" \| "number" \| "boolean"`        | The expected data type                                           |
| `required` | `boolean`                                  | Fail if the variable is missing                                  |
| `default`  | `string \| number \| boolean`              | Fallback when the variable is unset                              |
| `choices`  | `readonly (string \| number \| boolean)[]` | Fixed set of allowed values (mutually exclusive with `validate`) |
| `validate` | `(value) => boolean`                       | Custom validation function (mutually exclusive with `choices`)   |

### Custom Validators

Supply a `validate` function for domain-specific checks like port ranges, URL formats, or email patterns:

```ts
const env = createEnv({
  PORT: {
    type: "number",
    required: true,
    validate: (v) => v >= 1 && v <= 65535,
  },
  API_URL: {
    type: "string",
    required: true,
    validate: (v) => v.startsWith("https://"),
  },
});
```

If validation fails:

```
❌ 'PORT': Custom validation failed for value '99999'.
```

### Enum / Union Types

Restrict a variable to a fixed set of values with `choices`. Use `as const` for full literal type inference:

```ts
const env = createEnv({
  NODE_ENV: {
    type: "string",
    required: true,
    choices: ["development", "staging", "production"] as const,
  },
});

// env.NODE_ENV is typed as "development" | "staging" | "production"
```

If the value is not in the set:

```
❌ 'NODE_ENV': Value 'invalid' is not in allowed choices ['development', 'staging', 'production'].
```

> **Note:** `choices` and `validate` are mutually exclusive — TypeScript will error if you try to use both on the same variable, and a runtime check guards against it for plain JavaScript consumers.

## License

MIT
