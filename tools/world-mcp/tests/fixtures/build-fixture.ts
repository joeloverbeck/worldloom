import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { CURRENT_INDEX_VERSION } from "@worldloom/world-index/public/types";

import { createTempRepoRoot, seedWorld } from "../tools/_shared";

export const SPEC02_FIXTURE_WORLD = "seeded";
export const SPEC02_MULTI_WORLD_A = "seeded-a";
export const SPEC02_MULTI_WORLD_B = "seeded-b";
export const SPEC02_FIXTURE_SEED_NODE = "CF-0001";
export const SPEC02_FIXTURE_WEIGHTED_ONLY_NODE = "seeded:OPEN_QUESTIONS.md:Brinewick Rumor:0";
export const SPEC02_FIXTURE_SUMMARY_NULL_NODE = "seeded:GEOGRAPHY.md:Salt Quay:0";

function hashValue(source: string): string {
  return createHash("sha256").update(source.normalize("NFC"), "utf8").digest("hex");
}

function longParagraph(label: string, repeats: number): string {
  return Array.from({ length: repeats }, (_, index) => `${label} detail ${index + 1}.`).join(" ");
}

function appendTrackedFileVersion(
  root: string,
  worldSlug: string,
  filePath: string,
  contentHash: string,
  lastIndexedAt: string
): void {
  const dbPath = path.join(root, "worlds", worldSlug, "_index", "world.db");
  const db = new Database(dbPath);

  try {
    db.prepare(
      `
        INSERT OR REPLACE INTO file_versions (
          world_slug,
          file_path,
          content_hash,
          last_indexed_at
        ) VALUES (?, ?, ?, ?)
      `
    ).run(worldSlug, filePath, contentHash, lastIndexedAt);
  } finally {
    db.close();
  }
}

function writeBaselineOnlyFiles(root: string, worldSlug: string): string[] {
  const worldRoot = path.join(root, "worlds", worldSlug);
  const files = [
    "WORLD_KERNEL.md",
    "INVARIANTS.md",
    "ONTOLOGY.md",
    "TIMELINE.md",
    "GEOGRAPHY.md",
    "PEOPLES_AND_SPECIES.md",
    "INSTITUTIONS.md",
    "ECONOMY_AND_RESOURCES.md",
    "MAGIC_OR_TECH_SYSTEMS.md",
    "EVERYDAY_LIFE.md",
    "OPEN_QUESTIONS.md",
    "MYSTERY_RESERVE.md"
  ];

  for (const filePath of files) {
    const absolutePath = path.join(worldRoot, filePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    const title = filePath.replace(/\.md$/, "");
    writeFileSync(
      absolutePath,
      `# ${title}\n\n${longParagraph(title, 60)}\n`,
      "utf8"
    );
  }

  return files;
}

export function createSpec02FixtureRoot(): string {
  return createTempRepoRoot();
}

export function buildSpec02Fixture(root: string, worldSlug = SPEC02_FIXTURE_WORLD): {
  worldSlug: string;
  seedNodeId: string;
  weightedOnlyNodeId: string;
  summaryNullNodeId: string;
  eagerLoadFiles: string[];
} {
  seedWorld(root, {
    worldSlug,
    nodes: [
      {
        node_id: `${worldSlug}:WORLD_KERNEL.md:Kernel:0`,
        world_slug: worldSlug,
        file_path: "WORLD_KERNEL.md",
        heading_path: "Kernel",
        node_type: "section",
        body: "The world is a tide-locked archipelago ruled by scarce fresh water."
      },
      {
        node_id: `${worldSlug}:INVARIANTS.md:Freshwater Rationing:0`,
        world_slug: worldSlug,
        file_path: "INVARIANTS.md",
        heading_path: "Freshwater Rationing",
        node_type: "invariant",
        body: "Fresh water is rationed by harbor institutions."
      },
      {
        node_id: SPEC02_FIXTURE_SEED_NODE,
        world_slug: worldSlug,
        file_path: "CANON_LEDGER.md",
        heading_path: "CF-0001",
        node_type: "canon_fact_record",
        body: "Brinewick maintains the northern lighthouse and rations fresh water to harbor crews."
      },
      {
        node_id: "entity:brinewick",
        world_slug: worldSlug,
        file_path: "GEOGRAPHY.md",
        heading_path: "Brinewick Entity",
        node_type: "named_entity",
        body: "Entity anchor for Brinewick."
      },
      {
        node_id: `${worldSlug}:GEOGRAPHY.md:Brinewick:0`,
        world_slug: worldSlug,
        file_path: "GEOGRAPHY.md",
        heading_path: "Brinewick",
        node_type: "section",
        body: "Brinewick is the northern salt-port city that guards the lighthouse channel."
      },
      {
        node_id: SPEC02_FIXTURE_SUMMARY_NULL_NODE,
        world_slug: worldSlug,
        file_path: "GEOGRAPHY.md",
        heading_path: "Salt Quay",
        node_type: "section",
        body: "Salt Quay serves Brinewick's harbor crews with casks, rope, and night-ferries.",
        summary: null
      },
      {
        node_id: SPEC02_FIXTURE_WEIGHTED_ONLY_NODE,
        world_slug: worldSlug,
        file_path: "OPEN_QUESTIONS.md",
        heading_path: "Brinewick Rumor",
        node_type: "section",
        body: "Rumor says Brinewick hears bells in fog, but the report is unresolved and unlinked."
      },
      {
        node_id: "M-1",
        world_slug: worldSlug,
        file_path: "MYSTERY_RESERVE.md",
        heading_path: "M-1",
        node_type: "mystery_reserve_entry",
        body: "No canon source explains who rings the drowned bell under Brinewick."
      }
    ],
    edges: [
      {
        source_node_id: SPEC02_FIXTURE_SEED_NODE,
        target_node_id: `${worldSlug}:GEOGRAPHY.md:Brinewick:0`,
        edge_type: "required_world_update"
      },
      {
        source_node_id: SPEC02_FIXTURE_SEED_NODE,
        target_node_id: "entity:brinewick",
        edge_type: "mentions_entity"
      },
      {
        source_node_id: `${worldSlug}:GEOGRAPHY.md:Brinewick:0`,
        target_node_id: "entity:brinewick",
        edge_type: "mentions_entity"
      },
      {
        source_node_id: "M-1",
        target_node_id: SPEC02_FIXTURE_SEED_NODE,
        edge_type: "firewall_for"
      }
    ],
    entities: [
      {
        entity_id: "entity:brinewick",
        world_slug: worldSlug,
        canonical_name: "Brinewick",
        entity_kind: "place",
        source_node_id: `${worldSlug}:GEOGRAPHY.md:Brinewick:0`
      }
    ],
    aliases: [
      {
        entity_id: "entity:brinewick",
        alias_text: "North Salt Port",
        source_node_id: `${worldSlug}:GEOGRAPHY.md:Brinewick:0`
      }
    ],
    mentions: [
      {
        node_id: SPEC02_FIXTURE_SEED_NODE,
        surface_text: "Brinewick",
        resolved_entity_id: "entity:brinewick"
      },
      {
        node_id: `${worldSlug}:GEOGRAPHY.md:Brinewick:0`,
        surface_text: "Brinewick",
        resolved_entity_id: "entity:brinewick"
      },
      {
        node_id: SPEC02_FIXTURE_WEIGHTED_ONLY_NODE,
        surface_text: "Brinewick"
      }
    ],
    validationResults: [
      {
        world_slug: worldSlug,
        validator_name: "rule-7-firewall",
        severity: "warn",
        code: "mr-firewall-review",
        message: "Mystery Reserve firewall requires review before canon mutation.",
        node_id: SPEC02_FIXTURE_SEED_NODE,
        file_path: "MYSTERY_RESERVE.md"
      }
    ]
  });

  return {
    worldSlug,
    seedNodeId: SPEC02_FIXTURE_SEED_NODE,
    weightedOnlyNodeId: SPEC02_FIXTURE_WEIGHTED_ONLY_NODE,
    summaryNullNodeId: SPEC02_FIXTURE_SUMMARY_NULL_NODE,
    eagerLoadFiles: writeBaselineOnlyFiles(root, worldSlug)
  };
}

export function buildSpec02MultiWorldFixture(root: string): {
  worldA: string;
  worldB: string;
} {
  buildSpec02Fixture(root, SPEC02_MULTI_WORLD_A);
  buildSpec02Fixture(root, SPEC02_MULTI_WORLD_B);

  const worldBRoot = path.join(root, "worlds", SPEC02_MULTI_WORLD_B);
  writeFileSync(
    path.join(worldBRoot, "GEOGRAPHY.md"),
    "# GEOGRAPHY\n\nBlackreef is a basalt harbor with no lighthouse.\n",
    "utf8"
  );

  const db = new Database(path.join(worldBRoot, "_index", "world.db"));
  try {
    db.prepare("UPDATE nodes SET body = ?, heading_path = ? WHERE node_id = ?").run(
      "Blackreef is the basalt harbor for the southern reefs.",
      "Blackreef",
      `${SPEC02_MULTI_WORLD_B}:GEOGRAPHY.md:Brinewick:0`
    );
    db.prepare("UPDATE nodes SET body = ? WHERE node_id = ?").run(
      "Blackreef maintains the southern breakwater and basalt signal fires.",
      SPEC02_FIXTURE_SEED_NODE
    );
    db.prepare("UPDATE entities SET canonical_name = ? WHERE entity_id = ?").run(
      "Blackreef",
      "entity:brinewick"
    );
    db.prepare("UPDATE entity_aliases SET alias_text = ? WHERE entity_id = ?").run(
      "South Reef Port",
      "entity:brinewick"
    );
    db.prepare("UPDATE entity_mentions SET surface_text = ? WHERE node_id = ?").run(
      "Blackreef",
      SPEC02_FIXTURE_SEED_NODE
    );
    db.prepare("UPDATE entity_mentions SET surface_text = ? WHERE node_id = ?").run(
      "Blackreef",
      `${SPEC02_MULTI_WORLD_B}:GEOGRAPHY.md:Brinewick:0`
    );
  } finally {
    db.close();
  }

  return {
    worldA: SPEC02_MULTI_WORLD_A,
    worldB: SPEC02_MULTI_WORLD_B
  };
}

export function buildEmptyWorldFixture(root: string, worldSlug: string): void {
  const worldRoot = path.join(root, "worlds", worldSlug, "_index");
  mkdirSync(worldRoot, { recursive: true });
  writeFileSync(path.join(worldRoot, "index_version.txt"), `${CURRENT_INDEX_VERSION}\n`, "utf8");

  const migrationPath = path.join(
    path.resolve(__dirname, "..", "..", "..", "..", ".."),
    "tools",
    "world-index",
    "src",
    "schema",
    "migrations",
    "001_initial.sql"
  );
  const db = new Database(path.join(worldRoot, "world.db"));
  try {
    db.exec(readFileSync(migrationPath, "utf8"));
  } finally {
    db.close();
  }
}

export function buildVersionMismatchFixture(root: string, worldSlug: string, version = "999"): void {
  const worldRoot = path.join(root, "worlds", worldSlug, "_index");
  mkdirSync(worldRoot, { recursive: true });
  writeFileSync(path.join(worldRoot, "index_version.txt"), `${version}\n`, "utf8");
  const db = new Database(path.join(worldRoot, "world.db"));
  db.close();
}

export function buildDriftedWorldFixture(root: string, worldSlug: string): string {
  buildSpec02Fixture(root, worldSlug);
  const driftedFile = "INVARIANTS.md";
  const absolutePath = path.join(root, "worlds", worldSlug, driftedFile);
  writeFileSync(absolutePath, "Current invariants file diverged after indexing.\n", "utf8");
  appendTrackedFileVersion(
    root,
    worldSlug,
    driftedFile,
    hashValue("Indexed invariants snapshot.\n"),
    "2026-01-01T00:00:00.000Z"
  );
  utimesSync(absolutePath, new Date("2026-02-01T00:00:00.000Z"), new Date("2026-02-01T00:00:00.000Z"));
  return driftedFile;
}
