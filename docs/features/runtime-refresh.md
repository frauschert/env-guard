# Runtime Refresh

Re-read environment variables at runtime with optional change callbacks — ideal after a secrets rotation or config reload.

## Usage

Pass `watch: true` to get an env object that supports `refresh()`:

```ts
import { createEnv } from "@frauschert/env-guard";

const env = createEnv(
  {
    DB_PASSWORD: { type: "string", required: true },
    PORT: { type: "number", default: 3000 },
  },
  { watch: true },
);

// Register a change listener
env.on("change", (key, oldVal, newVal) => {
  console.log(`${key} changed from ${oldVal} to ${newVal}`);
});

// Later, after secrets have rotated:
env.refresh();
// Properties are updated in-place and change listeners are fired
```

## API

The returned object has three extra (non-enumerable) methods:

| Method                    | Description                                                                       |
| ------------------------- | --------------------------------------------------------------------------------- |
| `refresh()`               | Re-reads `process.env`, re-validates, updates properties, and fires change events |
| `on("change", listener)`  | Register a `(key, oldValue, newValue) => void` callback                           |
| `off("change", listener)` | Remove a previously registered listener                                           |

## Behaviour Notes

- When `watch` is not set (the default), `createEnv` returns a plain object — no extra methods, no overhead.
- `refresh()` re-validates against the full schema. If validation fails, it uses `onError` (if provided) or throws the default error.
- Change listeners fire once per changed key, after the property has been updated.

::: warning
`freeze` and `watch` are mutually exclusive — `refresh()` needs to mutate the object. Attempting both throws at creation time. This is enforced at both the type level and runtime.
:::

## Sensitive Variables

When a variable is marked `sensitive`, change listeners receive `"****"` instead of the real values:

```ts
env.on("change", (key, oldVal, newVal) => {
  console.log(key, oldVal, newVal);
  // DB_PASSWORD **** ****
  // PORT 3000 8080
});
```
