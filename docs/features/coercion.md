# Type Coercion Hooks

Supply a `coerce` function to transform the raw string from `process.env` before type parsing and validation.

## Usage

```ts
import { createEnv } from "@frauschert/env-guard";

const env = createEnv({
  // Parse a JSON string
  CONFIG: {
    type: "string",
    required: true,
    coerce: (raw) => JSON.parse(raw),
  },
  // Decode base64
  SECRET: {
    type: "string",
    required: true,
    coerce: (raw) => Buffer.from(raw, "base64").toString("utf-8"),
  },
  // Strip currency symbol before number parsing
  PRICE: {
    type: "number",
    required: true,
    coerce: (raw) => parseFloat(raw.replace("$", "")),
  },
  // Parse a JSON array instead of comma-separated
  TAGS: {
    type: "array",
    itemType: "string",
    required: true,
    coerce: (raw) => JSON.parse(raw),
  },
});
```

## How It Works

1. `coerce` receives the **raw env string** and returns the transformed value.
2. It runs **before** type parsing — the returned value replaces the normal parse result.
3. Validation (`choices`, `validate`, `format`) still applies to the coerced value.
4. For `type: "array"`, `coerce` bypasses the default split-by-separator logic — you control the full parsing.
5. When the variable is **missing**, `coerce` is not called and `default` is used as normal.

## Common Recipes

### JSON Config

```ts
CONFIG: {
  type: "string",
  required: true,
  coerce: (raw) => JSON.parse(raw),
}
// CONFIG='{"port":3000}' → { port: 3000 }
```

### Base64 Decoding

```ts
CERT: {
  type: "string",
  required: true,
  coerce: (raw) => Buffer.from(raw, "base64").toString("utf-8"),
}
```

### Trimming Whitespace

```ts
TOKEN: {
  type: "string",
  required: true,
  coerce: (raw) => raw.trim(),
}
```

### Custom Number Parsing

```ts
PRICE: {
  type: "number",
  required: true,
  coerce: (raw) => parseFloat(raw.replace(/[^0-9.]/g, "")),
}
// PRICE="$42.50" → 42.5
```
