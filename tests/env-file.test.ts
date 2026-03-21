import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseEnvFile, loadEnvFiles, defaultEnvFiles } from "../src/env-file";
import { createEnv } from "../src/index";

describe("parseEnvFile", () => {
  it("parses simple KEY=value pairs", () => {
    const result = parseEnvFile("FOO=bar\nBAZ=qux");
    expect(result).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  it("skips empty lines and comments", () => {
    const result = parseEnvFile("# comment\n\nFOO=bar\n  # another comment\n");
    expect(result).toEqual({ FOO: "bar" });
  });

  it("strips double quotes", () => {
    const result = parseEnvFile('FOO="hello world"');
    expect(result).toEqual({ FOO: "hello world" });
  });

  it("strips single quotes", () => {
    const result = parseEnvFile("FOO='hello world'");
    expect(result).toEqual({ FOO: "hello world" });
  });

  it("strips inline comments on unquoted values", () => {
    const result = parseEnvFile("FOO=bar # this is a comment");
    expect(result).toEqual({ FOO: "bar" });
  });

  it("preserves # inside quoted values", () => {
    const result = parseEnvFile('FOO="bar # not a comment"');
    expect(result).toEqual({ FOO: "bar # not a comment" });
  });

  it("handles values with = signs", () => {
    const result = parseEnvFile("URL=https://example.com?a=1&b=2");
    expect(result).toEqual({ URL: "https://example.com?a=1&b=2" });
  });

  it("trims whitespace around keys and values", () => {
    const result = parseEnvFile("  FOO  =  bar  ");
    expect(result).toEqual({ FOO: "bar" });
  });

  it("skips lines without =", () => {
    const result = parseEnvFile("INVALID_LINE\nFOO=bar");
    expect(result).toEqual({ FOO: "bar" });
  });

  it("handles empty values", () => {
    const result = parseEnvFile("FOO=");
    expect(result).toEqual({ FOO: "" });
  });

  it("handles Windows-style line endings", () => {
    const result = parseEnvFile("FOO=bar\r\nBAZ=qux\r\n");
    expect(result).toEqual({ FOO: "bar", BAZ: "qux" });
  });
});

describe("loadEnvFiles", () => {
  const tmpDir = join(__dirname, ".tmp-env-test");
  const originalEnv = process.env;

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads variables from a .env file", () => {
    writeFileSync(join(tmpDir, ".env"), "LOAD_TEST=hello\n");
    delete process.env.LOAD_TEST;
    loadEnvFiles([".env"], tmpDir);
    expect(process.env.LOAD_TEST).toBe("hello");
  });

  it("does not overwrite existing env variables", () => {
    writeFileSync(join(tmpDir, ".env"), "EXISTING=from-file\n");
    process.env.EXISTING = "from-env";
    loadEnvFiles([".env"], tmpDir);
    expect(process.env.EXISTING).toBe("from-env");
  });

  it("later files override earlier files (for new keys)", () => {
    writeFileSync(join(tmpDir, ".env"), "A=first\nB=only-first\n");
    writeFileSync(join(tmpDir, ".env.local"), "A=second\n");
    delete process.env.A;
    delete process.env.B;
    loadEnvFiles([".env", ".env.local"], tmpDir);
    // .env sets A=first, then .env.local tries A=second but A is already set
    // so A stays "first" (first loaded wins for process.env)
    expect(process.env.A).toBe("first");
    expect(process.env.B).toBe("only-first");
  });

  it("silently skips missing files", () => {
    delete process.env.SKIP_TEST;
    expect(() =>
      loadEnvFiles([".env.nonexistent", ".env.also-missing"], tmpDir),
    ).not.toThrow();
  });
});

describe("defaultEnvFiles", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns [.env, .env.local] when NODE_ENV is unset", () => {
    delete process.env.NODE_ENV;
    expect(defaultEnvFiles()).toEqual([".env", ".env.local"]);
  });

  it("includes .env.{NODE_ENV} when NODE_ENV is set", () => {
    process.env.NODE_ENV = "production";
    expect(defaultEnvFiles()).toEqual([
      ".env",
      ".env.production",
      ".env.local",
    ]);
  });
});

describe("createEnv with envFiles option", () => {
  const tmpDir = join(__dirname, ".tmp-env-integration");
  const originalEnv = process.env;

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
    process.env = { ...originalEnv };
    // Stub cwd to our temp dir
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads .env file when envFiles: true", () => {
    writeFileSync(join(tmpDir, ".env"), "MY_VAR=from-env-file\n");
    delete process.env.MY_VAR;
    delete process.env.NODE_ENV;
    const env = createEnv(
      { MY_VAR: { type: "string", required: true } },
      { envFiles: true },
    );
    expect(env.MY_VAR).toBe("from-env-file");
  });

  it("loads custom file list when envFiles is an array", () => {
    writeFileSync(join(tmpDir, ".env.custom"), "CUSTOM_VAR=custom\n");
    delete process.env.CUSTOM_VAR;
    const env = createEnv(
      { CUSTOM_VAR: { type: "string", required: true } },
      { envFiles: [".env.custom"] },
    );
    expect(env.CUSTOM_VAR).toBe("custom");
  });

  it("does not load .env files when envFiles is not set", () => {
    writeFileSync(join(tmpDir, ".env"), "NO_LOAD=value\n");
    delete process.env.NO_LOAD;
    const env = createEnv({ NO_LOAD: { type: "string" } });
    expect(env.NO_LOAD).toBeUndefined();
  });
});
