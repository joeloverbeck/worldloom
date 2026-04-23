#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$PACKAGE_ROOT/../.." && pwd)"
WORLD_SLUG="animalia"

cd "$PACKAGE_ROOT"
npm run build

cd "$REPO_ROOT"
node tools/world-index/dist/src/cli.js build "$WORLD_SLUG"
node tools/world-index/dist/src/cli.js verify "$WORLD_SLUG"

cd "$PACKAGE_ROOT"
REPO_ROOT="$REPO_ROOT" WORLD_SLUG="$WORLD_SLUG" node <<'EOF'
const assert = require("node:assert/strict");
const path = require("node:path");
const Database = require("better-sqlite3");

const repoRoot = process.env.REPO_ROOT;
const worldSlug = process.env.WORLD_SLUG;
const dbPath = path.join(repoRoot, "worlds", worldSlug, "_index", "world.db");
const db = new Database(dbPath, { readonly: true });

const REQUIRED_TABLES = ["entities", "entity_aliases", "entity_mentions"];
const REQUIRED_INDEXES = [
  "idx_entities_name",
  "idx_entities_scope",
  "idx_entity_alias_unique",
  "idx_entity_alias_text",
  "idx_entity_mentions_surface",
  "idx_entity_mentions_resolved"
];
const REQUIRED_COLUMNS = {
  entities: [
    "entity_id",
    "world_slug",
    "canonical_name",
    "entity_kind",
    "provenance_scope",
    "authority_level",
    "source_node_id",
    "source_field"
  ],
  entity_aliases: ["alias_id", "entity_id", "alias_text", "alias_kind", "source_node_id"],
  entity_mentions: [
    "mention_id",
    "node_id",
    "surface_text",
    "resolved_entity_id",
    "resolution_kind",
    "extraction_method"
  ]
};
const BANNED_CANONICALS = [
  "Mystery Reserve",
  "Continuity Archivist",
  "Mystery Curator",
  "Canon Safety Check Trace",
  "Change Log Entry",
  "Primary Difference",
  "Primary Rule",
  "Natural Story Engines",
  "Distribution Discipline",
  "Repairs Applied",
  "Truth Check",
  "World Laundering",
  "Trade Flows",
  "Inequality Patterns",
  "Ruin Ownership",
  "Breakage Point",
  "Tier Finder",
  "Fee Wage Schedule",
  "Count Specifics",
  "Age Linguistic Recovery",
  "Career Contractor Pension",
  "Both Subsection",
  "Attempt Sub",
  "Candidate Log",
  "Captain Cycles",
  "Breakage Points",
  "Regional Asymmetry",
  "Value Stores",
  "In Brinewick",
  "An Ash",
  "Per Phase",
  "Required Updates",
  "No Silent Retcons",
  "A canon fact may attach to multiple categories (a ward-breach event is both event and hazard; a chartered guild is both institution and faction in some polities).",
  "Mythical-species sentients are species, not artifact, even though M-5 (Mystery Reserve) entertains the heretical possibility otherwise. The category attachment reflects what the world treats as true; mystery entries hold the disquieting alternatives.",
  "The magic practice category is intentionally narrow in Animalia — there is no spellcraft. All entries here are artifact-handling practices.",
  "Artifact-mutated non-sentient beasts attach to hazard + species (non-sentient fauna sub-category) + optionally local_anomaly (for specific named zones) + historical_process (for the centuries-accumulated phenomenon). They do NOT attach to `person`, `faction`, or any sentient-entity category. They are categorically DISTINCT from Cluster D mythic-species sentient folk (DIS-3) and from Maker-Age guardian constructions (CF-0029; distinct-origin firewall). The surface-similar appearance (chimeric / anomalous morphology) must not collapse the taxonomy.",
  "Mundane-tier Maker-Age artifacts attach to artifact (mundane-subclass) + resource_distribution + hazard (low-tier CAU-1 cost). NOT a new distribution tier — explicit naming of DIS-1 \"most inert junk\" band. Attach to daily_routine for ordinary-life encounter contexts.",
  "Ash-Seal commercial-company Brinewick anomaly",
  "Maker-Age artifact destruction-resistance"
];
const KEPT_CANONICALS = [
  "Vespera Nightwhisper",
  "Atreia Selviss",
  "A Season on the Circuit: Dispatches from Vespera Nightwhisper",
  "After-Action Report on the Harrowgate Contract"
];
const NONCANONICAL_EVIDENCE = ["Melissa Threadscar", "Charter Hall", "Copper Weir", "Bent Willow"];

function count(sql, ...args) {
  return db.prepare(sql).get(...args).count;
}

function columnNames(tableName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().map((row) => row.name);
}

function mysteryReserveTitles() {
  return db
    .prepare(
      `
        SELECT heading_path
        FROM nodes
        WHERE world_slug = ?
          AND node_type = 'mystery_reserve_entry'
        ORDER BY heading_path
      `
    )
    .all(worldSlug)
    .map((row) => row.heading_path)
    .filter(Boolean)
    .map((headingPath) => headingPath.split(" > ").pop());
}

const tables = db
  .prepare(
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `
  )
  .all()
  .map((row) => row.name);

const indexes = db
  .prepare(
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'index'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `
  )
  .all()
  .map((row) => row.name);

const columns = Object.fromEntries(
  Object.keys(REQUIRED_COLUMNS).map((tableName) => [tableName, columnNames(tableName)])
);

const bannedCanonicals = Object.fromEntries(
  BANNED_CANONICALS.map((name) => [
    name,
    count("SELECT COUNT(*) AS count FROM entities WHERE world_slug = ? AND canonical_name = ?", worldSlug, name)
  ])
);

const keptCanonicals = Object.fromEntries(
  KEPT_CANONICALS.map((name) => [
    name,
    count(
      "SELECT COUNT(*) AS count FROM entities WHERE world_slug = ? AND canonical_name = ?",
      worldSlug,
      name
    )
  ])
);

const noncanonicalEvidence = Object.fromEntries(
  NONCANONICAL_EVIDENCE.map((name) => [
    name,
    {
      unresolved_mentions: count(
        `
          SELECT COUNT(*) AS count
          FROM entity_mentions
          WHERE surface_text = ?
            AND resolution_kind = 'unresolved'
            AND extraction_method = 'heuristic_phrase'
        `,
        name
      ),
      canonical_entities: count(
        "SELECT COUNT(*) AS count FROM entities WHERE world_slug = ? AND canonical_name = ?",
        worldSlug,
        name
      ),
      mentions_entity_edges: count(
        `
          SELECT COUNT(*) AS count
          FROM edges e
          INNER JOIN entities ent ON ent.entity_id = e.target_node_id
          WHERE e.edge_type = 'mentions_entity'
            AND ent.world_slug = ?
            AND ent.canonical_name = ?
        `,
        worldSlug,
        name
      )
    }
  ])
);

const reserveTitles = mysteryReserveTitles();
const mysteryReserveFirewall = Object.fromEntries(
  reserveTitles.map((title) => [
    title,
    count(
      "SELECT COUNT(*) AS count FROM entities WHERE world_slug = ? AND canonical_name = ?",
      worldSlug,
      title
    )
  ])
);

const integrity = {
  validation_results: count("SELECT COUNT(*) AS count FROM validation_results WHERE world_slug = ?", worldSlug),
  malformed_authority_source: count(
    "SELECT COUNT(*) AS count FROM validation_results WHERE world_slug = ? AND code = 'malformed_authority_source'",
    worldSlug
  ),
  unresolved_edges: count("SELECT COUNT(*) AS count FROM edges WHERE target_unresolved_ref IS NOT NULL"),
  dangling_entity_mentions: count(
    `
      SELECT COUNT(*) AS count
      FROM entity_mentions em
      LEFT JOIN nodes n ON n.node_id = em.node_id
      WHERE n.node_id IS NULL
    `
  ),
  dangling_edge_sources: count(
    `
      SELECT COUNT(*) AS count
      FROM edges e
      LEFT JOIN nodes n ON n.node_id = e.source_node_id
      WHERE n.node_id IS NULL
    `
  ),
  dangling_edge_targets: count(
    `
      SELECT COUNT(*) AS count
      FROM edges e
      LEFT JOIN nodes n ON n.node_id = e.target_node_id
      WHERE e.target_node_id IS NOT NULL
        AND n.node_id IS NULL
    `
  )
};

const report = {
  world_slug: worldSlug,
  db_path: dbPath,
  tables,
  indexes,
  columns,
  banned_canonicals: bannedCanonicals,
  kept_canonicals: keptCanonicals,
  noncanonical_evidence: noncanonicalEvidence,
  mystery_reserve_titles: reserveTitles,
  mystery_reserve_firewall: mysteryReserveFirewall,
  integrity
};

const failures = [];

for (const tableName of REQUIRED_TABLES) {
  if (!tables.includes(tableName)) {
    failures.push(`missing required table: ${tableName}`);
  }
}

for (const indexName of REQUIRED_INDEXES) {
  if (!indexes.includes(indexName)) {
    failures.push(`missing required index: ${indexName}`);
  }
}

for (const [tableName, requiredColumns] of Object.entries(REQUIRED_COLUMNS)) {
  const actualColumns = new Set(columns[tableName] ?? []);
  for (const requiredColumn of requiredColumns) {
    if (!actualColumns.has(requiredColumn)) {
      failures.push(`missing required column ${tableName}.${requiredColumn}`);
    }
  }
}

for (const [name, entityCount] of Object.entries(bannedCanonicals)) {
  if (entityCount !== 0) {
    failures.push(`banned canonical persisted: ${name} (${entityCount})`);
  }
}

for (const [name, entityCount] of Object.entries(keptCanonicals)) {
  if (entityCount < 1) {
    failures.push(`expected canonical anchor missing: ${name}`);
  }
}

for (const [name, evidence] of Object.entries(noncanonicalEvidence)) {
  if (evidence.unresolved_mentions < 1) {
    failures.push(`expected unresolved evidence missing: ${name}`);
  }
  if (evidence.canonical_entities !== 0) {
    failures.push(`unexpected canonical entity for unresolved phrase: ${name} (${evidence.canonical_entities})`);
  }
  if (evidence.mentions_entity_edges !== 0) {
    failures.push(`unexpected mentions_entity edge for unresolved phrase: ${name} (${evidence.mentions_entity_edges})`);
  }
}

for (const [title, entityCount] of Object.entries(mysteryReserveFirewall)) {
  if (entityCount !== 0) {
    failures.push(`mystery reserve title promoted to canonical entity: ${title} (${entityCount})`);
  }
}

for (const [name, value] of Object.entries(integrity)) {
  if (name === "malformed_authority_source") {
    if (value !== 1) {
      failures.push(`expected exactly one malformed authority-source warning, found ${value}`);
    }
    continue;
  }

  if (name === "validation_results") {
    if (value !== integrity.malformed_authority_source) {
      failures.push(
        `integrity check failed for validation_results: ${value} total rows vs ${integrity.malformed_authority_source} expected malformed-authority rows`
      );
    }
    continue;
  }

  if (value !== 0) {
    failures.push(`integrity check failed for ${name}: ${value}`);
  }
}

process.stdout.write(`${JSON.stringify({ ...report, failures }, null, 2)}\n`);

db.close();

if (failures.length > 0) {
  process.stderr.write(`SPEC-10 verification failed:\n- ${failures.join("\n- ")}\n`);
  process.exit(1);
}
EOF
