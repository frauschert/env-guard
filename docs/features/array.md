# Array Type

Parse comma-separated (or custom-delimited) environment variables into typed arrays.

## Usage

```ts
const env = createEnv({
  ALLOWED_ORIGINS: { type: "array", itemType: "string", separator: "," },
  PORTS: { type: "array", itemType: "number", required: true },
  FLAGS: { type: "array", itemType: "boolean" },
});

// ALLOWED_ORIGINS="a.com,b.com" → ["a.com", "b.com"]
// PORTS="3000,8080"             → [3000, 8080]
// FLAGS="true,false,1"          → [true, false, true]
```

## Details

- `separator` defaults to `","` if omitted.
- Whitespace around items is trimmed automatically.
- Each item is validated against `itemType` — invalid items produce an error:

```
❌ 'PORTS': Array item 'abc' is not a valid number.
```

## Custom Separator

```ts
const env = createEnv({
  ITEMS: {
    type: "array",
    itemType: "string",
    separator: "|",
    required: true,
  },
});
// ITEMS="one|two|three" → ["one", "two", "three"]
```

## Defaults

```ts
const env = createEnv({
  TAGS: {
    type: "array",
    itemType: "string",
    default: ["general"],
  },
});
// If TAGS is not set → ["general"]
```

## With Coercion

You can use `coerce` to bypass the default split logic entirely — for example, to parse a JSON array:

```ts
const env = createEnv({
  JSON_TAGS: {
    type: "array",
    itemType: "string",
    required: true,
    coerce: (raw) => JSON.parse(raw),
  },
});
// JSON_TAGS='["alpha","beta"]' → ["alpha", "beta"]
```
