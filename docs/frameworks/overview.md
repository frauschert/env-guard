# Framework Adapters

env-guard provides first-class integrations for popular frameworks. Each adapter provides separate `client` / `server` schemas and automatically applies the framework's public-variable prefix to client-side keys.

## Available Adapters

| Adapter              | Client prefix  | Import                                                       |
| -------------------- | -------------- | ------------------------------------------------------------ |
| `createNextEnv`      | `NEXT_PUBLIC_` | `import { createNextEnv } from "@frauschert/env-guard"`      |
| `createViteEnv`      | `VITE_`        | `import { createViteEnv } from "@frauschert/env-guard"`      |
| `createAstroEnv`     | `PUBLIC_`      | `import { createAstroEnv } from "@frauschert/env-guard"`     |
| `createSvelteKitEnv` | `PUBLIC_`      | `import { createSvelteKitEnv } from "@frauschert/env-guard"` |
| `createRemixEnv`     | _(none)_       | `import { createRemixEnv } from "@frauschert/env-guard"`     |

## How They Work

1. You define a `client` schema (public variables) and a `server` schema (private variables).
2. The adapter automatically prefixes client-side keys with the framework's convention.
3. Server-side keys are read without any prefix.
4. Errors from both schemas are **collected and reported together** in a single batch.

## Shared Options

All adapters accept an optional `options` object (same as `createEnv`, except `prefix` — which is set by the adapter):

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

## Return Shape

Each adapter returns an object with `client` and `server` properties:

```ts
const env = createNextEnv({ client: { ... }, server: { ... } });

env.client.API_URL;      // from NEXT_PUBLIC_API_URL
env.server.DATABASE_URL; // from DATABASE_URL
```

See the individual framework pages for complete examples:

- [Next.js](/frameworks/nextjs)
- [Vite](/frameworks/vite)
- [Astro](/frameworks/astro)
- [SvelteKit](/frameworks/sveltekit)
- [Remix](/frameworks/remix)
