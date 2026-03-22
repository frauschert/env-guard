# Nested / Grouped Schemas

Group related variables under a namespace for cleaner access. The group name is upper-cased and used as an env-var prefix.

## Usage

```ts
import { createEnv } from "@frauschert/env-guard";

// Reads DB_HOST, DB_PORT, CACHE_HOST, CACHE_TTL
const env = createEnv({
  db: {
    HOST: { type: "string", required: true },
    PORT: { type: "number", default: 5432 },
  },
  cache: {
    HOST: { type: "string", required: true },
    TTL: { type: "number", default: 300 },
  },
});

env.db.HOST; // string
env.db.PORT; // number
env.cache.HOST; // string
env.cache.TTL; // number
```

## Mixing Flat and Grouped

Flat variables and groups can be mixed freely:

```ts
const env = createEnv({
  API_KEY: { type: "string", required: true }, // reads API_KEY
  db: {
    HOST: { type: "string", required: true }, // reads DB_HOST
  },
});
```

## How the Prefix Works

The group name is converted to `UPPER_CASE_` and prepended to each key inside the group:

| Group key | Schema key | Env variable read |
| --------- | ---------- | ----------------- |
| `db`      | `HOST`     | `DB_HOST`         |
| `db`      | `PORT`     | `DB_PORT`         |
| `cache`   | `TTL`      | `CACHE_TTL`       |

## With Global Prefix

The group prefix composes with the global `prefix` option:

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

## Feature Compatibility

All per-variable features work inside groups:

- `choices`, `validate`, `format`, `coerce`
- `sensitive`, `describe`, `default`
- `freeze` deep-freezes group sub-objects
- `watch` + `refresh()` detects changes within groups and fires the change listener with the group name as the key
- `strict` allows group keys but rejects unknown top-level keys
