import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEnv } from "../src/index";

describe("createEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", undefined);
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
  });

  it("parses string variables", () => {
    process.env.HOST = "localhost";
    const env = createEnv({ HOST: { type: "string", required: true } });
    expect(env.HOST).toBe("localhost");
  });

  it("parses number variables", () => {
    process.env.PORT = "3000";
    const env = createEnv({ PORT: { type: "number", required: true } });
    expect(env.PORT).toBe(3000);
  });

  it("parses boolean variables (true/false)", () => {
    process.env.DEBUG = "true";
    const env = createEnv({ DEBUG: { type: "boolean", required: true } });
    expect(env.DEBUG).toBe(true);
  });

  it("parses boolean variables (1/0)", () => {
    process.env.DEBUG = "0";
    const env = createEnv({ DEBUG: { type: "boolean", required: true } });
    expect(env.DEBUG).toBe(false);
  });

  it("uses default when variable is missing", () => {
    const env = createEnv({ PORT: { type: "number", default: 8080 } });
    expect(env.PORT).toBe(8080);
  });

  it("returns undefined for optional missing variable without default", () => {
    const env = createEnv({ HOST: { type: "string" } });
    expect(env.HOST).toBeUndefined();
  });

  it("throws on missing required variable", () => {
    expect(() =>
      createEnv({ SECRET: { type: "string", required: true } }),
    ).toThrow("SECRET");
  });

  it("throws on invalid number", () => {
    process.env.PORT = "not-a-number";
    expect(() =>
      createEnv({ PORT: { type: "number", required: true } }),
    ).toThrow("PORT");
  });

  it("throws on invalid boolean", () => {
    process.env.DEBUG = "yes";
    expect(() =>
      createEnv({ DEBUG: { type: "boolean", required: true } }),
    ).toThrow("DEBUG");
  });

  it("collects multiple validation errors", () => {
    expect(() =>
      createEnv({
        A: { type: "string", required: true },
        B: { type: "number", required: true },
      }),
    ).toThrow(/A[\s\S]*B/);
  });

  describe("custom validate function", () => {
    it("passes when validate returns true", () => {
      process.env.PORT = "3000";
      const env = createEnv({
        PORT: {
          type: "number",
          required: true,
          validate: (v) => (v as number) >= 1 && (v as number) <= 65535,
        },
      });
      expect(env.PORT).toBe(3000);
    });

    it("throws when validate returns false", () => {
      process.env.PORT = "99999";
      expect(() =>
        createEnv({
          PORT: {
            type: "number",
            required: true,
            validate: (v) => (v as number) >= 1 && (v as number) <= 65535,
          },
        }),
      ).toThrow("Custom validation failed");
    });

    it("validates string variables", () => {
      process.env.API_URL = "not-a-url";
      expect(() =>
        createEnv({
          API_URL: {
            type: "string",
            required: true,
            validate: (v) => (v as string).startsWith("https://"),
          },
        }),
      ).toThrow("Custom validation failed");
    });

    it("validates boolean variables", () => {
      process.env.FEATURE_FLAG = "true";
      const env = createEnv({
        FEATURE_FLAG: {
          type: "boolean",
          required: true,
          validate: (v) => v === true,
        },
      });
      expect(env.FEATURE_FLAG).toBe(true);
    });

    it("skips validate for missing optional variables", () => {
      const env = createEnv({
        OPT: {
          type: "string",
          validate: () => false,
        },
      });
      expect(env.OPT).toBeUndefined();
    });

    it("runs validate on default values", () => {
      expect(() =>
        createEnv({
          PORT: {
            type: "number",
            default: 0,
            validate: (v) => (v as number) >= 1,
          },
        }),
      ).toThrow("Custom validation failed");
    });
  });

  describe("choices option", () => {
    it("accepts a value that is in the choices list", () => {
      process.env.NODE_ENV = "production";
      const env = createEnv({
        NODE_ENV: {
          type: "string",
          required: true,
          choices: ["development", "staging", "production"] as const,
        },
      });
      expect(env.NODE_ENV).toBe("production");
    });

    it("throws when value is not in choices", () => {
      process.env.NODE_ENV = "invalid";
      expect(() =>
        createEnv({
          NODE_ENV: {
            type: "string",
            required: true,
            choices: ["development", "staging", "production"] as const,
          },
        }),
      ).toThrow("not in allowed choices");
    });

    it("works with number choices", () => {
      process.env.LOG_LEVEL = "2";
      const env = createEnv({
        LOG_LEVEL: {
          type: "number",
          required: true,
          choices: [0, 1, 2, 3] as const,
        },
      });
      expect(env.LOG_LEVEL).toBe(2);
    });

    it("throws for number not in choices", () => {
      process.env.LOG_LEVEL = "5";
      expect(() =>
        createEnv({
          LOG_LEVEL: {
            type: "number",
            required: true,
            choices: [0, 1, 2, 3] as const,
          },
        }),
      ).toThrow("not in allowed choices");
    });

    it("works with boolean choices", () => {
      process.env.STRICT = "true";
      const env = createEnv({
        STRICT: {
          type: "boolean",
          required: true,
          choices: [true] as const,
        },
      });
      expect(env.STRICT).toBe(true);
    });

    it("validates choices on default values", () => {
      expect(() =>
        createEnv({
          MODE: {
            type: "string",
            default: "debug",
            choices: ["development", "production"] as const,
          },
        }),
      ).toThrow("not in allowed choices");
    });

    it("skips choices check for missing optional variables", () => {
      delete process.env.MODE;
      const env = createEnv({
        MODE: {
          type: "string",
          choices: ["a", "b"] as const,
        },
      });
      expect(env.MODE).toBeUndefined();
    });
  });

  describe("choices and validate mutual exclusivity", () => {
    it("throws when both choices and validate are provided", () => {
      process.env.PORT = "3000";
      expect(() =>
        createEnv({
          // @ts-expect-error — intentionally testing runtime guard
          PORT: {
            type: "number",
            required: true,
            choices: [3000, 8080] as const,
            validate: (v) => (v as number) > 0,
          },
        }),
      ).toThrow("mutually exclusive");
    });
  });

  describe("format option", () => {
    it("accepts a valid URL", () => {
      process.env.API_URL = "https://example.com/api";
      const env = createEnv({
        API_URL: { type: "string", format: "url", required: true },
      });
      expect(env.API_URL).toBe("https://example.com/api");
    });

    it("rejects an invalid URL", () => {
      process.env.API_URL = "not-a-url";
      expect(() =>
        createEnv({
          API_URL: { type: "string", format: "url", required: true },
        }),
      ).toThrow("does not match format 'url'");
    });

    it("accepts a valid email", () => {
      process.env.CONTACT = "user@example.com";
      const env = createEnv({
        CONTACT: { type: "string", format: "email", required: true },
      });
      expect(env.CONTACT).toBe("user@example.com");
    });

    it("rejects an invalid email", () => {
      process.env.CONTACT = "not-an-email";
      expect(() =>
        createEnv({
          CONTACT: { type: "string", format: "email", required: true },
        }),
      ).toThrow("does not match format 'email'");
    });

    it("accepts a valid IPv4 address", () => {
      process.env.SERVER_IP = "192.168.1.1";
      const env = createEnv({
        SERVER_IP: { type: "string", format: "ip", required: true },
      });
      expect(env.SERVER_IP).toBe("192.168.1.1");
    });

    it("accepts a valid IPv6 address", () => {
      process.env.SERVER_IP = "::1";
      const env = createEnv({
        SERVER_IP: { type: "string", format: "ip", required: true },
      });
      expect(env.SERVER_IP).toBe("::1");
    });

    it("rejects an invalid IP address", () => {
      process.env.SERVER_IP = "999.999.999.999";
      expect(() =>
        createEnv({
          SERVER_IP: { type: "string", format: "ip", required: true },
        }),
      ).toThrow("does not match format 'ip'");
    });

    it("accepts a valid port", () => {
      process.env.APP_PORT = "8080";
      const env = createEnv({
        APP_PORT: { type: "string", format: "port", required: true },
      });
      expect(env.APP_PORT).toBe("8080");
    });

    it("rejects an invalid port", () => {
      process.env.APP_PORT = "99999";
      expect(() =>
        createEnv({
          APP_PORT: { type: "string", format: "port", required: true },
        }),
      ).toThrow("does not match format 'port'");
    });

    it("rejects port 0", () => {
      process.env.APP_PORT = "0";
      expect(() =>
        createEnv({
          APP_PORT: { type: "string", format: "port", required: true },
        }),
      ).toThrow("does not match format 'port'");
    });

    it("accepts a valid UUID", () => {
      process.env.REQUEST_ID = "550e8400-e29b-41d4-a716-446655440000";
      const env = createEnv({
        REQUEST_ID: { type: "string", format: "uuid", required: true },
      });
      expect(env.REQUEST_ID).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("rejects an invalid UUID", () => {
      process.env.REQUEST_ID = "not-a-uuid";
      expect(() =>
        createEnv({
          REQUEST_ID: { type: "string", format: "uuid", required: true },
        }),
      ).toThrow("does not match format 'uuid'");
    });

    it("skips format check for missing optional variables", () => {
      delete process.env.OPT_URL;
      const env = createEnv({
        OPT_URL: { type: "string", format: "url" },
      });
      expect(env.OPT_URL).toBeUndefined();
    });
  });

  describe("array type", () => {
    it("parses comma-separated strings", () => {
      process.env.ORIGINS = "a.com,b.com,c.com";
      const env = createEnv({
        ORIGINS: { type: "array", itemType: "string", required: true },
      });
      expect(env.ORIGINS).toEqual(["a.com", "b.com", "c.com"]);
    });

    it("trims whitespace around items", () => {
      process.env.ORIGINS = "a.com , b.com , c.com";
      const env = createEnv({
        ORIGINS: { type: "array", itemType: "string", required: true },
      });
      expect(env.ORIGINS).toEqual(["a.com", "b.com", "c.com"]);
    });

    it("uses custom separator", () => {
      process.env.ITEMS = "one|two|three";
      const env = createEnv({
        ITEMS: {
          type: "array",
          itemType: "string",
          separator: "|",
          required: true,
        },
      });
      expect(env.ITEMS).toEqual(["one", "two", "three"]);
    });

    it("parses number arrays", () => {
      process.env.PORTS = "3000,8080,9090";
      const env = createEnv({
        PORTS: { type: "array", itemType: "number", required: true },
      });
      expect(env.PORTS).toEqual([3000, 8080, 9090]);
    });

    it("throws on invalid number in array", () => {
      process.env.PORTS = "3000,abc,9090";
      expect(() =>
        createEnv({
          PORTS: { type: "array", itemType: "number", required: true },
        }),
      ).toThrow("Array item 'abc' is not a valid number");
    });

    it("parses boolean arrays", () => {
      process.env.FLAGS = "true,false,1,0";
      const env = createEnv({
        FLAGS: { type: "array", itemType: "boolean", required: true },
      });
      expect(env.FLAGS).toEqual([true, false, true, false]);
    });

    it("throws on invalid boolean in array", () => {
      process.env.FLAGS = "true,maybe";
      expect(() =>
        createEnv({
          FLAGS: { type: "array", itemType: "boolean", required: true },
        }),
      ).toThrow("Array item 'maybe' is not a valid boolean");
    });

    it("throws on missing required array", () => {
      delete process.env.MISSING_ARR;
      expect(() =>
        createEnv({
          MISSING_ARR: { type: "array", itemType: "string", required: true },
        }),
      ).toThrow("MISSING_ARR");
    });

    it("returns undefined for optional missing array", () => {
      delete process.env.OPT_ARR;
      const env = createEnv({
        OPT_ARR: { type: "array", itemType: "string" },
      });
      expect(env.OPT_ARR).toBeUndefined();
    });

    it("uses default for missing array", () => {
      delete process.env.DEF_ARR;
      const env = createEnv({
        DEF_ARR: {
          type: "array",
          itemType: "string",
          default: ["x", "y"],
        },
      });
      expect(env.DEF_ARR).toEqual(["x", "y"]);
    });

    it("handles single-element array", () => {
      process.env.SINGLE = "only";
      const env = createEnv({
        SINGLE: { type: "array", itemType: "string", required: true },
      });
      expect(env.SINGLE).toEqual(["only"]);
    });
  });
});
