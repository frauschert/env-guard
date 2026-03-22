# Secret Masking

Mark a variable as `sensitive` to redact its value in error messages and change-listener arguments. The actual property on the env object still holds the real value — only diagnostics are masked.

## Usage

```ts
import { createEnv } from "@frauschert/env-guard";

const env = createEnv({
  DB_PASSWORD: { type: "string", required: true, sensitive: true },
  API_KEY: { type: "string", required: true, sensitive: true },
  PORT: { type: "number", default: 3000 },
});
```

## Error Output

If a sensitive variable fails validation, the error hides the value:

```
❌ 'DB_PASSWORD': Expected 'number', but got '****'.
❌ 'API_KEY': Custom validation failed for value '****'.
```

The key name is still shown — only the **value** is masked.

## Change Listeners

With `watch: true`, change listeners receive `"****"` instead of the real old/new values for sensitive keys:

```ts
env.on("change", (key, oldVal, newVal) => {
  console.log(key, oldVal, newVal);
  // DB_PASSWORD **** ****
  // PORT 3000 8080
});
```

## Notes

- The real value is always available on the returned `env` object — masking only affects error messages and change callbacks.
- Works with all validation modes: `choices`, `validate`, `format`, and `coerce`.
- Works with array types — individual array item values are masked in error messages too.
