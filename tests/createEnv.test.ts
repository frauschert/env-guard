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
          PORT: {
            type: "number",
            required: true,
            choices: [3000, 8080] as const,
            // @ts-expect-error — intentionally testing runtime guard
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

  describe("prefix scoping", () => {
    it("reads prefixed env variables", () => {
      process.env.MYAPP_PORT = "3000";
      const env = createEnv(
        { PORT: { type: "number", required: true } },
        { prefix: "MYAPP_" },
      );
      expect(env.PORT).toBe(3000);
    });

    it("reads multiple prefixed variables", () => {
      process.env.SVC_HOST = "localhost";
      process.env.SVC_PORT = "8080";
      const env = createEnv(
        {
          HOST: { type: "string", required: true },
          PORT: { type: "number", required: true },
        },
        { prefix: "SVC_" },
      );
      expect(env.HOST).toBe("localhost");
      expect(env.PORT).toBe(8080);
    });

    it("throws with prefixed key name when required var is missing", () => {
      delete process.env.MYAPP_SECRET;
      expect(() =>
        createEnv(
          { SECRET: { type: "string", required: true } },
          { prefix: "MYAPP_" },
        ),
      ).toThrow("MYAPP_SECRET");
    });

    it("uses default when prefixed variable is missing", () => {
      delete process.env.APP_DEBUG;
      const env = createEnv(
        { DEBUG: { type: "boolean", default: false } },
        { prefix: "APP_" },
      );
      expect(env.DEBUG).toBe(false);
    });

    it("works with array type", () => {
      process.env.APP_ORIGINS = "a.com,b.com";
      const env = createEnv(
        { ORIGINS: { type: "array", itemType: "string", required: true } },
        { prefix: "APP_" },
      );
      expect(env.ORIGINS).toEqual(["a.com", "b.com"]);
    });

    it("does not add prefix when prefix option is not set", () => {
      process.env.PORT = "4000";
      const env = createEnv({ PORT: { type: "number", required: true } });
      expect(env.PORT).toBe(4000);
    });
  });

  describe("custom error formatter (onError)", () => {
    it("calls onError with error array instead of throwing", () => {
      const onError = vi.fn();
      createEnv({ MISSING: { type: "string", required: true } }, { onError });
      expect(onError).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining("MISSING")]),
      );
    });

    it("does not throw when onError is provided", () => {
      expect(() =>
        createEnv(
          { MISSING: { type: "string", required: true } },
          { onError: () => {} },
        ),
      ).not.toThrow();
    });

    it("receives multiple errors", () => {
      const errors: string[] = [];
      createEnv(
        {
          A: { type: "string", required: true },
          B: { type: "number", required: true },
        },
        {
          onError: (e) => {
            errors.push(...e);
          },
        },
      );
      expect(errors.length).toBe(2);
      expect(errors[0]).toContain("A");
      expect(errors[1]).toContain("B");
    });

    it("still throws with default format when onError is not set", () => {
      expect(() =>
        createEnv({ X: { type: "string", required: true } }),
      ).toThrow("Env-Guard validation errors");
    });

    it("onError can re-throw with custom formatting", () => {
      expect(() =>
        createEnv(
          { MISSING: { type: "string", required: true } },
          {
            onError: (errors) => {
              throw new Error(`Custom: ${errors.join("; ")}`);
            },
          },
        ),
      ).toThrow("Custom:");
    });
  });

  describe("describe field", () => {
    it("includes description in required-but-missing error", () => {
      expect(() =>
        createEnv({
          DB_URL: {
            type: "string",
            required: true,
            describe: "Primary database connection string",
          },
        }),
      ).toThrow("(Primary database connection string)");
    });

    it("includes description in type mismatch error", () => {
      process.env.PORT = "abc";
      expect(() =>
        createEnv({
          PORT: {
            type: "number",
            required: true,
            describe: "Server port",
          },
        }),
      ).toThrow("'PORT' (Server port): Expected 'number'");
      delete process.env.PORT;
    });

    it("includes description in choices error", () => {
      process.env.MODE = "invalid";
      expect(() =>
        createEnv({
          MODE: {
            type: "string",
            required: true,
            choices: ["a", "b"] as const,
            describe: "Application mode",
          },
        }),
      ).toThrow("(Application mode)");
      delete process.env.MODE;
    });

    it("includes description in validate error", () => {
      process.env.VAL = "99999";
      expect(() =>
        createEnv({
          VAL: {
            type: "number",
            required: true,
            validate: (v) => (v as number) <= 100,
            describe: "Must be ≤ 100",
          },
        }),
      ).toThrow("(Must be ≤ 100)");
      delete process.env.VAL;
    });

    it("includes description in format error", () => {
      process.env.URL = "not-a-url";
      expect(() =>
        createEnv({
          URL: {
            type: "string",
            format: "url",
            required: true,
            describe: "API endpoint URL",
          },
        }),
      ).toThrow("(API endpoint URL)");
      delete process.env.URL;
    });

    it("includes description in boolean type error", () => {
      process.env.FLAG = "maybe";
      expect(() =>
        createEnv({
          FLAG: {
            type: "boolean",
            required: true,
            describe: "Feature flag toggle",
          },
        }),
      ).toThrow("(Feature flag toggle)");
      delete process.env.FLAG;
    });

    it("includes description in array item error", () => {
      process.env.NUMS = "1,abc,3";
      expect(() =>
        createEnv({
          NUMS: {
            type: "array",
            itemType: "number",
            required: true,
            describe: "List of port numbers",
          },
        }),
      ).toThrow("(List of port numbers)");
      delete process.env.NUMS;
    });

    it("does not alter error message when describe is omitted", () => {
      expect(() =>
        createEnv({
          MISSING: { type: "string", required: true },
        }),
      ).toThrow("❌ 'MISSING': Is marked as required");
    });

    it("works with prefix and describe together", () => {
      expect(() =>
        createEnv(
          {
            PORT: {
              type: "number",
              required: true,
              describe: "HTTP port",
            },
          },
          { prefix: "APP_" },
        ),
      ).toThrow("'APP_PORT' (HTTP port)");
    });
  });

  describe("runtime refresh (watch)", () => {
    afterEach(() => {
      delete process.env.HOST;
      delete process.env.PORT;
      delete process.env.DEBUG;
      delete process.env.TAGS;
    });

    it("returns an object with refresh, on, and off methods", () => {
      process.env.HOST = "localhost";
      const env = createEnv(
        { HOST: { type: "string", required: true } },
        { watch: true },
      );
      expect(typeof env.refresh).toBe("function");
      expect(typeof env.on).toBe("function");
      expect(typeof env.off).toBe("function");
    });

    it("refresh, on, off are non-enumerable", () => {
      process.env.HOST = "localhost";
      const env = createEnv(
        { HOST: { type: "string", required: true } },
        { watch: true },
      );
      expect(Object.keys(env)).toEqual(["HOST"]);
    });

    it("returns parsed values like normal createEnv", () => {
      process.env.HOST = "localhost";
      process.env.PORT = "3000";
      const env = createEnv(
        {
          HOST: { type: "string", required: true },
          PORT: { type: "number", required: true },
        },
        { watch: true },
      );
      expect(env.HOST).toBe("localhost");
      expect(env.PORT).toBe(3000);
    });

    it("refresh() picks up changed values", () => {
      process.env.HOST = "localhost";
      const env = createEnv(
        { HOST: { type: "string", required: true } },
        { watch: true },
      );
      expect(env.HOST).toBe("localhost");

      process.env.HOST = "0.0.0.0";
      env.refresh();
      expect(env.HOST).toBe("0.0.0.0");
    });

    it("refresh() picks up new values for optional vars", () => {
      const env = createEnv(
        { DEBUG: { type: "boolean", default: false } },
        { watch: true },
      );
      expect(env.DEBUG).toBe(false);

      process.env.DEBUG = "true";
      env.refresh();
      expect(env.DEBUG).toBe(true);
    });

    it("fires change listener on refresh", () => {
      process.env.PORT = "3000";
      const env = createEnv(
        { PORT: { type: "number", required: true } },
        { watch: true },
      );

      const changes: Array<{ key: string; oldVal: unknown; newVal: unknown }> =
        [];
      env.on("change", (key, oldVal, newVal) => {
        changes.push({ key, oldVal, newVal });
      });

      process.env.PORT = "8080";
      env.refresh();

      expect(changes).toEqual([{ key: "PORT", oldVal: 3000, newVal: 8080 }]);
    });

    it("does not fire listener when values are unchanged", () => {
      process.env.HOST = "localhost";
      const env = createEnv(
        { HOST: { type: "string", required: true } },
        { watch: true },
      );

      const changes: unknown[] = [];
      env.on("change", (key) => changes.push(key));

      env.refresh();
      expect(changes).toEqual([]);
    });

    it("fires listener for each changed key", () => {
      process.env.HOST = "a";
      process.env.PORT = "1";
      const env = createEnv(
        {
          HOST: { type: "string", required: true },
          PORT: { type: "number", required: true },
        },
        { watch: true },
      );

      const keys: string[] = [];
      env.on("change", (key) => keys.push(key));

      process.env.HOST = "b";
      process.env.PORT = "2";
      env.refresh();

      expect(keys).toContain("HOST");
      expect(keys).toContain("PORT");
    });

    it("off() removes a listener", () => {
      process.env.HOST = "a";
      const env = createEnv(
        { HOST: { type: "string", required: true } },
        { watch: true },
      );

      const calls: string[] = [];
      const listener = (key: string) => calls.push(key);
      env.on("change", listener);

      process.env.HOST = "b";
      env.refresh();
      expect(calls).toEqual(["HOST"]);

      env.off("change", listener);
      process.env.HOST = "c";
      env.refresh();
      expect(calls).toEqual(["HOST"]); // still just one call
    });

    it("refresh() throws on validation errors by default", () => {
      process.env.PORT = "3000";
      const env = createEnv(
        { PORT: { type: "number", required: true } },
        { watch: true },
      );

      delete process.env.PORT;
      expect(() => env.refresh()).toThrow("PORT");
    });

    it("refresh() uses onError when provided", () => {
      process.env.PORT = "3000";
      const errors: string[] = [];
      const env = createEnv(
        { PORT: { type: "number", required: true } },
        { watch: true, onError: (e) => errors.push(...e) },
      );

      delete process.env.PORT;
      env.refresh();
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain("PORT");
    });

    it("detects changes in array values", () => {
      process.env.TAGS = "a,b";
      const env = createEnv(
        { TAGS: { type: "array", itemType: "string", required: true } },
        { watch: true },
      );
      expect(env.TAGS).toEqual(["a", "b"]);

      const changes: Array<{ oldVal: unknown; newVal: unknown }> = [];
      env.on("change", (_key, oldVal, newVal) => {
        changes.push({ oldVal, newVal });
      });

      process.env.TAGS = "x,y,z";
      env.refresh();
      expect(env.TAGS).toEqual(["x", "y", "z"]);
      expect(changes).toEqual([
        { oldVal: ["a", "b"], newVal: ["x", "y", "z"] },
      ]);
    });

    it("without watch, returned object has no refresh/on/off", () => {
      process.env.HOST = "localhost";
      const env = createEnv({ HOST: { type: "string", required: true } });
      expect("refresh" in env).toBe(false);
      expect("on" in env).toBe(false);
      expect("off" in env).toBe(false);
      delete process.env.HOST;
    });
  });

  describe("sensitive masking", () => {
    afterEach(() => {
      delete process.env.DB_PASS;
      delete process.env.TOKEN;
      delete process.env.MODE;
      delete process.env.FLAGS;
    });

    it("redacts value in type mismatch error for number", () => {
      process.env.DB_PASS = "not-a-number";
      expect(() =>
        createEnv({
          DB_PASS: { type: "number", required: true, sensitive: true },
        }),
      ).toThrow("'****'");
    });

    it("redacts value in type mismatch error for boolean", () => {
      process.env.DB_PASS = "not-a-bool";
      expect(() =>
        createEnv({
          DB_PASS: { type: "boolean", required: true, sensitive: true },
        }),
      ).toThrow("'****'");
    });

    it("redacts value in choices error", () => {
      process.env.MODE = "secret-mode";
      expect(() =>
        createEnv({
          MODE: {
            type: "string",
            required: true,
            choices: ["a", "b"] as const,
            sensitive: true,
          },
        }),
      ).toThrow("Value '****'");
      delete process.env.MODE;
    });

    it("redacts value in custom validate error", () => {
      process.env.TOKEN = "bad-token";
      expect(() =>
        createEnv({
          TOKEN: {
            type: "string",
            required: true,
            validate: () => false,
            sensitive: true,
          },
        }),
      ).toThrow("value '****'");
    });

    it("redacts value in format error", () => {
      process.env.TOKEN = "not-a-url";
      expect(() =>
        createEnv({
          TOKEN: {
            type: "string",
            format: "url",
            required: true,
            sensitive: true,
          },
        }),
      ).toThrow("Value '****'");
    });

    it("redacts array item values in error", () => {
      process.env.FLAGS = "1,secret,3";
      expect(() =>
        createEnv({
          FLAGS: {
            type: "array",
            itemType: "number",
            required: true,
            sensitive: true,
          },
        }),
      ).toThrow("'****'");
    });

    it("does not redact when sensitive is not set", () => {
      process.env.DB_PASS = "not-a-number";
      expect(() =>
        createEnv({
          DB_PASS: { type: "number", required: true },
        }),
      ).toThrow("'not-a-number'");
    });

    it("still shows key name for required-but-missing sensitive var", () => {
      expect(() =>
        createEnv({
          DB_PASS: { type: "string", required: true, sensitive: true },
        }),
      ).toThrow("DB_PASS");
    });

    it("redacts old and new values in change listener for sensitive vars", () => {
      process.env.DB_PASS = "old-secret";
      const env = createEnv(
        { DB_PASS: { type: "string", required: true, sensitive: true } },
        { watch: true },
      );

      const changes: Array<{ oldVal: unknown; newVal: unknown }> = [];
      env.on("change", (_key, oldVal, newVal) => {
        changes.push({ oldVal, newVal });
      });

      process.env.DB_PASS = "new-secret";
      env.refresh();
      expect(changes).toEqual([{ oldVal: "****", newVal: "****" }]);
      // The actual property still holds the real value
      expect(env.DB_PASS).toBe("new-secret");
    });

    it("does not redact change listener values for non-sensitive vars", () => {
      process.env.DB_PASS = "old";
      const env = createEnv(
        { DB_PASS: { type: "string", required: true } },
        { watch: true },
      );

      const changes: Array<{ oldVal: unknown; newVal: unknown }> = [];
      env.on("change", (_key, oldVal, newVal) => {
        changes.push({ oldVal, newVal });
      });

      process.env.DB_PASS = "new";
      env.refresh();
      expect(changes).toEqual([{ oldVal: "old", newVal: "new" }]);
    });
  });

  describe("freeze option", () => {
    it("freezes the returned object", () => {
      process.env.HOST = "localhost";
      const env = createEnv(
        { HOST: { type: "string", required: true } },
        { freeze: true },
      );
      expect(Object.isFrozen(env)).toBe(true);
      delete process.env.HOST;
    });

    it("prevents property mutation in strict mode", () => {
      process.env.PORT = "3000";
      const env = createEnv(
        { PORT: { type: "number", required: true } },
        { freeze: true },
      );
      expect(() => {
        (env as Record<string, unknown>).PORT = 9999;
      }).toThrow();
      expect(env.PORT).toBe(3000);
      delete process.env.PORT;
    });

    it("prevents adding new properties", () => {
      process.env.HOST = "localhost";
      const env = createEnv(
        { HOST: { type: "string", required: true } },
        { freeze: true },
      );
      expect(() => {
        (env as Record<string, unknown>).NEW_PROP = "oops";
      }).toThrow();
      delete process.env.HOST;
    });

    it("throws when combined with watch", () => {
      process.env.HOST = "localhost";
      expect(() =>
        // @ts-expect-error freeze + watch are mutually exclusive
        createEnv(
          { HOST: { type: "string", required: true } },
          { freeze: true, watch: true },
        ),
      ).toThrow("'freeze' and 'watch' cannot be used together");
      delete process.env.HOST;
    });

    it("is not frozen by default", () => {
      process.env.HOST = "localhost";
      const env = createEnv({ HOST: { type: "string", required: true } });
      expect(Object.isFrozen(env)).toBe(false);
      delete process.env.HOST;
    });
  });

  describe("strict option", () => {
    it("throws on access to unknown keys", () => {
      process.env.HOST = "localhost";
      const env = createEnv(
        { HOST: { type: "string", required: true } },
        { strict: true },
      );
      expect(env.HOST).toBe("localhost");
      expect(() => {
        void (env as Record<string, unknown>)["UNKNOWN_KEY"];
      }).toThrow("unknown env variable 'UNKNOWN_KEY'");
      delete process.env.HOST;
    });

    it("allows access to defined keys", () => {
      process.env.HOST = "localhost";
      process.env.PORT = "3000";
      const env = createEnv(
        {
          HOST: { type: "string", required: true },
          PORT: { type: "number", required: true },
        },
        { strict: true },
      );
      expect(env.HOST).toBe("localhost");
      expect(env.PORT).toBe(3000);
      delete process.env.HOST;
      delete process.env.PORT;
    });

    it("allows access to undefined optional keys", () => {
      const env = createEnv(
        { DEBUG: { type: "boolean", default: false } },
        { strict: true },
      );
      expect(env.DEBUG).toBe(false);
    });

    it("works together with freeze", () => {
      process.env.HOST = "localhost";
      const env = createEnv(
        { HOST: { type: "string", required: true } },
        { strict: true, freeze: true },
      );
      expect(env.HOST).toBe("localhost");
      expect(Object.isFrozen(env)).toBe(true);
      expect(() => {
        void (env as Record<string, unknown>)["NOPE"];
      }).toThrow("unknown env variable");
      delete process.env.HOST;
    });

    it("works together with watch", () => {
      process.env.HOST = "localhost";
      const env = createEnv(
        { HOST: { type: "string", required: true } },
        { strict: true, watch: true },
      );
      expect(env.HOST).toBe("localhost");
      expect(() => {
        void (env as Record<string, unknown>)["NOPE"];
      }).toThrow("unknown env variable");
      // refresh/on/off should still be accessible
      expect(typeof env.refresh).toBe("function");
      expect(typeof env.on).toBe("function");
      expect(typeof env.off).toBe("function");
      delete process.env.HOST;
    });

    it("is not strict by default", () => {
      process.env.HOST = "localhost";
      const env = createEnv({ HOST: { type: "string", required: true } });
      // accessing unknown key returns undefined silently
      expect((env as Record<string, unknown>)["NOPE"]).toBeUndefined();
      delete process.env.HOST;
    });
  });

  describe("coerce option", () => {
    it("coerces a JSON string into an object", () => {
      process.env.CONFIG = '{"port":3000,"debug":true}';
      const env = createEnv({
        CONFIG: {
          type: "string",
          required: true,
          coerce: (raw) => JSON.parse(raw),
        },
      });
      expect(env.CONFIG).toEqual({ port: 3000, debug: true });
      delete process.env.CONFIG;
    });

    it("decodes a base64 string", () => {
      const original = "hello world";
      process.env.ENCODED = Buffer.from(original).toString("base64");
      const env = createEnv({
        ENCODED: {
          type: "string",
          required: true,
          coerce: (raw) => Buffer.from(raw, "base64").toString("utf-8"),
        },
      });
      expect(env.ENCODED).toBe("hello world");
      delete process.env.ENCODED;
    });

    it("coerces a string to a number with custom logic", () => {
      process.env.AMOUNT = "$42.50";
      const env = createEnv({
        AMOUNT: {
          type: "number",
          required: true,
          coerce: (raw) => parseFloat(raw.replace("$", "")),
        },
      });
      expect(env.AMOUNT).toBe(42.5);
      delete process.env.AMOUNT;
    });

    it("coerces an array type with custom parsing", () => {
      process.env.JSON_ARRAY = '["alpha","beta","gamma"]';
      const env = createEnv({
        JSON_ARRAY: {
          type: "array",
          itemType: "string",
          required: true,
          coerce: (raw) => JSON.parse(raw),
        },
      });
      expect(env.JSON_ARRAY).toEqual(["alpha", "beta", "gamma"]);
      delete process.env.JSON_ARRAY;
    });

    it("skips coerce when variable is missing and uses default", () => {
      const coerce = vi.fn();
      delete process.env.MISSING_COERCE;
      const env = createEnv({
        MISSING_COERCE: {
          type: "string",
          default: "fallback",
          coerce,
        },
      });
      expect(env.MISSING_COERCE).toBe("fallback");
      expect(coerce).not.toHaveBeenCalled();
    });

    it("coerced value is still subject to choices validation", () => {
      process.env.LEVEL = "  warn  ";
      expect(() =>
        createEnv({
          LEVEL: {
            type: "string",
            required: true,
            choices: ["info", "warn", "error"] as const,
            coerce: (raw) => raw.trim(),
          },
        }),
      ).not.toThrow();
      expect(() =>
        createEnv({
          LEVEL: {
            type: "string",
            required: true,
            choices: ["info", "error"] as const,
            coerce: (raw) => raw.trim(),
          },
        }),
      ).toThrow("not in allowed choices");
      delete process.env.LEVEL;
    });

    it("coerced value is subject to custom validate", () => {
      process.env.POSITIVE = "-5";
      expect(() =>
        createEnv({
          POSITIVE: {
            type: "number",
            required: true,
            validate: (v) => (v as number) > 0,
            coerce: (raw) => Number(raw),
          },
        }),
      ).toThrow("Custom validation failed");
      delete process.env.POSITIVE;
    });

    it("coerced value is subject to format validation", () => {
      process.env.SITE = "example.com";
      expect(() =>
        createEnv({
          SITE: {
            type: "string",
            required: true,
            format: "url",
            coerce: (raw) => raw, // no transformation — still invalid
          },
        }),
      ).toThrow("does not match format 'url'");
      delete process.env.SITE;
    });

    it("works with sensitive masking", () => {
      process.env.SECRET_JSON = '{"key":"value"}';
      expect(() =>
        createEnv({
          SECRET_JSON: {
            type: "string",
            required: true,
            sensitive: true,
            coerce: (raw) => JSON.parse(raw),
            validate: () => false,
          },
        }),
      ).toThrow("****");
      delete process.env.SECRET_JSON;
    });

    it("works with watch and refresh", () => {
      process.env.TRIMMED = "  hello  ";
      const env = createEnv(
        {
          TRIMMED: {
            type: "string",
            required: true,
            coerce: (raw) => raw.trim(),
          },
        },
        { watch: true },
      );
      expect(env.TRIMMED).toBe("hello");
      process.env.TRIMMED = "  world  ";
      env.refresh();
      expect(env.TRIMMED).toBe("world");
      delete process.env.TRIMMED;
    });
  });

  describe("nested / grouped schemas", () => {
    afterEach(() => {
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.CACHE_HOST;
      delete process.env.CACHE_TTL;
      delete process.env.API_KEY;
      delete process.env.MYAPP_DB_HOST;
      delete process.env.MYAPP_DB_PORT;
    });

    it("reads env vars with uppercased group prefix", () => {
      process.env.DB_HOST = "localhost";
      process.env.DB_PORT = "5432";
      const env = createEnv({
        db: {
          HOST: { type: "string", required: true },
          PORT: { type: "number", default: 5432 },
        },
      });
      expect(env.db.HOST).toBe("localhost");
      expect(env.db.PORT).toBe(5432);
    });

    it("mixes flat vars and groups", () => {
      process.env.API_KEY = "secret123";
      process.env.DB_HOST = "db.example.com";
      process.env.DB_PORT = "3306";
      const env = createEnv({
        API_KEY: { type: "string", required: true },
        db: {
          HOST: { type: "string", required: true },
          PORT: { type: "number", required: true },
        },
      });
      expect(env.API_KEY).toBe("secret123");
      expect(env.db.HOST).toBe("db.example.com");
      expect(env.db.PORT).toBe(3306);
    });

    it("supports multiple groups", () => {
      process.env.DB_HOST = "db-host";
      process.env.CACHE_HOST = "cache-host";
      process.env.CACHE_TTL = "60";
      const env = createEnv({
        db: {
          HOST: { type: "string", required: true },
        },
        cache: {
          HOST: { type: "string", required: true },
          TTL: { type: "number", required: true },
        },
      });
      expect(env.db.HOST).toBe("db-host");
      expect(env.cache.HOST).toBe("cache-host");
      expect(env.cache.TTL).toBe(60);
    });

    it("composes with the global prefix option", () => {
      process.env.MYAPP_DB_HOST = "prefixed-host";
      process.env.MYAPP_DB_PORT = "9999";
      const env = createEnv(
        {
          db: {
            HOST: { type: "string", required: true },
            PORT: { type: "number", required: true },
          },
        },
        { prefix: "MYAPP_" },
      );
      expect(env.db.HOST).toBe("prefixed-host");
      expect(env.db.PORT).toBe(9999);
    });

    it("throws with correct prefixed key for missing required var in group", () => {
      expect(() =>
        createEnv({
          db: {
            HOST: { type: "string", required: true },
          },
        }),
      ).toThrow("DB_HOST");
    });

    it("uses defaults for missing optional group vars", () => {
      const env = createEnv({
        db: {
          HOST: { type: "string", default: "localhost" },
          PORT: { type: "number", default: 5432 },
        },
      });
      expect(env.db.HOST).toBe("localhost");
      expect(env.db.PORT).toBe(5432);
    });

    it("works with watch and refresh", () => {
      process.env.DB_HOST = "host-a";
      const env = createEnv(
        {
          db: {
            HOST: { type: "string", required: true },
          },
        },
        { watch: true },
      );
      expect(env.db.HOST).toBe("host-a");

      process.env.DB_HOST = "host-b";
      env.refresh();
      expect(env.db.HOST).toBe("host-b");
    });

    it("fires change listener for group key", () => {
      process.env.DB_HOST = "old-host";
      const listener = vi.fn();
      const env = createEnv(
        {
          db: {
            HOST: { type: "string", required: true },
          },
        },
        { watch: true },
      );
      env.on("change", listener);

      process.env.DB_HOST = "new-host";
      env.refresh();

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(
        "db",
        expect.objectContaining({ HOST: "old-host" }),
        expect.objectContaining({ HOST: "new-host" }),
      );
    });

    it("deep-freezes group sub-objects with freeze option", () => {
      process.env.DB_HOST = "localhost";
      const env = createEnv(
        {
          db: {
            HOST: { type: "string", required: true },
          },
        },
        { freeze: true },
      );
      expect(Object.isFrozen(env)).toBe(true);
      expect(Object.isFrozen(env.db)).toBe(true);
    });

    it("strict option allows group keys but rejects unknown top-level keys", () => {
      process.env.DB_HOST = "localhost";
      const env = createEnv(
        {
          db: {
            HOST: { type: "string", required: true },
          },
        },
        { strict: true },
      );
      expect(env.db.HOST).toBe("localhost");
      expect(() => {
        void (env as Record<string, unknown>)["UNKNOWN"];
      }).toThrow("unknown env variable");
    });

    it("redacts group change listener values when any sub-key is sensitive", () => {
      process.env.DB_HOST = "localhost";
      process.env.DB_PORT = "5432";
      const listener = vi.fn();
      const env = createEnv(
        {
          db: {
            HOST: { type: "string", required: true, sensitive: true },
            PORT: { type: "number", required: true },
          },
        },
        { watch: true },
      );
      env.on("change", listener);

      process.env.DB_HOST = "new-host";
      env.refresh();

      expect(listener).toHaveBeenCalledWith("db", "****", "****");
    });
  });

  describe("required as dynamic function", () => {
    it("throws when function returns true and variable is missing", () => {
      delete process.env.SECRET;
      expect(() =>
        createEnv({
          SECRET: { type: "string", required: () => true },
        }),
      ).toThrow("SECRET");
    });

    it("does not throw when function returns false and variable is missing", () => {
      delete process.env.OPTIONAL;
      const env = createEnv({
        OPTIONAL: { type: "string", required: () => false },
      });
      expect(env.OPTIONAL).toBeUndefined();
    });

    it("resolves based on another env var", () => {
      process.env.FEATURE_FLAG = "true";
      delete process.env.FEATURE_SECRET;
      expect(() =>
        createEnv({
          FEATURE_SECRET: {
            type: "string",
            required: (env) => env.FEATURE_FLAG === "true",
          },
        }),
      ).toThrow("FEATURE_SECRET");
    });

    it("does not require when the condition env var is absent", () => {
      delete process.env.FEATURE_FLAG;
      delete process.env.FEATURE_SECRET;
      const env = createEnv({
        FEATURE_SECRET: {
          type: "string",
          required: (env) => env.FEATURE_FLAG === "true",
        },
      });
      expect(env.FEATURE_SECRET).toBeUndefined();
    });

    it("receives the full process.env snapshot", () => {
      process.env.A = "1";
      process.env.B = "2";
      delete process.env.C;
      const seen: NodeJS.ProcessEnv[] = [];
      createEnv({
        C: {
          type: "string",
          required: (env) => {
            seen.push(env);
            return false;
          },
        },
      });
      expect(seen[0]).toBe(process.env);
    });

    it("works with array type", () => {
      delete process.env.TAGS;
      process.env.NEED_TAGS = "yes";
      expect(() =>
        createEnv({
          TAGS: {
            type: "array",
            itemType: "string",
            required: (env) => env.NEED_TAGS === "yes",
          },
        }),
      ).toThrow("TAGS");
    });

    it("does not require array when condition is false", () => {
      delete process.env.TAGS;
      delete process.env.NEED_TAGS;
      const env = createEnv({
        TAGS: {
          type: "array",
          itemType: "string",
          required: (env) => env.NEED_TAGS === "yes",
        },
      });
      expect(env.TAGS).toBeUndefined();
    });
  });

  describe("cross-field validate option", () => {
    it("passes when validate returns true", () => {
      process.env.MIN = "1";
      process.env.MAX = "10";
      const env = createEnv(
        {
          MIN: { type: "number", required: true },
          MAX: { type: "number", required: true },
        },
        { validate: (e) => e.MIN < e.MAX },
      );
      expect(env.MIN).toBe(1);
      expect(env.MAX).toBe(10);
    });

    it("throws with generic message when validate returns false", () => {
      process.env.MIN = "10";
      process.env.MAX = "1";
      expect(() =>
        createEnv(
          {
            MIN: { type: "number", required: true },
            MAX: { type: "number", required: true },
          },
          { validate: (e) => e.MIN < e.MAX },
        ),
      ).toThrow("Cross-field validation failed");
    });

    it("throws with custom message when validate returns a string", () => {
      process.env.MIN = "10";
      process.env.MAX = "1";
      expect(() =>
        createEnv(
          {
            MIN: { type: "number", required: true },
            MAX: { type: "number", required: true },
          },
          {
            validate: (e) =>
              e.MIN < e.MAX ? true : "MIN must be less than MAX",
          },
        ),
      ).toThrow("MIN must be less than MAX");
    });

    it("is not called when per-field validation already failed", () => {
      delete process.env.MIN;
      const crossValidate = vi.fn(() => true);
      expect(() =>
        createEnv(
          { MIN: { type: "number", required: true } },
          { validate: crossValidate },
        ),
      ).toThrow("MIN");
      expect(crossValidate).not.toHaveBeenCalled();
    });

    it("respects onError instead of throwing", () => {
      process.env.MIN = "10";
      process.env.MAX = "1";
      const onError = vi.fn();
      createEnv(
        {
          MIN: { type: "number", required: true },
          MAX: { type: "number", required: true },
        },
        {
          validate: (e) => (e.MIN < e.MAX ? true : "MIN must be < MAX"),
          onError,
        },
      );
      expect(onError).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining("MIN must be < MAX")]),
      );
    });

    it("re-runs on refresh() and catches new violations", () => {
      process.env.MIN = "1";
      process.env.MAX = "10";
      const env = createEnv(
        {
          MIN: { type: "number", required: true },
          MAX: { type: "number", required: true },
        },
        {
          watch: true,
          validate: (e) => (e.MIN < e.MAX ? true : "MIN must be < MAX"),
        },
      );
      expect(env.MIN).toBe(1);

      process.env.MIN = "99";
      expect(() => env.refresh()).toThrow("MIN must be < MAX");
    });
  });

  describe("edge cases — empty strings", () => {
    afterEach(() => {
      delete process.env.VAR;
      delete process.env.ITEMS;
    });

    it("empty string satisfies required:true for type:string — it is present, not missing", () => {
      process.env.VAR = "";
      expect(() =>
        createEnv({ VAR: { type: "string", required: true } }),
      ).not.toThrow();
    });

    it("returns empty string for type:string", () => {
      process.env.VAR = "";
      const env = createEnv({ VAR: { type: "string" } });
      expect(env.VAR).toBe("");
    });

    it("parses empty string as 0 for type:number (Number('') === 0)", () => {
      process.env.VAR = "";
      const env = createEnv({ VAR: { type: "number" } });
      expect(env.VAR).toBe(0);
    });

    it("throws for type:boolean with empty string", () => {
      process.env.VAR = "";
      expect(() =>
        createEnv({ VAR: { type: "boolean", required: true } }),
      ).toThrow("Expected 'boolean'");
    });

    it("type:array itemType:string with empty string yields one empty-string element", () => {
      process.env.ITEMS = "";
      const env = createEnv({
        ITEMS: { type: "array", itemType: "string", required: true },
      });
      expect(env.ITEMS).toEqual([""]);
    });

    it("type:array itemType:number with empty string yields [0]", () => {
      process.env.ITEMS = "";
      const env = createEnv({
        ITEMS: { type: "array", itemType: "number", required: true },
      });
      expect(env.ITEMS).toEqual([0]);
    });

    it("format:url rejects empty string", () => {
      process.env.VAR = "";
      expect(() =>
        createEnv({ VAR: { type: "string", format: "url", required: true } }),
      ).toThrow("does not match format 'url'");
    });

    it("format:email rejects empty string", () => {
      process.env.VAR = "";
      expect(() =>
        createEnv({ VAR: { type: "string", format: "email", required: true } }),
      ).toThrow("does not match format 'email'");
    });

    it("validate receives empty string as the parsed value", () => {
      process.env.VAR = "";
      const received: unknown[] = [];
      createEnv({
        VAR: {
          type: "string",
          validate: (v) => {
            received.push(v);
            return true;
          },
        },
      });
      expect(received).toEqual([""]);
    });

    it("choices rejects empty string not in list", () => {
      process.env.VAR = "";
      expect(() =>
        createEnv({
          VAR: { type: "string", required: true, choices: ["a", "b"] as const },
        }),
      ).toThrow("not in allowed choices");
    });
  });

  describe("edge cases — whitespace-only values", () => {
    afterEach(() => {
      delete process.env.VAR;
      delete process.env.ITEMS;
    });

    it("type:string preserves whitespace-only value as-is", () => {
      process.env.VAR = "   ";
      const env = createEnv({ VAR: { type: "string" } });
      expect(env.VAR).toBe("   ");
    });

    it("whitespace-only satisfies required:true — it is present, not missing", () => {
      process.env.VAR = "   ";
      expect(() =>
        createEnv({ VAR: { type: "string", required: true } }),
      ).not.toThrow();
    });

    it("parses whitespace-only as 0 for type:number (Number('  ') === 0)", () => {
      process.env.VAR = "   ";
      const env = createEnv({ VAR: { type: "number" } });
      expect(env.VAR).toBe(0);
    });

    it("throws for type:boolean with whitespace-only value", () => {
      process.env.VAR = "   ";
      expect(() =>
        createEnv({ VAR: { type: "boolean", required: true } }),
      ).toThrow("Expected 'boolean'");
    });

    it("parses '  true  ' as true for type:boolean (trims before matching)", () => {
      process.env.VAR = "  true  ";
      const env = createEnv({ VAR: { type: "boolean", required: true } });
      expect(env.VAR).toBe(true);
    });

    it("parses '  false  ' as false for type:boolean", () => {
      process.env.VAR = "  false  ";
      const env = createEnv({ VAR: { type: "boolean", required: true } });
      expect(env.VAR).toBe(false);
    });

    it("parses '  1  ' as true for type:boolean", () => {
      process.env.VAR = "  1  ";
      const env = createEnv({ VAR: { type: "boolean", required: true } });
      expect(env.VAR).toBe(true);
    });

    it("parses '  0  ' as false for type:boolean", () => {
      process.env.VAR = "  0  ";
      const env = createEnv({ VAR: { type: "boolean", required: true } });
      expect(env.VAR).toBe(false);
    });

    it("whitespace-only array items are trimmed to empty strings", () => {
      process.env.ITEMS = "  ,  ";
      const env = createEnv({
        ITEMS: { type: "array", itemType: "string", required: true },
      });
      expect(env.ITEMS).toEqual(["", ""]);
    });

    it("format:email rejects whitespace-only value", () => {
      process.env.VAR = "   ";
      expect(() =>
        createEnv({ VAR: { type: "string", format: "email", required: true } }),
      ).toThrow("does not match format 'email'");
    });

    it("format:url rejects whitespace-only value", () => {
      process.env.VAR = "   ";
      expect(() =>
        createEnv({ VAR: { type: "string", format: "url", required: true } }),
      ).toThrow("does not match format 'url'");
    });
  });

  describe("edge cases — special characters", () => {
    afterEach(() => {
      delete process.env.VAR;
      delete process.env.ITEMS;
    });

    it("preserves '=' sign in string value", () => {
      process.env.VAR = "key=value=extra";
      const env = createEnv({ VAR: { type: "string", required: true } });
      expect(env.VAR).toBe("key=value=extra");
    });

    it("preserves '#' character in string value", () => {
      process.env.VAR = "color=#ff0000";
      const env = createEnv({ VAR: { type: "string", required: true } });
      expect(env.VAR).toBe("color=#ff0000");
    });

    it("preserves '$' character in string value", () => {
      process.env.VAR = "price=$42.99";
      const env = createEnv({ VAR: { type: "string", required: true } });
      expect(env.VAR).toBe("price=$42.99");
    });

    it("preserves backslash in string value", () => {
      process.env.VAR = "C:\\Users\\admin";
      const env = createEnv({ VAR: { type: "string", required: true } });
      expect(env.VAR).toBe("C:\\Users\\admin");
    });

    it("preserves newline character in string value", () => {
      process.env.VAR = "line1\nline2";
      const env = createEnv({ VAR: { type: "string", required: true } });
      expect(env.VAR).toBe("line1\nline2");
    });

    it("preserves unicode emoji in string value", () => {
      process.env.VAR = "hello \u{1F680} world";
      const env = createEnv({ VAR: { type: "string", required: true } });
      expect(env.VAR).toBe("hello \u{1F680} world");
    });

    it("preserves accented UTF-8 characters in string value", () => {
      process.env.VAR = "caf\u00E9 na\u00EFve r\u00E9sum\u00E9";
      const env = createEnv({ VAR: { type: "string", required: true } });
      expect(env.VAR).toBe("caf\u00E9 na\u00EFve r\u00E9sum\u00E9");
    });

    it("preserves CJK characters in string value", () => {
      process.env.VAR = "\u3053\u3093\u306B\u3061\u306F\u4E16\u754C";
      const env = createEnv({ VAR: { type: "string", required: true } });
      expect(env.VAR).toBe("\u3053\u3093\u306B\u3061\u306F\u4E16\u754C");
    });

    it("array items with special characters (=, #, $) are preserved", () => {
      process.env.ITEMS = "a=1,b#2,c$3";
      const env = createEnv({
        ITEMS: { type: "array", itemType: "string", required: true },
      });
      expect(env.ITEMS).toEqual(["a=1", "b#2", "c$3"]);
    });

    it("array with unicode items", () => {
      process.env.ITEMS = "\u{1F680},caf\u00E9,\u4E16\u754C";
      const env = createEnv({
        ITEMS: { type: "array", itemType: "string", required: true },
      });
      expect(env.ITEMS).toEqual(["\u{1F680}", "caf\u00E9", "\u4E16\u754C"]);
    });

    it("handles very long string values", () => {
      const longValue = "x".repeat(10_000);
      process.env.VAR = longValue;
      const env = createEnv({ VAR: { type: "string", required: true } });
      expect(env.VAR).toBe(longValue);
      expect(env.VAR.length).toBe(10_000);
    });

    it("format:url accepts URLs with query strings and encoded characters", () => {
      process.env.VAR = "https://example.com/path?q=hello%20world&lang=en";
      const env = createEnv({
        VAR: { type: "string", format: "url", required: true },
      });
      expect(env.VAR).toBe("https://example.com/path?q=hello%20world&lang=en");
    });

    it("number value with surrounding whitespace is parsed correctly", () => {
      process.env.VAR = "  3000  ";
      const env = createEnv({ VAR: { type: "number", required: true } });
      expect(env.VAR).toBe(3000);
    });
  });
});
