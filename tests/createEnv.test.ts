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
});
