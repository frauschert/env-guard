# Astro

Use `createAstroEnv` for Astro projects. Client-side variables are automatically prefixed with `PUBLIC_`.

## Setup

```ts
// src/env.ts
import { createAstroEnv } from "@frauschert/env-guard";

export const env = createAstroEnv({
  client: {
    SITE_URL: { type: "string", format: "url", required: true },
    // reads process.env.PUBLIC_SITE_URL
  },
  server: {
    CMS_API_KEY: { type: "string", required: true, sensitive: true },
    // reads process.env.CMS_API_KEY (no prefix)
    DB_URL: { type: "string", required: true },
  },
});
```

## Usage

```ts
import { env } from "../env";

env.client.SITE_URL; // string — from PUBLIC_SITE_URL
env.server.CMS_API_KEY; // string — from CMS_API_KEY
```
