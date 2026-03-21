# env-guard Roadmap

Feature ideas and improvements, roughly ordered by priority within each phase.

---

## Phase 1 — Core Validation Enhancements

### Custom validators

Allow users to supply a `validate` function per variable for domain-specific checks (e.g. URL format, port range, email pattern).

```ts
PORT: {
  type: "number",
  required: true,
  validate: (v) => v >= 1 && v <= 65535,
}
```

### Enum / union types

Support a fixed set of allowed values via a `choices` option.

```ts
NODE_ENV: {
  type: "string",
  required: true,
  choices: ["development", "staging", "production"] as const,
}
```

### String format presets

Built-in validators for common formats: `"url"`, `"email"`, `"ip"`, `"port"`, `"uuid"`.

```ts
API_URL: { type: "string", format: "url", required: true }
```

### Array / list type

Parse comma-separated values into typed arrays.

```ts
ALLOWED_ORIGINS: { type: "array", itemType: "string", separator: "," }
// "a.com,b.com" → ["a.com", "b.com"]
```

---

## Phase 2 — Developer Experience

### `.env` file loading

Built-in support for reading `.env`, `.env.local`, `.env.{NODE_ENV}` files without requiring `dotenv` as an external dependency.

### Prefix scoping

Allow scoping variables by prefix, useful for libraries or microservices that share an environment.

```ts
const env = createEnv({
  prefix: "MYAPP_",
  schema: {
    PORT: { type: "number", required: true }, // reads MYAPP_PORT
  },
});
```

### Custom error formatter

Let users provide their own error formatting/reporting callback instead of the built-in emoji format.

```ts
createEnv(schema, {
  onError: (errors) => {
    /* custom logging / formatting */
  },
});
```

### `describe` field

Optional human-readable description per variable. Useful for generated docs and error messages.

```ts
DATABASE_URL: {
  type: "string",
  required: true,
  describe: "PostgreSQL connection string for the primary database",
}
```

---

## Phase 3 — Tooling & Integration

### CLI: env check / init

Provide a CLI command (`npx env-guard check`) that validates the current environment against a schema file and reports issues — useful in CI pipelines.

A companion `npx env-guard init` command could scaffold a schema from an existing `.env` file.

### `.env.example` generator

Auto-generate a `.env.example` file from the schema, including types, defaults, and descriptions as comments.

```env
# PORT (number, required) — The port the server listens on
PORT=3000
# DEBUG (boolean, default: false)
DEBUG=false
```

### Framework adapters

First-class integrations for popular frameworks:

- **Next.js** — separate `client` / `server` schemas with `NEXT_PUBLIC_` prefix handling
- **Vite** — `VITE_` prefix handling
- **Remix / Astro / SvelteKit** — similar prefix-aware adapters

### IDE extension / LSP

Provide autocomplete and inline validation for `.env` files based on the schema definition.

---

## Phase 4 — Advanced Features

### Runtime refresh

Support re-reading environment variables at runtime (e.g. after a secrets rotation) with optional change callbacks.

```ts
const env = createEnv(schema, { watch: true });
env.on("change", (key, oldVal, newVal) => { ... });
```

### Secret masking

Mark variables as sensitive so they are redacted in logs and error messages.

```ts
DB_PASSWORD: { type: "string", required: true, sensitive: true }
// Error: ❌ 'DB_PASSWORD': Is marked as required but was not found.
// Logs:  DB_PASSWORD=****
```

### Readonly / frozen output

Freeze the returned env object (`Object.freeze`) so mutations are caught early. Optionally expose a `Proxy` that throws on access to undefined keys instead of returning `undefined`.

### Type coercion hooks

Allow custom coercion per type (e.g. parse a JSON string, decode base64).

```ts
CONFIG: {
  type: "string",
  coerce: (raw) => JSON.parse(raw),
}
```

### Nested / grouped schemas

Support grouping related variables under a namespace for cleaner access.

```ts
const env = createEnv({
  db: {
    HOST: { type: "string", required: true },
    PORT: { type: "number", default: 5432 },
  },
});
// env.db.HOST, env.db.PORT
```

---

## Phase 5 — Ecosystem & Quality

### 100% branch coverage

Expand the test suite to cover all edge cases (empty strings, whitespace-only values, special characters).

### Benchmarks

Add a benchmark suite to track parsing speed for large schemas.

### Documentation site

Publish a docs site (e.g. VitePress) with guides, API reference, and framework-specific recipes.

### Peer package: `env-guard/zod`

Optional adapter that lets users define schemas with Zod and pass them to env-guard, combining Zod's ecosystem with env-guard's fail-fast DX.

---

> Contributions and feature requests are welcome — open an issue to discuss!
