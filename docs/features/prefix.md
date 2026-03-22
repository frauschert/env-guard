# Prefix Scoping

Scope environment variables by prefix, useful for libraries or microservices that share an environment.

## Usage

```ts
import { createEnv } from "@frauschert/env-guard";

const env = createEnv(
  {
    PORT: { type: "number", required: true }, // reads MYAPP_PORT
    DB_HOST: { type: "string", required: true }, // reads MYAPP_DB_HOST
  },
  { prefix: "MYAPP_" },
);

// env.PORT    → value of process.env.MYAPP_PORT
// env.DB_HOST → value of process.env.MYAPP_DB_HOST
```

The schema keys stay short and clean — the prefix is only used when looking up `process.env`. Error messages include the full prefixed name for easy debugging:

```
❌ 'MYAPP_PORT': Expected 'number', but got 'abc'.
```

## With Nested Groups

The prefix composes with [nested groups](/features/nested-groups):

```ts
const env = createEnv(
  {
    db: {
      HOST: { type: "string", required: true },
      // reads MYAPP_DB_HOST
    },
  },
  { prefix: "MYAPP_" },
);
```
