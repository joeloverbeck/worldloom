import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import Database from "better-sqlite3";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

export function createTempRepoRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "worldloom-hooks-"));
  mkdirSync(path.join(root, "tools", "hooks"), { recursive: true });
  mkdirSync(path.join(root, "tools", "world-mcp"), { recursive: true });
  mkdirSync(path.join(root, "worlds"), { recursive: true });
  writeFileSync(path.join(root, "tools", "hooks", "README.md"), "# hooks\n", "utf8");
  writeFileSync(path.join(root, "tools", "world-mcp", "package.json"), "{\n}\n", "utf8");
  return root;
}

export function destroyTempRepoRoot(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

function repeatLine(label: string, count: number): string {
  return Array.from({ length: count }, (_, index) => `${label} line ${index + 1}.`).join("\n");
}

export function seedHookFixtureWorld(root: string, worldSlug = "animalia"): void {
  const worldRoot = path.join(root, "worlds", worldSlug);
  mkdirSync(path.join(worldRoot, "_index"), { recursive: true });

  writeFileSync(path.join(worldRoot, "WORLD_KERNEL.md"), "# WORLD_KERNEL\nA tide-locked world.\n", "utf8");
  writeFileSync(path.join(worldRoot, "INVARIANTS.md"), "# INVARIANTS\nFresh water is rationed.\n", "utf8");
  writeFileSync(path.join(worldRoot, "ONTOLOGY.md"), "# ONTOLOGY\nPlace, polity, artifact.\n", "utf8");
  writeFileSync(path.join(worldRoot, "TIMELINE.md"), `# TIMELINE\n${repeatLine("timeline", 305)}\n`, "utf8");
  writeFileSync(path.join(worldRoot, "GEOGRAPHY.md"), "# GEOGRAPHY\n## Brinewick\nBrinewick is the northern salt-port city.\n", "utf8");
  writeFileSync(path.join(worldRoot, "PEOPLES_AND_SPECIES.md"), "# PEOPLES AND SPECIES\nHumans and corvid-folk.\n", "utf8");
  writeFileSync(path.join(worldRoot, "INSTITUTIONS.md"), `# INSTITUTIONS\n${repeatLine("institution", 320)}\n`, "utf8");
  writeFileSync(path.join(worldRoot, "ECONOMY_AND_RESOURCES.md"), "# ECONOMY\nSalt and rope.\n", "utf8");
  writeFileSync(path.join(worldRoot, "MAGIC_OR_TECH_SYSTEMS.md"), "# MAGIC\nLow and dangerous magic.\n", "utf8");
  writeFileSync(path.join(worldRoot, "EVERYDAY_LIFE.md"), `# EVERYDAY LIFE\n${repeatLine("everyday", 310)}\n`, "utf8");
  writeFileSync(path.join(worldRoot, "OPEN_QUESTIONS.md"), `# OPEN QUESTIONS\n${repeatLine("question", 308)}\n`, "utf8");
  writeFileSync(path.join(worldRoot, "MYSTERY_RESERVE.md"), `# MYSTERY RESERVE\n## M-1\n${repeatLine("mystery", 302)}\n`, "utf8");
  writeFileSync(path.join(worldRoot, "CANON_LEDGER.md"), `# CANON LEDGER\n## CF-0001\nBrinewick keeps the northern lighthouse.\n${repeatLine("ledger", 600)}\n`, "utf8");
  mkdirSync(path.join(worldRoot, "characters"), { recursive: true });
  writeFileSync(path.join(worldRoot, "characters", "vespera-nightwhisper.md"), "# Vespera\nScout.\n", "utf8");

  const migrationSql = readFileSync(
    path.join(
      REPO_ROOT,
      "tools",
      "world-index",
      "src",
      "schema",
      "migrations",
      "001_initial.sql"
    ),
    "utf8"
  );

  const db = new Database(path.join(worldRoot, "_index", "world.db"));
  try {
    db.exec(migrationSql);
    db.prepare(
      `
        INSERT INTO nodes (
          node_id,
          world_slug,
          file_path,
          heading_path,
          byte_start,
          byte_end,
          line_start,
          line_end,
          node_type,
          body,
          content_hash,
          anchor_checksum,
          summary,
          created_at_index_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      "CF-0001",
      worldSlug,
      "CANON_LEDGER.md",
      "CF-0001",
      0,
      40,
      1,
      3,
      "canon_fact_record",
      "Brinewick keeps the northern lighthouse.",
      "hash-cf",
      "anchor-cf",
      "Brinewick lighthouse canon fact.",
      1
    );
    db.prepare(
      `
        INSERT INTO nodes (
          node_id,
          world_slug,
          file_path,
          heading_path,
          byte_start,
          byte_end,
          line_start,
          line_end,
          node_type,
          body,
          content_hash,
          anchor_checksum,
          summary,
          created_at_index_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      `${worldSlug}:GEOGRAPHY.md:Brinewick:0`,
      worldSlug,
      "GEOGRAPHY.md",
      "Brinewick",
      0,
      55,
      1,
      3,
      "section",
      "Brinewick is the northern salt-port city that guards the lighthouse channel.",
      "hash-geo",
      "anchor-geo",
      "Brinewick section.",
      1
    );
    db.prepare(
      `
        INSERT INTO nodes (
          node_id,
          world_slug,
          file_path,
          heading_path,
          byte_start,
          byte_end,
          line_start,
          line_end,
          node_type,
          body,
          content_hash,
          anchor_checksum,
          summary,
          created_at_index_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      "M-1",
      worldSlug,
      "MYSTERY_RESERVE.md",
      "M-1",
      0,
      48,
      1,
      3,
      "mystery_reserve_entry",
      "No canon source explains the drowned bell under Brinewick.",
      "hash-m1",
      "anchor-m1",
      "Brinewick drowned bell mystery.",
      1
    );
    db.prepare(
      `
        INSERT INTO nodes (
          node_id,
          world_slug,
          file_path,
          heading_path,
          byte_start,
          byte_end,
          line_start,
          line_end,
          node_type,
          body,
          content_hash,
          anchor_checksum,
          summary,
          created_at_index_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      "entity:brinewick",
      worldSlug,
      "GEOGRAPHY.md",
      "Brinewick Entity",
      0,
      30,
      1,
      1,
      "named_entity",
      "Entity anchor for Brinewick.",
      "hash-entity",
      "anchor-entity",
      "Named entity anchor.",
      1
    );
    db.prepare(
      `
        INSERT INTO entities (
          entity_id,
          world_slug,
          canonical_name,
          entity_kind,
          provenance_scope,
          authority_level,
          source_node_id,
          source_field
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      "entity:brinewick",
      worldSlug,
      "Brinewick",
      "place",
      "world",
      "structured_anchor",
      `${worldSlug}:GEOGRAPHY.md:Brinewick:0`,
      null
    );
    db.prepare(
      `
        INSERT INTO entity_mentions (
          node_id,
          surface_text,
          resolved_entity_id,
          resolution_kind,
          extraction_method
        ) VALUES (?, ?, ?, ?, ?)
      `
    ).run("CF-0001", "Brinewick", "entity:brinewick", "canonical", "exact_canonical");
    db.prepare(
      `
        INSERT INTO entity_mentions (
          node_id,
          surface_text,
          resolved_entity_id,
          resolution_kind,
          extraction_method
        ) VALUES (?, ?, ?, ?, ?)
      `
    ).run(`${worldSlug}:GEOGRAPHY.md:Brinewick:0`, "Brinewick", "entity:brinewick", "canonical", "exact_canonical");
  } finally {
    db.close();
  }
}

export function writeTranscript(root: string, fileName: string, contents: string): string {
  const transcriptPath = path.join(root, fileName);
  writeFileSync(transcriptPath, contents, "utf8");
  return transcriptPath;
}

export function runCompiledHook(
  hookScript: string,
  input: Record<string, unknown>,
  options: { cwd: string; projectDir?: string }
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [path.join(REPO_ROOT, "tools", "hooks", "dist", "src", hookScript)],
    {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...(options.projectDir === undefined ? {} : { CLAUDE_PROJECT_DIR: options.projectDir })
      },
      input: JSON.stringify(input),
      encoding: "utf8"
    }
  );

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
}
