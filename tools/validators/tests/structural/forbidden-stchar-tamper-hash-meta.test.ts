import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const packageRoot = process.cwd();
const repoRoot = path.resolve(packageRoot, "../..");
const FORBIDDEN_FIELDS = [
  "profile_hash",
  "voice_block_hash",
  "page_packet_hash",
  "source_char_hash"
] as const;
const GUARDED_CONTRACT_FILES = [
  "tools/validators/src/schemas/story-character-authority.schema.json",
  "tools/validators/src/schemas/scene-prose-receipt.schema.json",
  ".claude/skills/_shared-templates/story-state-contract.md",
  ".claude/skills/_shared-templates/story-record-schemas.md"
] as const;

test("SPEC-71 guarded schema and contract files do not reintroduce STCHAR tamper hashes", () => {
  const hits = [];
  for (const relativePath of GUARDED_CONTRACT_FILES) {
    const content = readFileSync(path.join(repoRoot, relativePath), "utf8");
    for (const field of FORBIDDEN_FIELDS) {
      if (content.includes(field)) {
        hits.push(`${relativePath}: ${field}`);
      }
    }
  }

  assert.deepEqual(hits, []);
});
