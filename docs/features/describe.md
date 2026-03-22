# Describe Field

Add a human-readable description to any variable. The description is included in error messages, making them easier to understand — especially in large schemas.

## Usage

```ts
import { createEnv } from "@frauschert/env-guard";

const env = createEnv({
  DATABASE_URL: {
    type: "string",
    required: true,
    describe: "PostgreSQL connection string for the primary database",
  },
  PORT: {
    type: "number",
    required: true,
    describe: "The port the server listens on",
  },
});
```

## Error Output

When validation fails, the description appears in parentheses after the variable name:

```
❌ 'DATABASE_URL' (PostgreSQL connection string for the primary database): Is marked as required but was not found.
❌ 'PORT' (The port the server listens on): Expected 'number', but got 'abc'.
```

## Notes

- Works on all variable types: `string`, `number`, `boolean`, and `array`.
- Works alongside `prefix` — the error shows the full prefixed key name plus the description.
- When `describe` is omitted, error messages use the key name only (no extra text).
