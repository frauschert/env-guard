# Next.js

Use `createNextEnv` for Next.js projects. Client-side variables are automatically prefixed with `NEXT_PUBLIC_`.

## Setup

```ts
// lib/env.ts
import { createNextEnv } from "@frauschert/env-guard";

export const env = createNextEnv({
  client: {
    API_URL: { type: "string", format: "url", required: true },
    // reads process.env.NEXT_PUBLIC_API_URL
    APP_NAME: { type: "string", default: "My App" },
    // reads process.env.NEXT_PUBLIC_APP_NAME
  },
  server: {
    DATABASE_URL: { type: "string", required: true },
    // reads process.env.DATABASE_URL (no prefix)
    SESSION_SECRET: { type: "string", required: true, sensitive: true },
  },
});
```

## Usage

```ts
// In a Server Component or API route
import { env } from "@/lib/env";

env.client.API_URL; // string — from NEXT_PUBLIC_API_URL
env.server.DATABASE_URL; // string — from DATABASE_URL
```

```tsx
// In a Client Component
import { env } from "@/lib/env";

// Only use env.client.* on the client side
fetch(env.client.API_URL + "/data");
```

## With .env Files

```ts
export const env = createNextEnv({
  client: {
    /* ... */
  },
  server: {
    /* ... */
  },
  options: {
    envFiles: true, // loads .env, .env.{NODE_ENV}, .env.local
  },
});
```

## Error Handling

```ts
export const env = createNextEnv({
  client: {
    /* ... */
  },
  server: {
    /* ... */
  },
  options: {
    onError: (errors) => {
      console.error("Environment validation failed:");
      errors.forEach((e) => console.error(e));
      process.exit(1);
    },
  },
});
```
