# Enum / Choices

Restrict a variable to a fixed set of values with `choices`. Use `as const` for full literal type inference:

```ts
const env = createEnv({
  NODE_ENV: {
    type: "string",
    required: true,
    choices: ["development", "staging", "production"] as const,
  },
});

// env.NODE_ENV is typed as "development" | "staging" | "production"
```

If the value is not in the set:

```
❌ 'NODE_ENV': Value 'invalid' is not in allowed choices ['development', 'staging', 'production'].
```

## Works With All Types

```ts
const env = createEnv({
  LOG_LEVEL: {
    type: "number",
    required: true,
    choices: [0, 1, 2, 3] as const,
  },
  STRICT: {
    type: "boolean",
    required: true,
    choices: [true] as const,
  },
});
```

## Default Values

Choices are validated on default values too:

```ts
// ❌ throws — "debug" is not in the choices list
const env = createEnv({
  MODE: {
    type: "string",
    default: "debug",
    choices: ["development", "production"] as const,
  },
});
```

## Optional Variables

Choices validation is skipped for missing optional variables (no value to check):

```ts
const env = createEnv({
  MODE: {
    type: "string",
    choices: ["a", "b"] as const,
  },
});
// env.MODE is undefined — no error
```

::: info
`choices`, `validate`, and `format` are mutually exclusive. TypeScript prevents combining them, and a runtime check catches it for JavaScript consumers.
:::
