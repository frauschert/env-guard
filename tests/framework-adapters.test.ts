import { describe, it, expect, afterEach } from "vitest";
import {
  createNextEnv,
  createViteEnv,
  createAstroEnv,
  createSvelteKitEnv,
  createRemixEnv,
} from "../src";

const saved: Record<string, string | undefined> = {};

function setEnv(vars: Record<string, string>) {
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
}

function restoreEnv() {
  for (const k of Object.keys(saved)) {
    if (saved[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = saved[k];
    }
  }
}

afterEach(restoreEnv);

// ---------------------------------------------------------------------------
// createNextEnv
// ---------------------------------------------------------------------------
describe("createNextEnv", () => {
  it("reads client vars with NEXT_PUBLIC_ prefix", () => {
    setEnv({
      NEXT_PUBLIC_API_URL: "https://api.example.com",
      SECRET: "s3cr3t",
    });
    const { client, server } = createNextEnv({
      client: { API_URL: { type: "string", required: true } },
      server: { SECRET: { type: "string", required: true } },
    });
    expect(client.API_URL).toBe("https://api.example.com");
    expect(server.SECRET).toBe("s3cr3t");
  });

  it("reads server vars without prefix", () => {
    setEnv({ DATABASE_URL: "postgres://localhost/db" });
    const { server } = createNextEnv({
      client: {},
      server: { DATABASE_URL: { type: "string", required: true } },
    });
    expect(server.DATABASE_URL).toBe("postgres://localhost/db");
  });

  it("throws when client var is missing", () => {
    setEnv({ SECRET: "ok" });
    expect(() =>
      createNextEnv({
        client: { TITLE: { type: "string", required: true } },
        server: { SECRET: { type: "string", required: true } },
      }),
    ).toThrow("NEXT_PUBLIC_TITLE");
  });

  it("throws when server var is missing", () => {
    setEnv({ NEXT_PUBLIC_TITLE: "hi" });
    expect(() =>
      createNextEnv({
        client: { TITLE: { type: "string", required: true } },
        server: { DB: { type: "string", required: true } },
      }),
    ).toThrow("DB");
  });

  it("collects errors from both client and server", () => {
    expect(() =>
      createNextEnv({
        client: { X: { type: "string", required: true } },
        server: { Y: { type: "string", required: true } },
      }),
    ).toThrow("NEXT_PUBLIC_X");
  });

  it("forwards onError from options", () => {
    const errors: string[] = [];
    createNextEnv({
      client: { A: { type: "string", required: true } },
      server: { B: { type: "string", required: true } },
      options: {
        onError: (e) => errors.push(...e),
      },
    });
    expect(errors.length).toBe(2);
    expect(errors[0]).toContain("NEXT_PUBLIC_A");
    expect(errors[1]).toContain("B");
  });

  it("supports defaults for optional vars", () => {
    const { client, server } = createNextEnv({
      client: { THEME: { type: "string", default: "light" } },
      server: { PORT: { type: "number", default: 3000 } },
    });
    expect(client.THEME).toBe("light");
    expect(server.PORT).toBe(3000);
  });
});

// ---------------------------------------------------------------------------
// createViteEnv
// ---------------------------------------------------------------------------
describe("createViteEnv", () => {
  it("reads client vars with VITE_ prefix", () => {
    setEnv({ VITE_APP_TITLE: "My App", API_SECRET: "key" });
    const { client, server } = createViteEnv({
      client: { APP_TITLE: { type: "string", required: true } },
      server: { API_SECRET: { type: "string", required: true } },
    });
    expect(client.APP_TITLE).toBe("My App");
    expect(server.API_SECRET).toBe("key");
  });

  it("throws when client var is missing", () => {
    expect(() =>
      createViteEnv({
        client: { FOO: { type: "string", required: true } },
        server: {},
      }),
    ).toThrow("VITE_FOO");
  });

  it("supports number and boolean types", () => {
    setEnv({ VITE_PORT: "8080", DB_DEBUG: "true" });
    const { client, server } = createViteEnv({
      client: { PORT: { type: "number", required: true } },
      server: { DB_DEBUG: { type: "boolean", required: true } },
    });
    expect(client.PORT).toBe(8080);
    expect(server.DB_DEBUG).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createAstroEnv
// ---------------------------------------------------------------------------
describe("createAstroEnv", () => {
  it("reads client vars with PUBLIC_ prefix", () => {
    setEnv({ PUBLIC_SITE_NAME: "MySite", DB_CONN: "pg://host" });
    const { client, server } = createAstroEnv({
      client: { SITE_NAME: { type: "string", required: true } },
      server: { DB_CONN: { type: "string", required: true } },
    });
    expect(client.SITE_NAME).toBe("MySite");
    expect(server.DB_CONN).toBe("pg://host");
  });

  it("throws when client var is missing", () => {
    expect(() =>
      createAstroEnv({
        client: { NAME: { type: "string", required: true } },
        server: {},
      }),
    ).toThrow("PUBLIC_NAME");
  });
});

// ---------------------------------------------------------------------------
// createSvelteKitEnv
// ---------------------------------------------------------------------------
describe("createSvelteKitEnv", () => {
  it("reads client vars with PUBLIC_ prefix", () => {
    setEnv({ PUBLIC_APP_NAME: "SK App", PRIVATE_KEY: "abc" });
    const { client, server } = createSvelteKitEnv({
      client: { APP_NAME: { type: "string", required: true } },
      server: { PRIVATE_KEY: { type: "string", required: true } },
    });
    expect(client.APP_NAME).toBe("SK App");
    expect(server.PRIVATE_KEY).toBe("abc");
  });

  it("throws when client var is missing", () => {
    expect(() =>
      createSvelteKitEnv({
        client: { LABEL: { type: "string", required: true } },
        server: {},
      }),
    ).toThrow("PUBLIC_LABEL");
  });
});

// ---------------------------------------------------------------------------
// createRemixEnv
// ---------------------------------------------------------------------------
describe("createRemixEnv", () => {
  it("reads client vars without prefix (separation only)", () => {
    setEnv({ APP_NAME: "Remix App", DB_URL: "postgres://host" });
    const { client, server } = createRemixEnv({
      client: { APP_NAME: { type: "string", required: true } },
      server: { DB_URL: { type: "string", required: true } },
    });
    expect(client.APP_NAME).toBe("Remix App");
    expect(server.DB_URL).toBe("postgres://host");
  });

  it("throws on missing required client var", () => {
    expect(() =>
      createRemixEnv({
        client: { MISSING: { type: "string", required: true } },
        server: {},
      }),
    ).toThrow("MISSING");
  });

  it("throws on missing required server var", () => {
    expect(() =>
      createRemixEnv({
        client: {},
        server: { SECRET: { type: "string", required: true } },
      }),
    ).toThrow("SECRET");
  });
});

// ---------------------------------------------------------------------------
// Shared behaviour across all adapters
// ---------------------------------------------------------------------------
describe("framework adapter shared behaviour", () => {
  it("adapters merge client and server errors in one report", () => {
    const errors: string[] = [];
    createNextEnv({
      client: { C1: { type: "string", required: true } },
      server: { S1: { type: "number", required: true } },
      options: { onError: (e) => errors.push(...e) },
    });
    expect(errors.length).toBe(2);
  });

  it("adapters support choices on client vars", () => {
    setEnv({ VITE_MODE: "dark" });
    const { client } = createViteEnv({
      client: {
        MODE: {
          type: "string",
          required: true,
          choices: ["light", "dark"] as const,
        },
      },
      server: {},
    });
    expect(client.MODE).toBe("dark");
  });

  it("adapters reject invalid choices on client vars", () => {
    setEnv({ VITE_MODE: "invalid" });
    expect(() =>
      createViteEnv({
        client: {
          MODE: {
            type: "string",
            required: true,
            choices: ["light", "dark"] as const,
          },
        },
        server: {},
      }),
    ).toThrow("not in allowed choices");
  });

  it("adapters support validate on server vars", () => {
    setEnv({ PORT: "99999" });
    expect(() =>
      createRemixEnv({
        client: {},
        server: {
          PORT: {
            type: "number",
            required: true,
            validate: (v) => (v as number) >= 1 && (v as number) <= 65535,
          },
        },
      }),
    ).toThrow("Custom validation failed");
  });

  it("adapters support format on client vars", () => {
    setEnv({ NEXT_PUBLIC_URL: "not-a-url" });
    expect(() =>
      createNextEnv({
        client: {
          URL: { type: "string", format: "url", required: true },
        },
        server: {},
      }),
    ).toThrow("does not match format");
  });

  it("adapters support array type", () => {
    setEnv({ VITE_TAGS: "a,b,c" });
    const { client } = createViteEnv({
      client: {
        TAGS: { type: "array", itemType: "string", required: true },
      },
      server: {},
    });
    expect(client.TAGS).toEqual(["a", "b", "c"]);
  });
});
