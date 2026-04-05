# Zod Adapter

The `@frauschert/env-guard-zod` package lets you define your environment schema using [Zod](https://zod.dev) — giving you access to Zod's full power: `z.coerce`, `z.transform`, `z.refine`, `z.enum`, `z.union`, and more.

## Installation

```bash
npm install @frauschert/env-guard-zod zod
```

> `zod >= 3.0.0` and `@frauschert/env-guard` are peer / transitive dependencies installed automatically.

## Quick Start

```ts
import { z } from "zod";
import { createZodEnv } from "@frauschert/env-guard-zod";

const env = createZodEnv({
  PORT: z.coerce.number().int().min(1).max(65535),
  HOST: z.string().default("localhost"),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// env.PORT       → number
// env.HOST       → string
// env.DATABASE_URL → string
// env.LOG_LEVEL  → "debug" | "info" | "warn" | "error"
```

## API Reference

### `createZodEnv(schema, options?)`

| Parameter | Type                         | Description                                     |
| --------- | ---------------------------- | ----------------------------------------------- |
| `schema`  | `ZodEnvSchema`               | Object mapping variable names to Zod types      |
| `options` | `ZodEnvOptions` _(optional)_ | Global options (env files, prefix, watch, etc.) |

Returns `InferZodEnv<S>`, or `WatchableZodEnv<S>` when `watch: true`.

### `ZodEnvOptions`

Identical to [`EnvOptions`](/api/#envoptions) from the core package.

| Property   | Type                         | Default     | Description                                  |
| ---------- | ---------------------------- | ----------- | -------------------------------------------- |
| `envFiles` | `boolean \| string[]`        | `false`     | Load `.env` files before validation          |
| `prefix`   | `string`                     | `undefined` | Prefix prepended when reading env variables  |
| `onError`  | `(errors: string[]) => void` | `undefined` | Custom error handler, replaces default throw |
| `strict`   | `boolean`                    | `false`     | Proxy throws on access to unknown keys       |
| `freeze`   | `boolean`                    | `false`     | `Object.freeze` the returned object          |
| `watch`    | `true`                       | `undefined` | Return a watchable env with `refresh()`      |

## Options

### `.env` File Loading

```ts
const env = createZodEnv(
  { DATABASE_URL: z.string().url() },
  { envFiles: true },
);
```

### Prefix Scoping

```ts
// Reads MYAPP_PORT from process.env
const env = createZodEnv({ PORT: z.coerce.number() }, { prefix: "MYAPP_" });
```

### Custom Error Handler

```ts
const env = createZodEnv(
  { PORT: z.coerce.number() },
  {
    onError(errors) {
      console.error("Env errors:", errors);
      process.exit(1);
    },
  },
);
```

### Strict Mode

Throws when accessing a key not defined in the schema:

```ts
const env = createZodEnv({ HOST: z.string() }, { strict: true });

env.HOST; // ✅
env.UNKNOWN; // ❌ throws
```

### Frozen Output

```ts
const env = createZodEnv({ HOST: z.string() }, { freeze: true });
// Object.isFrozen(env) === true
```

### Runtime Refresh

```ts
const env = createZodEnv({ API_KEY: z.string() }, { watch: true });

env.on("change", (key, oldValue, newValue) => {
  console.log(`${key} changed: ${oldValue} → ${newValue}`);
});

// Later, when process.env changes:
env.refresh();
```

`freeze` and `watch` are mutually exclusive.

## Zod Features

Since each field is a plain Zod type, you get the full Zod feature set:

### Coercion

```ts
const env = createZodEnv({
  PORT: z.coerce.number(), // "3000" → 3000
  TIMEOUT: z.coerce.number().int(),
});
```

### Defaults

```ts
const env = createZodEnv({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().optional().default("localhost"),
});
```

### Enums

```ts
const env = createZodEnv({
  NODE_ENV: z.enum(["development", "test", "production"]),
});
// env.NODE_ENV → "development" | "test" | "production"
```

### String Formats

```ts
const env = createZodEnv({
  API_URL: z.string().url(),
  CONTACT: z.string().email(),
  TOKEN: z.string().uuid(),
});
```

### Transforms

```ts
const env = createZodEnv({
  ALLOWED_ORIGINS: z.string().transform((v) => v.split(",")),
  PORT: z.coerce.number().transform((n) => ({ port: n })),
});
// env.ALLOWED_ORIGINS → string[]
```

### Refinements

```ts
const env = createZodEnv({
  PORT: z.coerce
    .number()
    .refine((n) => n >= 1 && n <= 65535, "Port must be between 1 and 65535"),
});
```

## Nested Groups

Plain objects (non-Zod values) are treated as nested groups. The env key is built as `GROUP_KEY`:

```ts
const env = createZodEnv({
  db: {
    HOST: z.string(),
    PORT: z.coerce.number(),
  },
});

// Reads DB_HOST and DB_PORT from process.env
// env.db.HOST → string
// env.db.PORT → number
```

## Comparison with Core `createEnv`

| Feature                       | `createEnv` (core)   | `createZodEnv` (zod adapter)  |
| ----------------------------- | -------------------- | ----------------------------- |
| Zero dependencies             | ✅                   | Requires `zod`                |
| Type inference                | ✅                   | ✅                            |
| Number / boolean parsing      | Built-in             | `z.coerce.number()` etc.      |
| Enum / choices                | `choices: [...]`     | `z.enum([...])`               |
| Custom validation             | `validate: fn`       | `z.refine(fn)`                |
| Format presets                | `format: "url"` etc. | `z.string().url()` etc.       |
| Transforms                    | `coerce: fn`         | `z.transform(fn)` (full pipe) |
| Nested schemas                | ✅                   | ✅                            |
| Prefix, strict, freeze, watch | ✅                   | ✅                            |
