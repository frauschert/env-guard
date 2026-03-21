import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Parse a `.env` file string into a key-value record.
 * Supports:
 *  - KEY=value
 *  - Single- and double-quoted values (quotes stripped)
 *  - Inline comments after unquoted values
 *  - Blank lines and comment-only lines (# ...)
 *  - Trims whitespace around keys and unquoted values
 */
export function parseEnvFile(src: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    // Skip empty lines and comments
    if (line === "" || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    // Handle quoted values
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      // Strip inline comments for unquoted values
      const hashIndex = value.indexOf(" #");
      if (hashIndex !== -1) {
        value = value.slice(0, hashIndex).trimEnd();
      }
    }

    result[key] = value;
  }

  return result;
}

/**
 * Load `.env` files into `process.env`.
 * Files are read in order; later files override earlier ones.
 * Existing `process.env` values are NOT overwritten (env takes precedence).
 * Missing files are silently skipped.
 */
export function loadEnvFiles(
  files: string[],
  cwd: string = process.cwd(),
): void {
  for (const file of files) {
    const filePath = resolve(cwd, file);
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      // File doesn't exist — skip silently
      continue;
    }
    const parsed = parseEnvFile(content);
    for (const [key, value] of Object.entries(parsed)) {
      // Don't overwrite existing env — real env always wins
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

/**
 * Return the default list of `.env` files to load, based on NODE_ENV.
 */
export function defaultEnvFiles(): string[] {
  const files = [".env"];
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv) {
    files.push(`.env.${nodeEnv}`);
  }
  files.push(".env.local");
  return files;
}
