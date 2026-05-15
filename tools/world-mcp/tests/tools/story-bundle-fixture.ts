import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { seedWorld } from "./_shared";

export const STORY_FIXTURE_WORLD = "seeded";
export const STORY_FIXTURE_SLUG = "opening-bells";
export const STORY_FIXTURE_OTHER_SLUG = "salt-thread";

function storyPath(storySlug: string, subdir: string, fileName: string): string {
  return `stories/${storySlug}/_source/${subdir}/${fileName}`;
}

export function storyNodeId(storySlug: string, recordId: string): string {
  return `${storySlug}:${recordId}`;
}

export function buildStoryBundleWorld(root: string): void {
  seedWorld(root, {
    worldSlug: STORY_FIXTURE_WORLD,
    nodes: [
      {
        node_id: "CF-0001",
        world_slug: STORY_FIXTURE_WORLD,
        file_path: "_source/canon/CF-0001.yaml",
        node_type: "canon_fact_record",
        body: [
          "id: CF-0001",
          "title: Marla Kern Exists",
          "status: hard_canon",
          "type: person",
          "statement: Marla Kern is a canonical person in the world.",
          "scope:",
          "  geographic: local",
          "  temporal: current",
          "  social: public",
          "truth_scope:",
          "  world_level: true",
          "  diegetic_status: objective",
          "domains_affected:",
          "  - ontology",
          "required_world_updates:",
          "  - ONTOLOGY.md",
          "source_basis:",
          "  direct_user_approval: true",
          ""
        ].join("\n")
      },
      {
        node_id: "entity:marla-kern",
        world_slug: STORY_FIXTURE_WORLD,
        file_path: "_source/entities/ENT-0001.yaml",
        node_type: "named_entity",
        body: "id: ENT-0001\ncanonical_name: Marla Kern\nentity_kind: person\n"
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STENT-0002"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "entities", "STENT-0002.yaml"),
        node_type: "story_entity_record",
        body: [
          "id: STENT-0002",
          "name: Marla Kern",
          "world_ent_id: entity:marla-kern",
          "role_in_story: [viewpoint, primary_actor]",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "SF-0001"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "facts", "SF-0001.yaml"),
        node_type: "story_fact_record",
        body: [
          "id: SF-0001",
          "statement: Marla Kern hides in the loft.",
          "derived_from_cf:",
          "  - CF-0001",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STSTAT-0001"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "status", "STSTAT-0001.yaml"),
        node_type: "story_status_record",
        body: [
          "id: STSTAT-0001",
          "story_id: STORY-0001",
          "created_at_page: PG-0001",
          "entity: STENT-0002",
          "life: alive",
          "agency: free",
          "location: STLOC-0001",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "SE-0001"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "events", "SE-0001.yaml"),
        node_type: "story_event_record",
        body: "id: SE-0001\nsummary: Marla enters the loft.\n"
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "OBL-0001"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "obligations", "OBL-0001.yaml"),
        node_type: "obligation_record",
        body: [
          "id: OBL-0001",
          "type: promise",
          "status: open",
          "owner: STENT-0002",
          "subjects:",
          "  - STENT-0002",
          "salience: 7",
          "urgency: 5",
          "possible_payoff_modes:",
          "  - reveal",
          "coverage_cache_compatible_storylets:",
          "  - SLT-0021",
          "summary: Pay off the loft setup.",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "THR-0001"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "threads", "THR-0001.yaml"),
        node_type: "thread_record",
        body: [
          "id: THR-0001",
          "type: seduction",
          "status: pressured",
          "current_pressure: 6",
          "desired_cadence: 2",
          "obligations:",
          "  - OBL-0001",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "PG-0001"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "pages", "PG-0001.yaml"),
        node_type: "page_record",
        body: [
          "id: PG-0001",
          "branch_path:",
          "  - PG-0001",
          "storylet_realized: SLT-0021",
          "chosen_choice_id: CHC-0001",
          "content_intensity: quiet",
          "created_at: '2026-05-03T10:00:00Z'",
          "summary: Loft opening page.",
          "state_snapshot:",
          "  unresolved_mystery_claims:",
          "    - mystery_id: M-0001",
          "      authority: apparent",
          "      status: clue_added",
          "      evidence_records:",
          "        - SF-0001",
          "        - SE-0001",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "CHC-0001"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "choices", "CHC-0001.yaml"),
        node_type: "choice_record",
        body: "id: CHC-0001\nparent_page_id: PG-0001\nlabel: Climb down.\n"
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "SLT-0021"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "storylets", "SLT-0021.yaml"),
        node_type: "storylet_record",
        body: [
          "id: SLT-0021",
          "title: Loft Choice",
          "move_family: decision",
          "scope:",
          "  visibility: global_author_pool",
          "  branch_id: null",
          "saliency:",
          "  urgency: high",
          "  cooldown_pages: 0",
          "  tags:",
          "    - opening",
          "summary: Marla Kern considers the loft window.",
          "provenance:",
          "  created_at_page: PG-0001",
          "opens_obligations:",
          "  - OBL-0001",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_OTHER_SLUG, "SLT-0021"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_OTHER_SLUG,
        file_path: storyPath(STORY_FIXTURE_OTHER_SLUG, "storylets", "SLT-0021.yaml"),
        node_type: "storylet_record",
        body: "id: SLT-0021\ntitle: Salt Thread Choice\nsummary: Distant harbor scene.\n"
      }
    ],
    edges: [
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "STENT-0002"),
        target_node_id: "entity:marla-kern",
        edge_type: "world_entity_binding"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "SF-0001"),
        target_node_id: "CF-0001",
        edge_type: "story_fact_derived_from"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "SLT-0021"),
        target_node_id: storyNodeId(STORY_FIXTURE_SLUG, "PG-0001"),
        edge_type: "created_at_page"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "SLT-0021"),
        target_node_id: storyNodeId(STORY_FIXTURE_SLUG, "OBL-0001"),
        edge_type: "opens_obligation"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "CHC-0001"),
        target_node_id: storyNodeId(STORY_FIXTURE_SLUG, "PG-0001"),
        edge_type: "parent_page"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "THR-0001"),
        target_node_id: storyNodeId(STORY_FIXTURE_SLUG, "OBL-0001"),
        edge_type: "thread_obligation"
      }
    ],
    entities: [
      {
        entity_id: "entity:marla-kern",
        world_slug: STORY_FIXTURE_WORLD,
        canonical_name: "Marla Kern",
        entity_kind: "person",
        source_node_id: "entity:marla-kern"
      }
    ],
    mentions: [
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STENT-0002"),
        story_slug: STORY_FIXTURE_SLUG,
        surface_text: "Marla Kern",
        resolved_entity_id: "entity:marla-kern",
        resolution_kind: "canonical",
        extraction_method: "exact_canonical"
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "SLT-0021"),
        story_slug: STORY_FIXTURE_SLUG,
        surface_text: "Marla Kern",
        resolved_entity_id: "entity:marla-kern",
        resolution_kind: "canonical",
        extraction_method: "exact_canonical"
      }
    ]
  });

  const storyRoot = path.join(root, "worlds", STORY_FIXTURE_WORLD, "stories", STORY_FIXTURE_SLUG);
  mkdirSync(storyRoot, { recursive: true });
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    [
      "---",
      "mysteries_in_play:",
      "  - m_id: M-0001",
      "    status: active",
      "    future_resolution_safety: medium",
      "    domain_overlap: loft",
      "cast_bind_list:",
      "  - char_id: CHAR-0001",
      "    stent_id: STENT-0002",
      "    role_in_story: [viewpoint, primary_actor]",
      "invariants_acknowledged:",
      "  - INV-social-intimacy",
      "---",
      "# Opening Bells",
      ""
    ].join("\n"),
    "utf8"
  );
}
