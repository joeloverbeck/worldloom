import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { CURRENT_INDEX_VERSION, type EdgeType, type NodeType } from "@worldloom/world-index/public/types";

interface SeedNodeInput {
  node_id: string;
  world_slug: string;
  file_path: string;
  heading_path?: string | null;
  node_type: NodeType;
  body: string;
  summary?: string | null;
  line_start?: number;
  line_end?: number;
}

interface SeedEdgeInput {
  source_node_id: string;
  target_node_id?: string | null;
  target_unresolved_ref?: string | null;
  edge_type: EdgeType;
}

interface SeedEntityInput {
  entity_id: string;
  world_slug: string;
  canonical_name: string;
  entity_kind?: string | null;
  provenance_scope?: "world" | "proposal" | "diegetic" | "audit";
  authority_level?: "structured_anchor" | "explicit_assertion";
  source_node_id: string;
  source_field?: string | null;
}

interface SeedAliasInput {
  entity_id: string;
  alias_text: string;
  alias_kind?: "exact_structured" | "explicit_alias" | "normalized_form";
  source_node_id: string;
}

interface SeedMentionInput {
  node_id: string;
  surface_text: string;
  resolved_entity_id?: string | null;
  resolution_kind?: "canonical" | "alias" | "unresolved";
  extraction_method?: "exact_canonical" | "exact_alias" | "heuristic_phrase";
}

interface SeedAnchorInput {
  node_id: string;
  anchor_form: string;
  checksum?: string;
}

interface SeedValidationResultInput {
  world_slug: string;
  validator_name: string;
  severity: string;
  code: string;
  message: string;
  node_id?: string | null;
  file_path?: string | null;
  line_range_start?: number | null;
  line_range_end?: number | null;
  created_at?: string;
}

export interface SeedWorldInput {
  worldSlug: string;
  nodes: SeedNodeInput[];
  edges?: SeedEdgeInput[];
  entities?: SeedEntityInput[];
  aliases?: SeedAliasInput[];
  mentions?: SeedMentionInput[];
  anchors?: SeedAnchorInput[];
  validationResults?: SeedValidationResultInput[];
}

export function createTempRepoRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-mcp-tools-"));
  mkdirSync(path.join(root, "tools", "world-mcp"), { recursive: true });
  mkdirSync(path.join(root, "worlds"), { recursive: true });
  writeFileSync(path.join(root, "tools", "world-mcp", "package.json"), "{\n}\n", "utf8");
  return root;
}

export function destroyTempRepoRoot(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

export function withRepoRoot<T>(root: string, run: () => T): T {
  const originalCwd = process.cwd();

  try {
    process.chdir(path.join(root, "tools", "world-mcp"));
    return run();
  } finally {
    process.chdir(originalCwd);
  }
}

function hashValue(source: string): string {
  return createHash("sha256").update(source.normalize("NFC"), "utf8").digest("hex");
}

export function seedWorld(root: string, input: SeedWorldInput): void {
  const worldRoot = path.join(root, "worlds", input.worldSlug);
  const indexRoot = path.join(worldRoot, "_index");
  mkdirSync(indexRoot, { recursive: true });
  writeFileSync(path.join(indexRoot, "index_version.txt"), `${CURRENT_INDEX_VERSION}\n`, "utf8");

  const migrationPath = path.join(
    "/home/joeloverbeck/projects/worldloom",
    "tools",
    "world-index",
    "src",
    "schema",
    "migrations",
    "001_initial.sql"
  );
  const db = new Database(path.join(indexRoot, "world.db"));

  try {
    db.exec(readFileSync(migrationPath, "utf8"));

    for (const node of input.nodes) {
      const absolutePath = path.join(worldRoot, node.file_path);
      mkdirSync(path.dirname(absolutePath), { recursive: true });
      if (!absolutePath.endsWith(".md")) {
        writeFileSync(absolutePath, node.body, "utf8");
      } else if (!path.basename(absolutePath).startsWith("_")) {
        writeFileSync(absolutePath, node.body, "utf8");
      }

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
        node.node_id,
        node.world_slug,
        node.file_path,
        node.heading_path ?? null,
        0,
        node.body.length,
        node.line_start ?? 1,
        node.line_end ?? Math.max(1, node.body.split("\n").length),
        node.node_type,
        node.body,
        hashValue(node.body),
        hashValue(`${node.node_id}:${node.body}`),
        node.summary ?? null,
        CURRENT_INDEX_VERSION
      );
    }

    for (const edge of input.edges ?? []) {
      db.prepare(
        `
          INSERT INTO edges (
            source_node_id,
            target_node_id,
            target_unresolved_ref,
            edge_type
          ) VALUES (?, ?, ?, ?)
        `
      ).run(
        edge.source_node_id,
        edge.target_node_id ?? null,
        edge.target_unresolved_ref ?? null,
        edge.edge_type
      );
    }

    for (const entity of input.entities ?? []) {
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
        entity.entity_id,
        entity.world_slug,
        entity.canonical_name,
        entity.entity_kind ?? null,
        entity.provenance_scope ?? "world",
        entity.authority_level ?? "structured_anchor",
        entity.source_node_id,
        entity.source_field ?? null
      );
    }

    for (const alias of input.aliases ?? []) {
      db.prepare(
        `
          INSERT INTO entity_aliases (
            entity_id,
            alias_text,
            alias_kind,
            source_node_id
          ) VALUES (?, ?, ?, ?)
        `
      ).run(
        alias.entity_id,
        alias.alias_text,
        alias.alias_kind ?? "exact_structured",
        alias.source_node_id
      );
    }

    for (const mention of input.mentions ?? []) {
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
      ).run(
        mention.node_id,
        mention.surface_text,
        mention.resolved_entity_id ?? null,
        mention.resolution_kind ?? (mention.resolved_entity_id ? "canonical" : "unresolved"),
        mention.extraction_method ?? (mention.resolved_entity_id ? "exact_canonical" : "heuristic_phrase")
      );
    }

    for (const anchor of input.anchors ?? []) {
      db.prepare(
        `
          INSERT INTO anchor_checksums (
            node_id,
            anchor_form,
            checksum
          ) VALUES (?, ?, ?)
        `
      ).run(anchor.node_id, anchor.anchor_form, anchor.checksum ?? hashValue(anchor.anchor_form));
    }

    for (const result of input.validationResults ?? []) {
      db.prepare(
        `
          INSERT INTO validation_results (
            world_slug,
            validator_name,
            severity,
            code,
            message,
            node_id,
            file_path,
            line_range_start,
            line_range_end,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        result.world_slug,
        result.validator_name,
        result.severity,
        result.code,
        result.message,
        result.node_id ?? null,
        result.file_path ?? null,
        result.line_range_start ?? null,
        result.line_range_end ?? null,
        result.created_at ?? "2026-04-23T00:00:00Z"
      );
    }
  } finally {
    db.close();
  }
}
