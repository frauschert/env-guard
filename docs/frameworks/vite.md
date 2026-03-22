# Vite

Use `createViteEnv` for Vite projects. Client-side variables are automatically prefixed with `VITE_`.

## Setup

```ts
// src/env.ts
import { createViteEnv } from "@frauschert/env-guard";

export const env = createViteEnv({
  client: {
    APP_TITLE: { type: "string", required: true },
    // reads process.env.VITE_APP_TITLE
    API_URL: { type: "string", format: "url", required: true },
    // reads process.env.VITE_API_URL
  },
  server: {
    API_SECRET: { type: "string", required: true, sensitive: true },
    // reads process.env.API_SECRET (no prefix)
    DB_HOST: { type: "string", default: "localhost" },
  },
});
```

## Usage

```ts
import { env } from "./env";

env.client.APP_TITLE; // string — from VITE_APP_TITLE
env.client.API_URL; // string — from VITE_API_URL
env.server.API_SECRET; // string — from API_SECRET
```

::: tip
In Vite, `import.meta.env` is usually the way to access env vars at runtime in the browser. Use env-guard for **build-time validation** in your config and server code to ensure all required variables are present before the app starts.
:::
