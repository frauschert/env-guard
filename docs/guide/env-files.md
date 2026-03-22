# .env File Loading

Load environment variables from `.env` files without any external dependency.

## Basic Usage

```ts
import { createEnv } from "@frauschert/env-guard";

// Default: loads .env, .env.{NODE_ENV}, .env.local (in order)
const env = createEnv(schema, { envFiles: true });

// Custom file list
const env = createEnv(schema, {
  envFiles: [".env", ".env.production", ".env.local"],
});
```

## Loading Rules

- Files are read in order; the **first file** to define a variable wins.
- Existing `process.env` values are **never** overwritten — the real environment always takes precedence.
- Missing files are silently skipped.
- Supports `KEY=value`, quoted values (`"..."` / `'...'`), inline comments, and blank lines.

## Default File Resolution Order

When `envFiles: true`, the following files are loaded (in this order):

1. `.env` — base defaults
2. `.env.{NODE_ENV}` — environment-specific overrides (only if `NODE_ENV` is set)
3. `.env.local` — local machine overrides (typically git-ignored)

## Standalone Helpers

You can also use the file-loading utilities directly:

```ts
import { loadEnvFiles, defaultEnvFiles } from "@frauschert/env-guard";

// Load a custom list
loadEnvFiles([".env", ".env.staging"]);

// Get the default file list for the current NODE_ENV
const files = defaultEnvFiles();
// → [".env", ".env.production", ".env.local"]
```
