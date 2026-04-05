import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { createZodEnv } from "../src/index";

describe("createZodEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------------
  // Basic parsing
  // -------------------------------------------------------------------

  it("parses a required string", () => {
    process.env.HOST = "localhost";
    const env = createZodEnv({ HOST: z.string().min(1) });
    expect(env.HOST).toBe("localhost");
  });

  it("parses a number via z.coerce.number()", () => {
    process.env.PORT = "3000";
    const env = createZodEnv({ PORT: z.coerce.number() });
    expect(env.PORT).toBe(3000);
  });

  it("parses a boolean via z.coerce.boolean()", () => {
    process.env.DEBUG = "true";
    const env = createZodEnv({
      DEBUG: z.preprocess((v) => v === "true" || v === "1", z.boolean()),
    });
    expect(env.DEBUG).toBe(true);
  });

  it("uses Zod default when variable is missing", () => {
    const env = createZodEnv({
      PORT: z.coerce.number().default(8080),
    });
    expect(env.PORT).toBe(8080);
  });

  it("returns undefined for optional missing variable", () => {
    const env = createZodEnv({
      HOST: z.string().optional(),
    });
    expect(env.HOST).toBeUndefined();
  });

  it("throws on missing required variable", () => {
    expect(() => createZodEnv({ SECRET: z.string().min(1) })).toThrow("SECRET");
  });

  it("throws on invalid number", () => {
    process.env.PORT = "not-a-number";
    expect(() => createZodEnv({ PORT: z.coerce.number().int() })).toThrow(
      "PORT",
    );
  });

  it("collects multiple validation errors", () => {
    expect(() =>
      createZodEnv({
        A: z.string().min(1),
        B: z.coerce.number(),
      }),
    ).toThrow(/A[\s\S]*B/);
  });

  // -------------------------------------------------------------------
  // Zod-native features
  // -------------------------------------------------------------------

  it("validates url format via z.string().url()", () => {
    process.env.API_URL = "https://example.com";
    const env = createZodEnv({ API_URL: z.string().url() });
    expect(env.API_URL).toBe("https://example.com");
  });

  it("rejects invalid url", () => {
    process.env.API_URL = "not-a-url";
    expect(() => createZodEnv({ API_URL: z.string().url() })).toThrow(
      "API_URL",
    );
  });

  it("validates email format via z.string().email()", () => {
    process.env.CONTACT = "user@example.com";
    const env = createZodEnv({ CONTACT: z.string().email() });
    expect(env.CONTACT).toBe("user@example.com");
  });

  it("supports enums via z.enum()", () => {
    process.env.LOG_LEVEL = "debug";
    const env = createZodEnv({
      LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
    });
    expect(env.LOG_LEVEL).toBe("debug");
  });

  it("rejects invalid enum value", () => {
    process.env.LOG_LEVEL = "verbose";
    expect(() =>
      createZodEnv({
        LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
      }),
    ).toThrow("LOG_LEVEL");
  });

  it("supports transform pipelines", () => {
    process.env.TAGS = "a,b,c";
    const env = createZodEnv({
      TAGS: z.string().transform((v) => v.split(",")),
    });
    expect(env.TAGS).toEqual(["a", "b", "c"]);
  });

  it("supports refine()", () => {
    process.env.PORT = "99999";
    expect(() =>
      createZodEnv({
        PORT: z.coerce
          .number()
          .refine((n) => n >= 1 && n <= 65535, "Port out of range"),
      }),
    ).toThrow("PORT");
  });

  // -------------------------------------------------------------------
  // Prefix
  // -------------------------------------------------------------------

  it("reads env vars with a prefix", () => {
    process.env.MYAPP_HOST = "example.com";
    const env = createZodEnv({ HOST: z.string().min(1) }, { prefix: "MYAPP_" });
    expect(env.HOST).toBe("example.com");
  });

  // -------------------------------------------------------------------
  // onError
  // -------------------------------------------------------------------

  it("calls onError instead of throwing", () => {
    const onError = vi.fn();
    createZodEnv({ MISSING: z.string().min(1) }, { onError });
    expect(onError).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining("MISSING")]),
    );
  });

  // -------------------------------------------------------------------
  // Strict
  // -------------------------------------------------------------------

  it("throws on unknown key access in strict mode", () => {
    process.env.HOST = "localhost";
    const env = createZodEnv({ HOST: z.string() }, { strict: true });
    expect(env.HOST).toBe("localhost");
    expect(() => (env as Record<string, unknown>)["UNKNOWN"]).toThrow(
      "UNKNOWN",
    );
  });

  // -------------------------------------------------------------------
  // Freeze
  // -------------------------------------------------------------------

  it("freezes the returned object", () => {
    process.env.HOST = "localhost";
    const env = createZodEnv({ HOST: z.string() }, { freeze: true });
    expect(Object.isFrozen(env)).toBe(true);
  });

  // -------------------------------------------------------------------
  // Watch / refresh
  // -------------------------------------------------------------------

  it("supports refresh() and change listeners", () => {
    process.env.HOST = "old";
    const env = createZodEnv({ HOST: z.string() }, { watch: true });
    expect(env.HOST).toBe("old");

    const listener = vi.fn();
    env.on("change", listener);

    process.env.HOST = "new";
    env.refresh();

    expect(env.HOST).toBe("new");
    expect(listener).toHaveBeenCalledWith("HOST", "old", "new");
  });

  it("removes listener via off()", () => {
    process.env.HOST = "a";
    const env = createZodEnv({ HOST: z.string() }, { watch: true });

    const listener = vi.fn();
    env.on("change", listener);
    env.off("change", listener);

    process.env.HOST = "b";
    env.refresh();

    expect(env.HOST).toBe("b");
    expect(listener).not.toHaveBeenCalled();
  });

  it("throws when combining freeze and watch", () => {
    process.env.HOST = "localhost";
    expect(() =>
      createZodEnv({ HOST: z.string() }, {
        freeze: true,
        watch: true,
      } as never),
    ).toThrow("freeze");
  });

  it("strict mode works with watch", () => {
    process.env.HOST = "localhost";
    const env = createZodEnv(
      { HOST: z.string() },
      { watch: true, strict: true },
    );
    expect(env.HOST).toBe("localhost");
    env.refresh(); // should not throw
    expect(() => (env as Record<string, unknown>)["NOPE"]).toThrow("NOPE");
  });

  // -------------------------------------------------------------------
  // Nested groups
  // -------------------------------------------------------------------

  it("supports nested groups", () => {
    process.env.DB_HOST = "localhost";
    process.env.DB_PORT = "5432";
    const env = createZodEnv({
      db: {
        HOST: z.string().min(1),
        PORT: z.coerce.number(),
      },
    });
    expect(env.db.HOST).toBe("localhost");
    expect(env.db.PORT).toBe(5432);
  });

  it("nested groups respect prefix", () => {
    process.env.APP_DB_HOST = "remotehost";
    const env = createZodEnv(
      {
        db: {
          HOST: z.string(),
        },
      },
      { prefix: "APP_" },
    );
    expect(env.db.HOST).toBe("remotehost");
  });
});
