# Remix

Use `createRemixEnv` for Remix projects. Remix does not use a public prefix convention, so **no prefix** is applied to client-side variables.

## Setup

```ts
// app/env.server.ts
import { createRemixEnv } from "@frauschert/env-guard";

export const env = createRemixEnv({
  client: {
    PUBLIC_URL: { type: "string", format: "url", required: true },
    // reads process.env.PUBLIC_URL (no auto prefix)
  },
  server: {
    DATABASE_URL: { type: "string", required: true },
    SESSION_SECRET: { type: "string", required: true, sensitive: true },
  },
});
```

## Usage

In a loader:

```ts
import { env } from "~/env.server";

export async function loader() {
  const dbUrl = env.server.DATABASE_URL;
  // ...
}
```

To expose client env to the browser, pass it through a loader:

```ts
export async function loader() {
  return json({
    ENV: {
      PUBLIC_URL: env.client.PUBLIC_URL,
    },
  });
}
```

::: info
Since Remix doesn't have a built-in public prefix convention, you're free to name your client-side variables however you like. The adapter simply validates both schemas without adding any prefix.
:::
