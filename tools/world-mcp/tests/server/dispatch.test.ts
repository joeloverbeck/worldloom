import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { computePgStateHash, computePlanHash, OPERATION_KINDS } from "../../src/package-interop.js";

import { TASK_TYPES } from "../../src/ranking/profiles/index.js";
import { createServer, ID_CLASSES } from "../../src/server.js";
import { MCP_TOOL_NAMES } from "../../src/tool-names.js";
import { VOCABULARY_CLASSES } from "../../src/tools/get-canonical-vocabulary.js";
import { SUPPORTED_RECORD_SCHEMA_NODE_TYPES } from "../../src/tools/get-record-schema.js";
import { SUPPORTED_LIST_RECORD_TYPES } from "../../src/tools/list-records.js";
import { createTempRepoRoot, destroyTempRepoRoot, seedWorld } from "../tools/_shared.js";

function textContent(result: any): string {
  const content = result.content as Array<{ type: string; text?: string }>;
  return content[0]?.type === "text" ? (content[0].text ?? "") : "";
}

function buildValidPatchPlan() {
  return {
    plan_id: "plan-001",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "canon-addition",
    expected_id_allocations: {},
    patches: [
      {
        op: "insert_before_node",
        target_world: "seeded",
        target_file: "GEOGRAPHY.md",
        payload: { body: "Brinewick expands." }
      }
    ]
  };
}

function buildKnownBadCausalDependencyPlan() {
  return {
    plan_id: "plan-known-bad-causal-dependency",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "branching-story-turn-cycle",
    expected_id_allocations: {},
    patches: [
      storyPatch("create_stobj_record", "objects", {
        id: "STOBJ-1",
        story_id: "STORY-1",
        created_at_page: "PG-1",
        label: "Locked gate"
      }),
      storyPatch("create_chc_record", "choices", {
        id: "CHC-1",
        story_id: "STORY-1",
        created_at_page: "PG-1",
        label: "Force the locked gate",
        grounded_in: { records: ["STOBJ-1"] }
      }),
      storyPatch("create_se_record", "events", {
        id: "SE-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        parent_page_id: "PG-1",
        event_kind: "selected_choice",
        actor: "STENT-1",
        commitment: { selected_slt_id: "SLT-1", selection_source: "emitted_choice", alias_bindings: {} },
        outcome_route: "accept",
        world_logic_rationale: "The selected choice closes the object it still depends on.",
        state_delta: {
          create: [],
          supersede: [],
          close: ["STOBJ-1"]
        },
        promotion_claims: []
      }),
      storyPatch("create_pg_record", "pages", {
        id: "PG-2",
        story_id: "STORY-1",
        parent_page_id: "PG-1",
        input: { choice_id: "CHC-1", manual_action_text: null, resolved_event_id: "SE-1" },
        emitted_choices: [],
        state_snapshot: {
          active_records: { CHC: ["CHC-1"] },
          visible_affordances: []
        }
      })
    ]
  };
}

function buildKnownBadExpectedWitnessPlan() {
  return {
    plan_id: "plan-known-bad-expected-witness",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "branching-story-turn-cycle",
    expected_id_allocations: {},
    patches: [
      storyPatch("create_stent_record", "entities", {
        id: "STENT-1",
        story_id: "STORY-1",
        label: "Actor"
      }),
      storyPatch("create_stent_record", "entities", {
        id: "STENT-2",
        story_id: "STORY-1",
        label: "Witness"
      }),
      storyPatch("create_stloc_record", "locations", {
        id: "STLOC-1",
        story_id: "STORY-1",
        label: "Market square",
        description: "A public location."
      }),
      storyPatch("create_ststat_record", "status", {
        id: "STSTAT-1",
        story_id: "STORY-1",
        entity: "STENT-1",
        life: "alive",
        agency: "free",
        location: "STLOC-1"
      }),
      storyPatch("create_ststat_record", "status", {
        id: "STSTAT-2",
        story_id: "STORY-1",
        entity: "STENT-2",
        life: "alive",
        agency: "free",
        location: "STLOC-1"
      }),
      storyPatch("create_pg_record", "pages", {
        id: "PG-1",
        story_id: "STORY-1",
        input: { choice_id: null, manual_action_text: null, resolved_event_id: null },
        emitted_choices: [],
        state_snapshot: {
          active_records: { STSTAT: ["STSTAT-1", "STSTAT-2"] },
          visible_affordances: []
        }
      }),
      storyPatch("append_story_diegetic_artifact_record", "artifacts", {
        id: "DA-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        title: "Public notice",
        author: "STENT-1",
        genre: "notice",
        body: "A public notice.",
        intended_audience: "public",
        circulation: "public",
        truth_relation: "true"
      }),
      storyPatch("create_se_record", "events", {
        id: "SE-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        parent_page_id: "PG-1",
        event_kind: "selected_choice",
        actor: "STENT-1",
        commitment: { selected_slt_id: "SLT-1", selection_source: "emitted_choice", alias_bindings: {} },
        outcome_route: "accept",
        world_logic_rationale: "The event is public.",
        state_delta: {
          create: ["DA-1"],
          supersede: [],
          close: []
        },
        promotion_claims: []
      })
    ]
  };
}

function storyPatch(op: string, sourceDir: string, record: Record<string, unknown>) {
  return {
    op,
    target_world: "seeded",
    target_file: `stories/dispatch-smoke/_source/${sourceDir}/${String(record.id)}.yaml`,
    payload: {
      story_slug: "dispatch-smoke",
      record
    }
  };
}

function seedServerWorld(root: string): void {
  const planBody = "Seeded prose plan bytes.\n";
  const planHash = computePlanHash(Buffer.from(planBody, "utf8"));
  const pgRecord = {
    id: "PG-3",
    story_id: "STORY-3",
    branch_id: "BR-1",
    parent_page_id: null,
    branch_path: ["PG-3"],
    turn_index: 3,
    input: { choice_id: null, manual_action_text: null, resolved_event_id: null },
    plan: { plan_hash: planHash },
    emitted_choices: [],
    state_snapshot: {
      active_records: { BEL: ["BEL-1"] },
      visible_affordances: []
    }
  };
  const pgBody = [
    "id: PG-3",
    "story_id: STORY-3",
    "branch_id: BR-1",
    "parent_page_id: null",
    "branch_path:",
    "  - PG-3",
    "turn_index: 3",
    "input:",
    "  choice_id: null",
    "  manual_action_text: null",
    "  resolved_event_id: null",
    "plan:",
    `  plan_hash: ${planHash}`,
    "emitted_choices: []",
    "state_snapshot:",
    "  active_records:",
    "    BEL:",
    "      - BEL-1",
    "  visible_affordances: []",
    `state_hash: ${computePgStateHash(pgRecord)}`,
    ""
  ].join("\n");

  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
        world_slug: "seeded",
        file_path: "WORLD_KERNEL.md",
        heading_path: "Kernel",
        node_type: "section",
        body: "Kernel overview."
      },
      {
        node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Brinewick",
        node_type: "section",
        body: "Brinewick is a salt-port city."
      },
      {
        node_id: "entity:brinewick",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Brinewick Entity",
        node_type: "named_entity",
        body: "Entity anchor for Brinewick."
      },
      {
        node_id: "CF-0001",
        world_slug: "seeded",
        file_path: "_source/canon/CF-0001.yaml",
        heading_path: "CF-0001",
        node_type: "canon_fact_record",
        body: [
          "id: CF-0001",
          "title: Brinewick Lighthouse",
          "status: hard_canon",
          "type: geography",
          "statement: Brinewick maintains the northern lighthouse.",
          "scope:",
          "  geographic: regional",
          "  temporal: current",
          "  social: public",
          "truth_scope:",
          "  world_level: true",
          "  diegetic_status: objective",
          "domains_affected:",
          "  - geography",
          "required_world_updates:",
          "  - GEOGRAPHY.md",
          "source_basis:",
          "  direct_user_approval: true",
          ""
        ].join("\n")
      },
      {
        node_id: "SEC-GEO-001",
        world_slug: "seeded",
        file_path: "_source/geography/SEC-GEO-001.yaml",
        heading_path: "SEC-GEO-001",
        node_type: "section",
        body: [
          "id: SEC-GEO-001",
          "file_class: GEOGRAPHY",
          "order: 1",
          "heading: Brinewick",
          "heading_level: 2",
          "body: Brinewick is a salt-port city.",
          "touched_by_cf:",
          "  - CF-0001",
          "extensions: []",
          ""
        ].join("\n")
      },
      {
        node_id: "M-1",
        world_slug: "seeded",
        file_path: "MYSTERY_RESERVE.md",
        heading_path: "M-1",
        node_type: "mystery_reserve_entry",
        body: "The drowned bell has an unknown caller."
      },
      {
        node_id: "DA-0002",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/brinewick-harbor-letter.md",
        node_type: "diegetic_artifact_record",
        body: [
          "---",
          "artifact_id: DA-0002",
          "slug: brinewick-harbor-letter",
          "title: Brinewick Harbor Letter",
          "---",
          "# Brinewick Harbor Letter",
          "",
          "## Body",
          "",
          "The harbor letter names Brinewick.",
          ""
        ].join("\n")
      },
      {
        node_id: "opening-bells:BEL-1",
        world_slug: "seeded",
        story_slug: "opening-bells",
        file_path: "stories/opening-bells/_source/beliefs/BEL-1.yaml",
        heading_path: "BEL-1",
        node_type: "belief_record",
        body: [
          "id: BEL-1",
          "story_id: STORY-0003",
          "created_at_page: PG-0003",
          "supersedes: null",
          "holder: STENT-1",
          "claim: The lighthouse bell is a warning.",
          "belief_mode: believes",
          "truth_relation: unknown",
          "confidence: likely",
          "visibility: shared",
          "basis:",
          "  source_event: SE-1",
          ""
        ].join("\n")
      },
      {
        node_id: "opening-bells:SCN-1",
        world_slug: "seeded",
        story_slug: "opening-bells",
        file_path: "stories/opening-bells/_source/scenes/SCN-1.yaml",
        heading_path: "SCN-1",
        node_type: "scene_record",
        body: [
          "id: SCN-1",
          "story_id: STORY-0003",
          "branch_id: BR-1",
          "supersedes: null",
          "pg_ids:",
          "  - PG-3",
          "start_page_id: PG-3",
          "end_page_id: PG-3",
          "previous_scene_id: null",
          "choice_surface_page_id: PG-3",
          "emitted_choice_ids:",
          "  - CHC-1",
          "title: Opening Bell Scene",
          "slug: opening-bell-scene",
          "scene_descriptor: The warning bell rings at the lighthouse.",
          "boundary_rationale: One location and one continuous exchange.",
          "prose_plan_path: scene-prose-plans/SCN-1.md",
          "prose_path: scene-prose/SCN-1.md",
          "receipt_path: scene-prose-receipts/SCN-1.yaml",
          ""
        ].join("\n")
      },
      {
        node_id: "opening-bells:PG-3",
        world_slug: "seeded",
        story_slug: "opening-bells",
        file_path: "stories/opening-bells/_source/pages/PG-3.yaml",
        heading_path: "PG-3",
        node_type: "page_record",
        body: pgBody
      }
    ],
    edges: [
      {
        source_node_id: "CF-0001",
        target_node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        edge_type: "required_world_update"
      },
      {
        source_node_id: "CF-0001",
        target_node_id: "entity:brinewick",
        edge_type: "mentions_entity"
      },
      {
        source_node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        target_node_id: "entity:brinewick",
        edge_type: "mentions_entity"
      },
      {
        source_node_id: "M-1",
        target_node_id: "CF-0001",
        edge_type: "firewall_for"
      }
    ],
    entities: [
      {
        entity_id: "entity:brinewick",
        world_slug: "seeded",
        canonical_name: "Brinewick",
        entity_kind: "place",
        source_node_id: "seeded:GEOGRAPHY.md:Brinewick:0"
      }
    ],
    aliases: [
      {
        entity_id: "entity:brinewick",
        alias_text: "Salt Port",
        source_node_id: "seeded:GEOGRAPHY.md:Brinewick:0"
      }
    ],
    mentions: [
      {
        node_id: "CF-0001",
        surface_text: "Brinewick",
        resolved_entity_id: "entity:brinewick"
      },
      {
        node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        surface_text: "Brinewick",
        resolved_entity_id: "entity:brinewick"
      }
    ],
    anchors: [
      {
        node_id: "CF-0001",
        anchor_form: "## CF-0001"
      }
    ]
  });

  const pressureEventsDirectory = path.join(root, "worlds", "seeded", "pressure-events");
  mkdirSync(pressureEventsDirectory, { recursive: true });
  writeFileSync(path.join(pressureEventsDirectory, "EPE-0003-salt-riot.md"), "event", "utf8");
  writeFileSync(
    path.join(pressureEventsDirectory, "EPE-0004-salt-riot.proposal.md"),
    "proposal",
    "utf8"
  );

  const storiesDirectory = path.join(root, "worlds", "seeded", "stories", "opening-bells");
  mkdirSync(storiesDirectory, { recursive: true });
  writeFileSync(
    path.join(storiesDirectory, "STORY_KERNEL.md"),
    "---\nstory_id: STORY-0003\n---\n# Opening Bells\n",
    "utf8"
  );
  const pagesDirectory = path.join(storiesDirectory, "_source", "pages");
  mkdirSync(pagesDirectory, { recursive: true });
  writeFileSync(path.join(pagesDirectory, "PG-0003.yaml"), "id: PG-0003\n", "utf8");
  const prosePlansDirectory = path.join(storiesDirectory, "pages-prose-plans");
  mkdirSync(prosePlansDirectory, { recursive: true });
  writeFileSync(path.join(prosePlansDirectory, "PG-3.md"), planBody, "utf8");
  const storyletBatchesDirectory = path.join(storiesDirectory, "storylet-batches");
  mkdirSync(storyletBatchesDirectory, { recursive: true });
  writeFileSync(path.join(storyletBatchesDirectory, "SLB-0003.md"), "# SLB-0003\n", "utf8");
  const auditsDirectory = path.join(storiesDirectory, "audits");
  mkdirSync(auditsDirectory, { recursive: true });
  writeFileSync(path.join(auditsDirectory, "SAU-0003-2026-05-03.md"), "# SAU-0003\n", "utf8");
  const storyPromotionsDirectory = path.join(storiesDirectory, "story-promotions");
  mkdirSync(storyPromotionsDirectory, { recursive: true });
  writeFileSync(path.join(storyPromotionsDirectory, "SP-0003-proposal-package.yaml"), "promotion_id: SP-0003\n", "utf8");
  const remediationDirectory = path.join(auditsDirectory, "SAU-0003", "remediation-storylet-proposals");
  mkdirSync(remediationDirectory, { recursive: true });
  writeFileSync(path.join(remediationDirectory, "RSP-0003-payoff.md"), "# RSP-0003\n", "utf8");

  const toolResultsDirectory = path.join(root, "tool-results");
  mkdirSync(toolResultsDirectory, { recursive: true });
  writeFileSync(
    path.join(toolResultsDirectory, "packet.json"),
    JSON.stringify({ governing_world_context: { nodes: [{ id: "CF-0001" }] } }),
    "utf8"
  );
}

async function withServerClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const root = createTempRepoRoot();
  seedServerWorld(root);

  const originalCwd = process.cwd();
  const originalResultsDir = process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
  process.chdir(path.join(root, "tools", "world-mcp"));
  process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = path.join(root, "tool-results");

  const server = createServer();
  const client = new Client({
    name: "worldloom-server-dispatch-test",
    version: "0.1.0"
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return await run(client);
  } finally {
    await Promise.all([client.close(), server.close()]);
    process.chdir(originalCwd);
    if (originalResultsDir === undefined) {
      delete process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
    } else {
      process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = originalResultsDir;
    }
    destroyTempRepoRoot(root);
  }
}

test("registered tools dispatch with either a success payload or the documented error payload", async () => {
  await withServerClient(async (client) => {
    const calls = [
      {
        name: MCP_TOOL_NAMES.search_nodes,
        args: { query: "Brinewick", filters: { world_slug: "seeded" } },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_node,
        args: { node_id: "CF-0001", world_slug: "seeded" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_record,
        args: { record_id: "CF-0001", world_slug: "seeded" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_records,
        args: { record_ids: ["CF-0001", "SEC-GEO-001"], world_slug: "seeded" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_records_field,
        args: { record_ids: ["CF-0001", "SEC-GEO-001"], field_path: ["touched_by_cf"], world_slug: "seeded" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_story_state_provenance,
        args: { record_id: "BEL-1", world_slug: "seeded", story_slug: "opening-bells" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.verify_pg_state_hash,
        args: { world_slug: "seeded", story_slug: "opening-bells", page_id: "PG-3" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_persisted_packet_slice,
        args: {
          persisted_path: path.join(process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR!, "packet.json"),
          slice_path: "governing_world_context.nodes"
        },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.list_records,
        args: { world_slug: "seeded", record_type: "canon_fact" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_record_field,
        args: { record_id: "SEC-GEO-001", field_path: ["touched_by_cf"], world_slug: "seeded" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_record_schema,
        args: { node_type: "canon_fact_record" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_neighbors,
        args: { node_id: "CF-0001", world_slug: "seeded", depth: 1 },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_context_packet,
        args: { task_type: "canon_addition", world_slug: "seeded", seed_nodes: ["CF-0001"], token_budget: 1200 },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.find_impacted_fragments,
        args: { world_slug: "seeded", node_ids: ["CF-0001"] },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.find_sections_touched_by,
        args: { world_slug: "seeded", cf_id: "CF-0001" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.find_named_entities,
        args: { world_slug: "seeded", names: ["Brinewick"] },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.find_named_entities,
        args: { world_slug: "seeded", names: ["Brinewick"], node_type_filter: ["character_record"] },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.find_edit_anchors,
        args: { world_slug: "seeded", targets: ["CF-0001"] },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.get_canonical_vocabulary,
        args: { class: "domain" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.validate_patch_plan,
        args: { patch_plan: buildValidPatchPlan() },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.submit_patch_plan,
        args: { patch_plan: buildValidPatchPlan(), approval_token: "unused-in-phase-1" },
        expectError: true,
        expectedCode: "envelope_shape_invalid"
      },
      {
        name: MCP_TOOL_NAMES.plan_story_state_maintenance,
        args: {
          world_slug: "seeded",
          story_slug: "opening-bells",
          parent_page_id: "PG-3",
          reason: "Dispatch smoke for review-only maintenance planning.",
          source_ticket: "tickets/MCPENH-068.md",
          operations: [
            {
              action: "create",
              record_type: "choice_record",
              record: {
                story_id: "STORY-1",
                created_at_page: "PG-3",
                surface_label: "Keep moving",
                player_visible_intent: "Use a visible pressure to keep the scene moving.",
                target_or_action_families: ["evade"],
                likely_state_pressure: "Creates a bounded maintenance choice.",
                grounded_in: { records: ["STPLAN-1"] }
              }
            }
          ]
        },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "seeded", id_class: "SEC-GEO" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "seeded", id_class: "EPE" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "seeded", id_class: "STORY" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "seeded", id_class: "PG", story_slug: "opening-bells" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "seeded", id_class: "BEL", story_slug: "opening-bells" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "seeded", id_class: "SLB", story_slug: "opening-bells" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "seeded", id_class: "SAU", story_slug: "opening-bells" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "seeded", id_class: "SP", story_slug: "opening-bells" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: {
          world_slug: "seeded",
          id_class: "RSP",
          story_slug: "opening-bells",
          audit_id: "SAU-0003"
        },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_next_id,
        args: { world_slug: "__pipeline__", id_class: "NWB" },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.allocate_many_ids,
        args: {
          world_slug: "seeded",
          allocations: [
            { id_class: "BEL", story_slug: "opening-bells" },
            { id_class: "BEL", story_slug: "opening-bells" },
            { id_class: "SEC-GEO" }
          ]
        },
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.describe_capabilities,
        args: {},
        expectError: false
      },
      {
        name: MCP_TOOL_NAMES.describe_envelope_schema,
        args: { op_kind: "create_cf_record" },
        expectError: false
      }
    ] as const;

    for (const call of calls) {
      const result = await client.callTool({
        name: call.name,
        arguments: call.args
      });

      assert.ok(Array.isArray(result.content));
      assert.equal(result.content[0]?.type, "text");

      if (call.expectError) {
        assert.equal(result.isError, true);
        const structured = result.structuredContent as { code?: string };
        assert.equal(structured.code, call.expectedCode);
        continue;
      }

      assert.notEqual(result.isError, true, `${call.name} returned error: ${textContent(result)}`);
      assert.ok(result.structuredContent);
    }
  });
});

test("missing required inputs fail at the MCP validation boundary", async () => {
  await withServerClient(async (client) => {
      const invalidCalls = [
      { name: MCP_TOOL_NAMES.search_nodes, args: {} },
      { name: MCP_TOOL_NAMES.get_node, args: {} },
      { name: MCP_TOOL_NAMES.get_record, args: {} },
      { name: MCP_TOOL_NAMES.get_records, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.get_records_field, args: { record_ids: ["CF-0001"], world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.get_story_state_provenance, args: { record_id: "BEL-1", world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.verify_pg_state_hash, args: { world_slug: "seeded", story_slug: "opening-bells" } },
      { name: MCP_TOOL_NAMES.get_persisted_packet_slice, args: { slice_path: "governing_world_context.nodes" } },
      { name: MCP_TOOL_NAMES.list_records, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.get_record_field, args: { record_id: "SEC-GEO-001", world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.get_record_schema, args: {} },
      { name: MCP_TOOL_NAMES.get_neighbors, args: { world_slug: "seeded", depth: 1 } },
      { name: MCP_TOOL_NAMES.get_context_packet, args: { world_slug: "seeded", seed_nodes: ["CF-0001"] } },
      { name: MCP_TOOL_NAMES.find_impacted_fragments, args: { node_ids: ["CF-0001"] } },
      { name: MCP_TOOL_NAMES.find_sections_touched_by, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.find_named_entities, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.find_edit_anchors, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.get_canonical_vocabulary, args: {} },
      { name: MCP_TOOL_NAMES.validate_patch_plan, args: {} },
      { name: MCP_TOOL_NAMES.submit_patch_plan, args: { patch_plan: buildValidPatchPlan() } },
      { name: MCP_TOOL_NAMES.plan_story_state_maintenance, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.allocate_next_id, args: { world_slug: "seeded" } },
      { name: MCP_TOOL_NAMES.allocate_many_ids, args: { world_slug: "seeded" } }
    ] as const;

    for (const invalid of invalidCalls) {
      const result = (await client.callTool({
        name: invalid.name,
        arguments: invalid.args as Record<string, unknown>
      })) as any;

      assert.equal(result.isError, true);
      assert.match(textContent(result), /invalid|required/i);
    }
  });
});

test("legacy story task types fail at the MCP validation boundary", async () => {
  await withServerClient(async (client) => {
    for (const taskType of ["story_page_cycle", "storylet_pool_authoring"]) {
      const result = (await client.callTool({
        name: MCP_TOOL_NAMES.get_context_packet,
        arguments: {
          task_type: taskType,
          world_slug: "seeded",
          story_slug: "opening-bells",
          seed_nodes: ["CF-0001"]
        }
      })) as any;

      assert.equal(result.isError, true);
      assert.match(textContent(result), /invalid/i);
    }
  });
});

test("unsupported id classes fail at the MCP validation boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "NOT_A_CLASS", story_slug: "opening-bells" }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /invalid/i);

    const batchResult = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_many_ids,
      arguments: {
        world_slug: "seeded",
        allocations: [{ id_class: "NOT_A_CLASS", story_slug: "opening-bells" }]
      }
    });

    assert.equal(batchResult.isError, true);
    assert.match(textContent(batchResult), /invalid/i);
  });
});

test("list_records include_full_body dispatches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.list_records,
      arguments: {
        world_slug: "seeded",
        record_type: "canon_fact",
        fields: ["title"],
        include_full_body: true
      }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      records?: Array<{
        record_id?: string;
        content_hash?: string;
        file_path?: string;
        body?: { record_kind?: string; title?: string };
      }>;
    };
    const record = structured.records?.[0];
    assert.equal(record?.record_id, "CF-0001");
    assert.equal(record?.file_path, "_source/canon/CF-0001.yaml");
    assert.equal(typeof record?.content_hash, "string");
    assert.equal(record?.body?.record_kind, "canon_fact");
    assert.equal(record?.body?.title, "Brinewick Lighthouse");
    assert.equal("title" in record!, false);
  });
});

test("list_records accepts hybrid record types through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.list_records,
      arguments: {
        world_slug: "seeded",
        record_type: "diegetic_artifact_record",
        fields: ["record_id", "file_path"]
      }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      records?: Array<{
        record_id?: string;
        file_path?: string;
      }>;
    };
    const record = structured.records?.[0];
    assert.equal(record?.record_id, "DA-0002");
    assert.equal(record?.file_path, "diegetic-artifacts/brinewick-harbor-letter.md");
    assert.deepEqual(Object.keys(record!).sort(), ["file_path", "record_id"]);
  });
});

test("get_record accepts BEL story-bundle ids through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.get_record,
      arguments: {
        world_slug: "seeded",
        story_slug: "opening-bells",
        record_id: "BEL-1"
      }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      record?: { record_kind?: string; id?: string; belief_mode?: string };
      file_path?: string;
    };
    assert.equal(structured.record?.record_kind, "belief_record");
    assert.equal(structured.record?.id, "BEL-1");
    assert.equal(structured.record?.belief_mode, "believes");
    assert.equal(structured.file_path, "stories/opening-bells/_source/beliefs/BEL-1.yaml");
  });
});

test("get_records accepts BEL story-bundle ids through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.get_records,
      arguments: {
        world_slug: "seeded",
        story_slug: "opening-bells",
        record_ids: ["BEL-1"]
      }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      records?: Array<{ found?: boolean; record?: { record?: { record_kind?: string; id?: string } } }>;
    };
    assert.equal(structured.records?.[0]?.found, true);
    assert.equal(structured.records?.[0]?.record?.record?.record_kind, "belief_record");
    assert.equal(structured.records?.[0]?.record?.record?.id, "BEL-1");
  });
});

test("list_records accepts belief_record through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.list_records,
      arguments: {
        world_slug: "seeded",
        story_slug: "opening-bells",
        record_type: "belief_record",
        fields: ["id", "claim", "belief_mode"]
      }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      total?: number;
      records?: Array<{ record_id?: string; id?: string; claim?: string; belief_mode?: string }>;
    };
    assert.equal(structured.total, 1);
    assert.deepEqual(structured.records?.[0], {
      record_id: "BEL-1",
      id: "BEL-1",
      claim: "The lighthouse bell is a warning.",
      belief_mode: "believes"
    });
  });
});

test("list_records accepts scene_record through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.list_records,
      arguments: {
        world_slug: "seeded",
        story_slug: "opening-bells",
        record_type: "scene_record",
        fields: ["id", "title", "choice_surface_page_id"]
      }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      total?: number;
      records?: Array<{ record_id?: string; id?: string; title?: string; choice_surface_page_id?: string }>;
    };
    assert.equal(structured.total, 1);
    assert.deepEqual(structured.records?.[0], {
      record_id: "SCN-1",
      id: "SCN-1",
      title: "Opening Bell Scene",
      choice_surface_page_id: "PG-3"
    });
  });
});

test("list_records filters through the MCP validation and dispatch boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.list_records,
      arguments: {
        world_slug: "seeded",
        record_type: "canon_fact",
        filters: { status: "hard_canon", domains_affected: ["geography", "history"] },
        fields: ["title", "status", "domains_affected"]
      }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      total?: number;
      records?: Array<{
        record_id?: string;
        title?: string;
        status?: string;
        domains_affected?: string[];
      }>;
    };
    assert.equal(structured.total, 1);
    assert.equal(structured.records?.[0]?.record_id, "CF-0001");
    assert.equal(structured.records?.[0]?.title, "Brinewick Lighthouse");
    assert.equal(structured.records?.[0]?.status, "hard_canon");
    assert.deepEqual(structured.records?.[0]?.domains_affected, ["geography"]);
  });
});

test("EPE id_class dispatches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "EPE" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as { next_id?: string };
    assert.equal(structured.next_id, "EPE-4");
  });
});

test("STORY id_class dispatches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "STORY" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as { next_id?: string };
    assert.equal(structured.next_id, "STORY-4");
  });
});

test("story-scoped id_class dispatches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "PG", story_slug: "opening-bells" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as { next_id?: string };
    assert.equal(structured.next_id, "PG-4");
  });
});

test("story-scoped id_class dispatches first-run ids for fresh missing story bundles", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "STENT", story_slug: "fresh-bundle" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as { next_id?: string };
    assert.equal(structured.next_id, "STENT-1");
  });
});

test("allocate_many_ids dispatches ordered monotonic batches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_many_ids,
      arguments: {
        world_slug: "seeded",
        allocations: [
          { id_class: "BEL", story_slug: "fresh-bundle" },
          { id_class: "BEL", story_slug: "fresh-bundle" },
          { id_class: "SEC-GEO" }
        ]
      }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      allocations?: Array<{ id_class?: string; allocated_id?: string }>;
    };

    assert.deepEqual(structured.allocations, [
      { id_class: "BEL", allocated_id: "BEL-1" },
      { id_class: "BEL", allocated_id: "BEL-2" },
      { id_class: "SEC-GEO", allocated_id: "SEC-GEO-2" }
    ]);
  });
});

test("BEL id_class dispatches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "BEL", story_slug: "opening-bells" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as { next_id?: string };
    assert.equal(structured.next_id, "BEL-2");
  });
});

test("SCN id_class dispatches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "SCN", story_slug: "opening-bells" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as { next_id?: string };
    assert.equal(structured.next_id, "SCN-2");
  });
});

test("SLB id_class dispatches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "SLB", story_slug: "opening-bells" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as { next_id?: string };
    assert.equal(structured.next_id, "SLB-4");
  });
});

test("SAU id_class dispatches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "SAU", story_slug: "opening-bells" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as { next_id?: string };
    assert.equal(structured.next_id, "SAU-4");
  });
});

test("SP id_class dispatches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "SP", story_slug: "opening-bells" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as { next_id?: string };
    assert.equal(structured.next_id, "SP-4");
  });
});

test("RSP id_class dispatches through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: {
        world_slug: "seeded",
        id_class: "RSP",
        story_slug: "opening-bells",
        audit_id: "SAU-0003"
      }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as { next_id?: string };
    assert.equal(structured.next_id, "RSP-4");
  });
});

test("get_canonical_vocabulary accepts every registered vocabulary class through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    for (const vocabularyClass of VOCABULARY_CLASSES) {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.get_canonical_vocabulary,
        arguments: { class: vocabularyClass }
      });

      assert.notEqual(result.isError, true);
      const structured = result.structuredContent as { canonical_values?: string[] };
      assert.ok(Array.isArray(structured.canonical_values));
      assert.ok(structured.canonical_values.length > 0);
    }
  });
});

test("get_record_schema accepts every registered node type through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    for (const nodeType of SUPPORTED_RECORD_SCHEMA_NODE_TYPES) {
      const result = await client.callTool({
        name: MCP_TOOL_NAMES.get_record_schema,
        arguments: { node_type: nodeType }
      });

      assert.notEqual(result.isError, true);
      const structured = result.structuredContent as {
        node_type?: string;
        schema?: { $id?: string };
        source_path?: string;
        required_fields?: string[];
        conditional_blocks?: Record<string, unknown>;
      };
      assert.equal(structured.node_type, nodeType);
      assert.ok(structured.schema?.$id);
      assert.match(structured.source_path ?? "", /^tools\/validators\/src\/schemas\//);
      assert.ok(Array.isArray(structured.required_fields));
      assert.ok(structured.conditional_blocks);
    }
  });
});

test("get_record_schema exposes canon safety conditional blocks through the MCP boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.get_record_schema,
      arguments: { node_type: "canon_fact_record" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      conditional_blocks?: {
        epistemic_profile?: { required_for_types?: string[] };
        exception_governance?: { required_for_types?: string[] };
      };
    };

    assert.deepEqual(structured.conditional_blocks?.exception_governance?.required_for_types, [
      "capability",
      "bloodline",
      "magic_practice",
      "technology",
      "divine_action",
      "artifact_dependent_truth",
      "exception_introducing_fact"
    ]);
    assert.ok(
      structured.conditional_blocks?.epistemic_profile?.required_for_types?.includes("knowledge_asymmetric_fact")
    );
  });
});

test("pipeline-scoped id classes reject non-pipeline world slugs at the MCP handler boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "NWP" }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /__pipeline__/);
    const structured = result.structuredContent as { code?: string };
    assert.equal(structured.code, "invalid_input");
  });
});

test("pipeline sentinel rejects world-scoped id classes at the MCP handler boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "__pipeline__", id_class: "CF" }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /NWB, NWP/);
    const structured = result.structuredContent as { code?: string };
    assert.equal(structured.code, "invalid_input");
  });
});

test("pipeline sentinel rejects EPE at the MCP handler boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "__pipeline__", id_class: "EPE" }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /NWB, NWP/);
    const structured = result.structuredContent as { code?: string };
    assert.equal(structured.code, "invalid_input");
  });
});

test("pipeline sentinel rejects STORY at the MCP handler boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "__pipeline__", id_class: "STORY" }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /NWB, NWP/);
    const structured = result.structuredContent as { code?: string };
    assert.equal(structured.code, "invalid_input");
  });
});

test("story-scoped id classes require story_slug at the MCP handler boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "SLB" }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /requires story_slug/);
    const structured = result.structuredContent as { code?: string };
    assert.equal(structured.code, "invalid_input");
  });
});

test("sub-audit-scoped id classes require audit_id at the MCP handler boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "RSP", story_slug: "opening-bells" }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /requires audit_id/);
    const structured = result.structuredContent as { code?: string };
    assert.equal(structured.code, "invalid_input");
  });
});

test("sub-audit-scoped id classes validate audit_id at the MCP handler boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: {
        world_slug: "seeded",
        id_class: "RSP",
        story_slug: "opening-bells",
        audit_id: "SAU-X"
      }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /SAU-<integer>/);
    const structured = result.structuredContent as { code?: string };
    assert.equal(structured.code, "invalid_input");
  });
});

test("non-sub-audit-scoped id classes reject audit_id at the MCP handler boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: {
        world_slug: "seeded",
        id_class: "SAU",
        story_slug: "opening-bells",
        audit_id: "SAU-0003"
      }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /does not accept audit_id/);
    const structured = result.structuredContent as { code?: string };
    assert.equal(structured.code, "invalid_input");
  });
});

test("world-scoped id classes reject story_slug at the MCP handler boundary", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.allocate_next_id,
      arguments: { world_slug: "seeded", id_class: "CF", story_slug: "opening-bells" }
    });

    assert.equal(result.isError, true);
    assert.match(textContent(result), /does not accept story_slug/);
    const structured = result.structuredContent as { code?: string };
    assert.equal(structured.code, "invalid_input");
  });
});

test("describe_capabilities dispatches through the MCP boundary with no arguments", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.describe_capabilities,
      arguments: {}
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      build_info?: {
        git_commit_hash?: string;
        build_timestamp?: string;
        source_schema_hash?: string;
        validator_registry_hash?: string;
        patch_operation_schema_hash?: string;
      };
      tools?: Array<{
        name?: string;
        description?: string;
        input_schema_enums?: Record<string, string[]>;
      }>;
    };

    assert.match(structured.build_info?.git_commit_hash ?? "", /^[0-9a-f]{40}$|^unknown$/);
    assert.ok(!Number.isNaN(Date.parse(structured.build_info?.build_timestamp ?? "")));
    assert.match(structured.build_info?.source_schema_hash ?? "", /^[0-9a-f]{64}$/);
    assert.match(structured.build_info?.validator_registry_hash ?? "", /^[0-9a-f]{64}$/);
    assert.match(structured.build_info?.patch_operation_schema_hash ?? "", /^[0-9a-f]{64}$/);

    const byName = new Map(structured.tools?.map((tool) => [tool.name, tool]) ?? []);
    assert.ok(byName.has(MCP_TOOL_NAMES.describe_capabilities));
    const allocateNextIdCapability = byName.get(MCP_TOOL_NAMES.allocate_next_id);
    assert.deepEqual(allocateNextIdCapability?.input_schema_enums?.id_class, [...ID_CLASSES]);
    assert.doesNotMatch(allocateNextIdCapability?.description ?? "", /0001/);
    assert.match(allocateNextIdCapability?.description ?? "", /unpadded natural-integer/);
    assert.deepEqual(byName.get(MCP_TOOL_NAMES.get_context_packet)?.input_schema_enums?.task_type, [...TASK_TYPES]);
    assert.ok(
      byName
        .get(MCP_TOOL_NAMES.get_context_packet)
        ?.input_schema_enums?.task_type?.includes("story_bootstrap")
    );
    assert.ok(
      byName
        .get(MCP_TOOL_NAMES.get_context_packet)
        ?.input_schema_enums?.task_type?.includes("story_turn_cycle")
    );
    assert.ok(
      byName
        .get(MCP_TOOL_NAMES.get_context_packet)
        ?.input_schema_enums?.task_type?.includes("commitment_block_authoring")
    );
    assert.ok(
      byName
        .get(MCP_TOOL_NAMES.get_context_packet)
        ?.input_schema_enums?.task_type?.includes("branching_story_health_audit")
    );
    assert.ok(
      byName
        .get(MCP_TOOL_NAMES.get_context_packet)
        ?.input_schema_enums?.task_type?.includes("story_fact_promotion_to_canon")
    );
    assert.deepEqual(byName.get(MCP_TOOL_NAMES.get_canonical_vocabulary)?.input_schema_enums?.class, [
      ...VOCABULARY_CLASSES
    ]);
    assert.deepEqual(byName.get(MCP_TOOL_NAMES.get_record_schema)?.input_schema_enums?.node_type, [
      ...SUPPORTED_RECORD_SCHEMA_NODE_TYPES
    ]);
    assert.deepEqual(byName.get(MCP_TOOL_NAMES.list_records)?.input_schema_enums?.record_type, [
      ...SUPPORTED_LIST_RECORD_TYPES
    ]);
    assert.deepEqual(byName.get(MCP_TOOL_NAMES.select_storylet_candidates)?.input_schema_enums?.["turn_driver.kind"], [
      "player_action",
      "player_write_in",
      "npc_action",
      "offstage_action",
      "world_pressure",
      "clock_fire",
      "secret_reveal",
      "multi_actor_collision"
    ]);
    assert.ok(
      byName.get(MCP_TOOL_NAMES.list_records)?.input_schema_enums?.record_type?.includes("storylet_record")
    );
    assert.ok(
      byName.get(MCP_TOOL_NAMES.list_records)?.input_schema_enums?.record_type?.includes("belief_record")
    );
    assert.deepEqual(byName.get(MCP_TOOL_NAMES.describe_envelope_schema)?.input_schema_enums?.op_kind, [
      ...OPERATION_KINDS
    ]);
  });
});

test("deployed_mcp_rejects_known_bad_causal_dependency_plan", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.validate_patch_plan,
      arguments: { patch_plan: buildKnownBadCausalDependencyPlan() }
    });

    const structured = result.structuredContent as {
      status?: string;
      verdicts?: Array<{ validator?: string; code?: string }>;
    };
    assert.equal(
      structured.status,
      "fail",
      "deployed validator bundle appears stale: expected causal_dependency_threat_scan.choice_dependency_clobbered verdict on choice grounded in closed STOBJ; got pass - run 'cd tools/validators && npm run build' and restart the MCP server/client session"
    );
    assert.ok(
      structured.verdicts?.some(
        (verdict) =>
          verdict.validator === "causal_dependency_threat_scan" &&
          verdict.code === "choice_dependency_clobbered"
      ),
      "deployed validator bundle appears stale: expected causal_dependency_threat_scan.choice_dependency_clobbered verdict on choice grounded in closed STOBJ; run 'cd tools/validators && npm run build' and restart the MCP server/client session"
    );
  });
});

test("deployed_mcp_rejects_known_bad_expected_witness_plan", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.validate_patch_plan,
      arguments: { patch_plan: buildKnownBadExpectedWitnessPlan() }
    });

    const structured = result.structuredContent as {
      status?: string;
      verdicts?: Array<{ validator?: string; code?: string }>;
    };
    assert.equal(
      structured.status,
      "fail",
      "deployed validator bundle appears stale: expected expected_witness_coverage verdict on public event with missing BEL witness coverage; got pass - run 'cd tools/validators && npm run build' and restart the MCP server/client session"
    );
    assert.ok(
      structured.verdicts?.some(
        (verdict) =>
          verdict.validator === "expected_witness_coverage" &&
          verdict.code === "expected_witness_coverage_missing_public_bel"
      ),
      "deployed validator bundle appears stale: expected expected_witness_coverage.expected_witness_coverage_missing_public_bel verdict on public event with missing BEL witness coverage; run 'cd tools/validators && npm run build' and restart the MCP server/client session"
    );
  });
});

test("describe_envelope_schema dispatches through the MCP boundary with an op filter", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.describe_envelope_schema,
      arguments: { op_kind: "create_cf_record" }
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      envelope_schema?: { properties?: Record<string, unknown> };
      op_schemas?: Record<string, { properties?: Record<string, unknown>; required?: string[] }>;
      referenced_schemas?: Record<string, { required?: string[] }>;
    };

    assert.ok(structured.envelope_schema?.properties?.patches);
    assert.deepEqual(Object.keys(structured.op_schemas ?? {}), ["create_cf_record"]);
    assert.deepEqual(structured.op_schemas?.create_cf_record?.required, [
      "op",
      "target_world",
      "target_file",
      "payload"
    ]);
    assert.ok(
      structured.referenced_schemas?.["https://worldloom.local/schemas/canon-fact-record.schema.json"]?.required?.includes(
        "required_world_updates"
      )
    );
  });
});
