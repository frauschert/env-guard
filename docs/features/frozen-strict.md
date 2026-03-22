# Frozen & Strict Output

Prevent accidental mutations and catch typos at runtime.

## Usage

```ts
import { createEnv } from "@frauschert/env-guard";

const env = createEnv(
  {
    PORT: { type: "number", required: true },
    HOST: { type: "string", default: "localhost" },
  },
  { freeze: true, strict: true },
);

// freeze: property assignments throw in strict mode
env.PORT = 9999; // ❌ TypeError: Cannot assign to read only property

// strict: accessing keys not in the schema throws
env.PROT; // ❌ Error: Attempted to access unknown env variable 'PROT'
```

## Options

| Option   | Effect                                                          |
| -------- | --------------------------------------------------------------- |
| `freeze` | Calls `Object.freeze` on the result — mutations throw           |
| `strict` | Wraps in a `Proxy` — accessing any key not in the schema throws |

## Combining Options

- `freeze` and `strict` can be used **independently** or **together**.
- `strict` works with `watch` — `refresh()`, `on()`, and `off()` remain accessible.
- `freeze` deep-freezes [nested group](/features/nested-groups) sub-objects.

::: warning
`freeze` cannot be combined with `watch` (refresh needs to mutate the object). Attempting both throws at creation time. This is enforced at the type level and at runtime.
:::
