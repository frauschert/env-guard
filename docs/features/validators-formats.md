# Validators & Format Presets

## Custom Validators

Supply a `validate` function for domain-specific checks like port ranges, URL formats, or email patterns:

```ts
const env = createEnv({
  PORT: {
    type: "number",
    required: true,
    validate: (v) => v >= 1 && v <= 65535,
  },
  API_URL: {
    type: "string",
    required: true,
    validate: (v) => v.startsWith("https://"),
  },
});
```

If validation fails:

```
❌ 'PORT': Custom validation failed for value '99999'.
```

- `validate` receives the **parsed** value (not the raw string).
- It runs **after** type parsing and coercion.
- Returning `false` triggers a validation error; returning `true` passes.
- Skipped for missing optional variables (no value to validate).
- Runs on default values too — a bad default is caught at startup.

## String Format Presets

Use `format` for built-in validation of common string formats:

```ts
const env = createEnv({
  API_URL: { type: "string", format: "url", required: true },
  CONTACT: { type: "string", format: "email", required: true },
  SERVER_IP: { type: "string", format: "ip", required: true },
  APP_PORT: { type: "string", format: "port", required: true },
  REQUEST_ID: { type: "string", format: "uuid", required: true },
});
```

| Format  | Validates                     |
| ------- | ----------------------------- |
| `url`   | Parseable URL (`new URL()`)   |
| `email` | Basic `user@host.tld` pattern |
| `ip`    | IPv4 or IPv6 address          |
| `port`  | Integer between 1 and 65 535  |
| `uuid`  | RFC 4122 hex-and-dash format  |

If the value doesn't match:

```
❌ 'API_URL': Value 'not-a-url' does not match format 'url'.
```

::: tip
`format` is only available for `type: "string"` variables. For number or boolean validation, use `validate` or `choices`.
:::
