# env-guard

Strongly typed, fail-fast environment variable validation for Node.js.

## Features

- **Type-safe** — full TypeScript inference from your schema
- **Fail-fast** — throws immediately on startup if required variables are missing or malformed
- **Zero dependencies** — just your code and Node.js
- **Supports** `string`, `number`, and `boolean` types with defaults
- **Custom validators** — supply a `validate` function for domain-specific checks
- **Enum / union types** — restrict values to a fixed set with `choices`
- **Format presets** — built-in validators for `url`, `email`, `ip`, `port`, `uuid`
- **Array / list type** — parse comma-separated values into typed arrays
- **`.env` file loading** — built-in support for `.env`, `.env.local`, `.env.{NODE_ENV}` with zero dependencies
- **Prefix scoping** — scope variables by prefix for libraries or microservices
- **Framework adapters** — first-class integrations for Next.js, Vite, Astro, SvelteKit, and Remix

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

| Option     | Type                                           | Description                                                              |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| `type`     | `"string" \| "number" \| "boolean"`            | The expected data type                                                   |
| `required` | `boolean`                                      | Fail if the variable is missing                                          |
| `default`  | `string \| number \| boolean`                  | Fallback when the variable is unset                                      |
| `choices`  | `readonly (string \| number \| boolean)[]`     | Fixed set of allowed values (exclusive with `validate`/`format`)         |
| `validate` | `(value) => boolean`                           | Custom validation function (exclusive with `choices`/`format`)           |
| `format`   | `"url" \| "email" \| "ip" \| "port" \| "uuid"` | Built-in format preset for strings (exclusive with `choices`/`validate`) |

For array variables, use a different schema shape:

| Option      | Type                                | Description                         |
| ----------- | ----------------------------------- | ----------------------------------- |
| `type`      | `"array"`                           | Declares the variable as an array   |
| `itemType`  | `"string" \| "number" \| "boolean"` | The type of each element            |
| `separator` | `string`                            | Delimiter (defaults to `","`)       |
| `required`  | `boolean`                           | Fail if the variable is missing     |
| `default`   | `string[]`                          | Fallback when the variable is unset |

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

> **Note:** `choices`, `validate`, and `format` are mutually exclusive — TypeScript will error if you try to combine them on the same variable, and a runtime check guards against it for plain JavaScript consumers.

### String Format Presets

Use `format` for built-in validation of common string formats:

```ts
const env = createEnv({
  API_URL: { type: "string", format: "url", required: true },
  CONTACT: { type: "string", format: "email", required: true },
  SERVER_IP: { type: "string", format: "ip", required: true },
  APP_PORT: { type: "string", format: "port", required: true },
  REQUEST_ID: { type: "string", format: "uuid", required: true },
});
```

| Format  | Validates                     |
| ------- | ----------------------------- |
| `url`   | Parseable URL (`new URL()`)   |
| `email` | Basic `user@host.tld` pattern |
| `ip`    | IPv4 or IPv6 address          |
| `port`  | Integer between 1 and 65 535  |
| `uuid`  | RFC 4122 hex-and-dash format  |

If the value doesn't match:

```
❌ 'API_URL': Value 'not-a-url' does not match format 'url'.
```

### Array / List Type

Parse comma-separated (or custom-delimited) environment variables into typed arrays:

```ts
const env = createEnv({
  ALLOWED_ORIGINS: { type: "array", itemType: "string", separator: "," },
  PORTS: { type: "array", itemType: "number", required: true },
  FLAGS: { type: "array", itemType: "boolean" },
});

// ALLOWED_ORIGINS="a.com,b.com" → ["a.com", "b.com"]
// PORTS="3000,8080"             → [3000, 8080]
// FLAGS="true,false,1"          → [true, false, true]
```

- `separator` defaults to `","` if omitted
- Whitespace around items is trimmed automatically
- Each item is validated against `itemType` — invalid items produce an error:

```
❌ 'PORTS': Array item 'abc' is not a valid number.
```

### `.env` File Loading

Load environment variables from `.env` files without any external dependency. Pass `envFiles: true` to use the default file list, or provide a custom array:

```ts
// Default: loads .env, .env.{NODE_ENV}, .env.local (in order)
const env = createEnv(schema, { envFiles: true });

// Custom file list
const env = createEnv(schema, {
  envFiles: [".env", ".env.production", ".env.local"],
});
```

**Loading rules:**

- Files are read in order; the first file to define a variable wins
- Existing `process.env` values are **never** overwritten — real environment always takes precedence
- Missing files are silently skipped
- Supports `KEY=value`, quoted values (`"..."` / `'...'`), inline comments, and blank lines

Default file resolution order (when `envFiles: true`):

1. `.env` — base defaults
2. `.env.{NODE_ENV}` — environment-specific overrides (only if `NODE_ENV` is set)
3. `.env.local` — local machine overrides (typically git-ignored)

### Prefix Scoping

Scope environment variables by prefix, useful for libraries or microservices that share an environment:

```ts
const env = createEnv(
  {
    PORT: { type: "number", required: true }, // reads MYAPP_PORT
    DB_HOST: { type: "string", required: true }, // reads MYAPP_DB_HOST
  },
  { prefix: "MYAPP_" },
);

// env.PORT   → value of process.env.MYAPP_PORT
// env.DB_HOST → value of process.env.MYAPP_DB_HOST
```

The schema keys stay short and clean — the prefix is only used when looking up `process.env`. Error messages include the full prefixed name for easy debugging.

### Custom Error Formatter

Provide your own error handling callback instead of the built-in emoji format. When `onError` is set, env-guard calls it with the array of error strings instead of throwing — you decide how to report or throw:

```ts
const env = createEnv(schema, {
  onError: (errors) => {
    console.error("Config errors:");
    errors.forEach((e) => console.error(` - ${e}`));
    process.exit(1);
  },
});
```

If `onError` is not provided, `createEnv` throws an `Error` with the default formatted message.

### Framework Adapters

First-class integrations for popular frameworks. Each adapter provides separate `client` / `server` schemas and automatically applies the framework's public-variable prefix to client-side keys:

| Adapter              | Client prefix  | Import                                           |
| -------------------- | -------------- | ------------------------------------------------ |
| `createNextEnv`      | `NEXT_PUBLIC_` | `import { createNextEnv } from "env-guard"`      |
| `createViteEnv`      | `VITE_`        | `import { createViteEnv } from "env-guard"`      |
| `createAstroEnv`     | `PUBLIC_`      | `import { createAstroEnv } from "env-guard"`     |
| `createSvelteKitEnv` | `PUBLIC_`      | `import { createSvelteKitEnv } from "env-guard"` |
| `createRemixEnv`     | _(none)_       | `import { createRemixEnv } from "env-guard"`     |

#### Next.js example

```ts
import { createNextEnv } from "env-guard";

const env = createNextEnv({
  client: {
    API_URL: { type: "string", format: "url", required: true },
    // reads process.env.NEXT_PUBLIC_API_URL
  },
  server: {
    DATABASE_URL: { type: "string", required: true },
    // reads process.env.DATABASE_URL (no prefix)
  },
});

env.client.API_URL; // string — from NEXT_PUBLIC_API_URL
env.server.DATABASE_URL; // string — from DATABASE_URL
```

#### Vite example

```ts
import { createViteEnv } from "env-guard";

const env = createViteEnv({
  client: {
    APP_TITLE: { type: "string", required: true },
    // reads process.env.VITE_APP_TITLE
  },
  server: {
    API_SECRET: { type: "string", required: true },
  },
});
```

#### Shared options

All adapters accept an optional `options` object (same as `createEnv`, except `prefix` which is set by the adapter):

```ts
const env = createNextEnv({
  client: {
    /* ... */
  },
  server: {
    /* ... */
  },
  options: {
    envFiles: true,
    onError: (errors) => console.error(errors),
  },
});
```

Errors from both `client` and `server` schemas are collected and reported together in a single batch, so you see all problems at once.

## License

MIT

```

```
