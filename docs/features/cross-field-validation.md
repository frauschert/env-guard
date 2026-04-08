# Cross-Field Validation

Sometimes individual variable checks aren't enough — the relationship between variables matters too. The top-level `validate` option lets you assert constraints across the whole parsed environment after all per-field checks have passed.

## Basic Usage

```ts
const env = createEnv(
  {
    HTTP_PORT: { type: "number", required: true },
    HTTPS_PORT: { type: "number", required: true },
  },
  {
    validate: (env) => env.HTTP_PORT !== env.HTTPS_PORT,
  },
);
```

If the function returns `false`, env-guard throws a generic cross-field validation error:

```
❌ Cross-field validation failed.
```

## Custom Error Message

Return a string from `validate` to provide a human-readable message:

```ts
const env = createEnv(
  {
    HTTP_PORT: { type: "number", required: true },
    HTTPS_PORT: { type: "number", required: true },
  },
  {
    validate: (env) =>
      env.HTTP_PORT !== env.HTTPS_PORT ||
      "HTTP_PORT and HTTPS_PORT must be different",
  },
);
```

Error output:

```
❌ HTTP_PORT and HTTPS_PORT must be different
```

## Typed Environment

The `validate` callback receives the fully-typed, parsed environment — the same type that `createEnv` returns. TypeScript guarantees that every property is the correct type (e.g. `number`, not `string`):

```ts
const env = createEnv(
  {
    MIN_POOL_SIZE: { type: "number", required: true },
    MAX_POOL_SIZE: { type: "number", required: true },
  },
  {
    // env.MIN_POOL_SIZE and env.MAX_POOL_SIZE are inferred as `number`
    validate: (env) =>
      env.MIN_POOL_SIZE <= env.MAX_POOL_SIZE ||
      `MIN_POOL_SIZE (${env.MIN_POOL_SIZE}) must be ≤ MAX_POOL_SIZE (${env.MAX_POOL_SIZE})`,
  },
);
```

## With Custom Error Handler

When `onError` is supplied, the cross-field error is passed to it the same way as per-field errors:

```ts
const env = createEnv(
  {
    DB_HOST: { type: "string", required: true },
    DB_PORT: { type: "number", required: true },
  },
  {
    validate: (env) => env.DB_PORT > 1024 || "DB_PORT must be above 1024",
    onError: (errors) => {
      console.error("Environment configuration errors:", errors);
      process.exit(1);
    },
  },
);
```

## Behaviour Summary

| Scenario                     | Outcome                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| Returns `true`               | Passes — no error                                                  |
| Returns `false`              | Generic error: `"Cross-field validation failed."`                  |
| Returns a non-empty string   | That string is used as the error message                           |
| Per-field errors are present | `validate` is **not called** — per-field errors are reported first |
| Used with `watch: true`      | Re-evaluated on every `refresh()` call                             |
