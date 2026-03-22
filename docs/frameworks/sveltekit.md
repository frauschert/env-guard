# SvelteKit

Use `createSvelteKitEnv` for SvelteKit projects. Client-side variables are automatically prefixed with `PUBLIC_`.

## Setup

```ts
// src/lib/env.ts
import { createSvelteKitEnv } from "@frauschert/env-guard";

export const env = createSvelteKitEnv({
  client: {
    APP_NAME: { type: "string", required: true },
    // reads process.env.PUBLIC_APP_NAME
  },
  server: {
    DATABASE_URL: { type: "string", required: true },
    // reads process.env.DATABASE_URL (no prefix)
    SECRET_KEY: { type: "string", required: true, sensitive: true },
  },
});
```

## Usage

```ts
import { env } from "$lib/env";

env.client.APP_NAME; // string — from PUBLIC_APP_NAME
env.server.DATABASE_URL; // string — from DATABASE_URL
```

::: tip
In SvelteKit, `$env/static/public` and `$env/static/private` provide built-in env access. Use env-guard for **runtime validation** in server hooks or API routes where you want fail-fast behaviour with typed output.
:::
