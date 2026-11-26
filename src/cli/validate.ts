/**
 * Validate a handoff file against its Zod schema.
 *   npm run validate -- runs/<slug>/storyboard.json            (schema guessed from file name)
 *   npm run validate -- some/file.json storyboard              (explicit schema)
 * Exit code 0 = valid, 1 = invalid (so skills and scripts can gate on it).
 */
import { SCHEMAS, schemaForFile } from "../schemas/index.js";
import { readJson } from "../lib/io.js";

const [file, explicit] = process.argv.slice(2);
if (!file) {
  console.error(`usage: npm run validate -- <file.json> [${Object.keys(SCHEMAS).join("|")}]`);
  process.exit(2);
}
const name = explicit ?? schemaForFile(file);
if (!name || !SCHEMAS[name]) {
  console.error(`cannot tell which schema to use for ${file}; pass one of: ${Object.keys(SCHEMAS).join(", ")}`);
  process.exit(2);
}
try {
  readJson(file, SCHEMAS[name]);
  console.log(`OK  ${file} is a valid ${name}`);
} catch (err) {
  console.error(`FAIL ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
