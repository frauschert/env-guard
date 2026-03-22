# Custom Error Formatter

Provide your own error handling callback instead of the built-in emoji format.

## Usage

When `onError` is set, env-guard calls it with the array of error strings instead of throwing — **you** decide how to report or throw:

```ts
import { createEnv } from "@frauschert/env-guard";

const env = createEnv(schema, {
  onError: (errors) => {
    console.error("Config errors:");
    errors.forEach((e) => console.error(` - ${e}`));
    process.exit(1);
  },
});
```

## Default Behaviour

If `onError` is not provided, `createEnv` throws an `Error` with the default formatted message:

```
🚨 Env-Guard validation errors on app start:
❌ 'PORT': Expected 'number', but got 'abc'.
❌ 'DATABASE_URL': Is marked as required but was not found.
```

## Re-throwing

You can use `onError` to transform the errors and re-throw:

```ts
const env = createEnv(schema, {
  onError: (errors) => {
    throw new Error(`Config failed:\n${errors.join("\n")}`);
  },
});
```

## With Framework Adapters

When using [framework adapters](/frameworks/overview), errors from both `client` and `server` schemas are collected and reported together in a single batch through `onError`, so you see all problems at once.
