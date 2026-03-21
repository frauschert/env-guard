# env-guard

Strongly typed, fail-fast environment variable validation for Node.js.

## Features

- **Type-safe** — full TypeScript inference from your schema
- **Fail-fast** — throws immediately on startup if required variables are missing or malformed
- **Zero dependencies** — just your code and Node.js
- **Supports** `string`, `number`, and `boolean` types with defaults

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

| Option     | Type                             | Description                        |
| ---------- | -------------------------------- | ---------------------------------- |
| `type`     | `"string" \| "number" \| "boolean"` | The expected data type             |
| `required` | `boolean`                        | Fail if the variable is missing    |
| `default`  | `string \| number \| boolean`    | Fallback when the variable is unset |

## License

MIT
