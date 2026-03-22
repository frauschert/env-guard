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
});
