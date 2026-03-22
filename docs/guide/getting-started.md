# Getting Started

## Installation

```bash
npm install @frauschert/env-guard
```

## Quick Start

```ts
import { createEnv } from "@frauschert/env-guard";

const env = createEnv({
  PORT: { type: "number", required: true },
  HOST: { type: "string", default: "localhost" },
  DEBUG: { type: "boolean", default: false },
  DATABASE_URL: { type: "string", required: true },
});

// env.PORT        → number
// env.HOST        → string
// env.DEBUG       → boolean
// env.DATABASE_URL → string
```

If a required variable is missing or a value doesn't match its declared type, `createEnv` throws with a descriptive error listing **all** problems at once:

```
🚨 Env-Guard validation errors on app start:
❌ 'PORT': Expected 'number', but got 'abc'.
❌ 'DATABASE_URL': Is marked as required but was not found.
```

## How It Works

1. Define a **schema** — a plain object mapping variable names to their type, constraints, and metadata.
2. Call `createEnv(schema)` — it reads `process.env`, parses and validates every key, and returns a fully typed object.
3. If any variable is missing or invalid, an error is thrown **before your app can start** with bad config.

## Next Steps

- [Schema Options](/guide/schema-options) — all available per-variable options
- [.env File Loading](/guide/env-files) — load variables from `.env` files with zero dependencies
- [Features](/features/validators-formats) — validators, formats, arrays, prefix scoping, and more
- [Framework Recipes](/frameworks/overview) — first-class adapters for Next.js, Vite, Astro, SvelteKit, and Remix
