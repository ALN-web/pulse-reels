import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import { BrandSchema, type Brand } from "../schemas/brand.js";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function runDir(slug: string): string {
  return join(ROOT, "runs", slug);
}

export function readJson<T>(file: string, schema: z.ZodType<T>): T {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new Error(`${file} failed validation:\n${issues}`);
  }
  return parsed.data;
}

/** Validates BEFORE writing, so a bad handoff never lands on disk. */
export function writeJson<T>(file: string, data: T, schema: z.ZodType<T>): void {
  const parsed = schema.parse(data);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
}

/** Resumability: a step can be skipped when its outputs already exist and are valid. */
export function isValidOutput<T>(file: string, schema: z.ZodType<T>): boolean {
  if (!existsSync(file)) return false;
  try {
    readJson(file, schema);
    return true;
  } catch {
    return false;
  }
}

export function loadBrand(client: string): Brand {
  return readJson(join(ROOT, "clients", client, "brand.json"), BrandSchema);
}
