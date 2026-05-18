import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { seedWorld } from "./_shared.js";

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
        node_id: "CF-1",
        world_slug: STORY_FIXTURE_WORLD,
        file_path: "_source/canon/CF-1.yaml",
        node_type: "canon_fact_record",
        body: [
          "id: CF-1",
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
        file_path: "_source/entities/ENT-1.yaml",
        node_type: "named_entity",
        body: "id: ENT-1\ncanonical_name: Marla Kern\nentity_kind: person\n"
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STENT-2"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "entities", "STENT-2.yaml"),
        node_type: "story_entity_record",
        body: [
          "id: STENT-2",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "name: Marla Kern",
          "display_name: Marla Kern",
          "bound_char_id: CHAR-1",
          "role_in_story: [viewpoint, primary_actor]",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "SF-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "facts", "SF-1.yaml"),
        node_type: "story_fact_record",
        body: [
          "id: SF-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "statement: Marla Kern hides in the loft.",
          "derived_from:",
          "  - CF-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "BEL-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "beliefs", "BEL-1.yaml"),
        node_type: "belief_record",
        body: [
          "id: BEL-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "holder: STENT-2",
          "claim: Marla believes the loft is empty.",
          "belief_mode: believes",
          "truth_relation: 'false'",
          "confidence: likely",
          "visibility: private",
          "basis:",
          "  source_event: SE-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "BEL-2"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "beliefs", "BEL-2.yaml"),
        node_type: "belief_record",
        body: [
          "id: BEL-2",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "holder: STENT-2",
          "claim: Marla suspects someone listened at the stairwell.",
          "belief_mode: suspects",
          "truth_relation: unknown",
          "confidence: suspected",
          "visibility: shared",
          "basis:",
          "  source_event: SE-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STSTAT-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "status", "STSTAT-1.yaml"),
        node_type: "story_status_record",
        body: [
          "id: STSTAT-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "entity: STENT-2",
          "life: alive",
          "agency: free",
          "location: STLOC-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "SE-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "events", "SE-1.yaml"),
        node_type: "story_event_record",
        body: "id: SE-1\nsummary: Marla enters the loft.\n"
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "DA-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "artifacts", "DA-1.yaml"),
        node_type: "story_diegetic_artifact_record",
        body: [
          "id: DA-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "title: Loft Bell",
          "artifact_type: note",
          "artifact_text: The bell rang before Marla entered.",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "OBL-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "obligations", "OBL-1.yaml"),
        node_type: "obligation_record",
        body: [
          "id: OBL-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "status: open",
          "obligation_kind: promise",
          "description: Pay off the loft setup.",
          "owed_by: STENT-2",
          "owed_to: public",
          "trigger_to_close: Marla reveals why the loft bell rang.",
          "urgency: high",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "OBL-2"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "obligations", "OBL-2.yaml"),
        node_type: "obligation_record",
        body: [
          "id: OBL-2",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "status: open",
          "obligation_kind: debt",
          "description: Marla owes the stairwell watcher a true answer.",
          "owed_by: STENT-2",
          "owed_to: group:watch",
          "trigger_to_close: Marla gives the watcher a true answer.",
          "urgency: medium",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "OBL-3"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "obligations", "OBL-3.yaml"),
        node_type: "obligation_record",
        body: [
          "id: OBL-3",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "status: open",
          "obligation_kind: moral",
          "description: Marla must decide whether to warn the public.",
          "owed_by: STENT-2",
          "owed_to: public",
          "trigger_to_close: The public warning is either made or deliberately withheld.",
          "urgency: low",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "OBL-4"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "obligations", "OBL-4.yaml"),
        node_type: "obligation_record",
        body: [
          "id: OBL-4",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "status: open",
          "obligation_kind: protection",
          "description: Marla must keep the loft child unseen.",
          "owed_by: STENT-2",
          "owed_to: STENT-2",
          "trigger_to_close: The child is moved beyond the watch patrol.",
          "urgency: high",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "OBL-5"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "obligations", "OBL-5.yaml"),
        node_type: "obligation_record",
        body: [
          "id: OBL-5",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "status: open",
          "obligation_kind: promise",
          "description: Marla promised to leave a signal if the roof path is clear.",
          "owed_by: STENT-2",
          "owed_to: public",
          "trigger_to_close: A roof-path signal is left or the promise is superseded.",
          "urgency: medium",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "THR-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "threads", "THR-1.yaml"),
        node_type: "thread_record",
        body: [
          "id: THR-1",
          "type: seduction",
          "status: pressured",
          "current_pressure: 6",
          "desired_cadence: 2",
          "obligations:",
          "  - OBL-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "CLK-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "clocks", "CLK-1.yaml"),
        node_type: "pressure_clock_record",
        body: [
          "id: CLK-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "title: Loft Patrol",
          "clock_kind: danger",
          "driver: group:watch",
          "linked_records:",
          "  - THR-1",
          "value: 2",
          "max: 6",
          "salience: high",
          "visibility: hidden",
          "thresholds:",
          "  - at: 4",
          "    label: Patrol reaches the loft",
          "    effects:",
          "      create: []",
          "      supersede: []",
          "      close: []",
          "tick_history:",
          "  - event: SE-1",
          "    delta: 2",
          "    cause: Bells alerted the patrol.",
          "status: active",
          "resolution_event: null",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STSEC-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "secrets", "STSEC-1.yaml"),
        node_type: "story_secret_record",
        body: [
          "id: STSEC-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "secret_kind: event_cause",
          "secret_claim: The bell rang because someone pulled the loft cord.",
          "truth_anchor: SF-1",
          "holders:",
          "  - STENT-2",
          "salience: high",
          "protected_mystery_refs:",
          "  - M-1",
          "clue_carriers:",
          "  - kind: BEL",
          "    record: BEL-2",
          "    clue_text: Marla suspects a listener.",
          "    clue_strength: suggestive",
          "    discovered_by:",
          "      - STENT-2",
          "    audience_visible: ambiguous",
          "    status: discovered",
          "source_records:",
          "  - BEL-2",
          "status: hidden",
          "reveal_event: null",
          "reveal_records: []",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STQ-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "story-questions", "STQ-1.yaml"),
        node_type: "story_question_record",
        body: [
          "id: STQ-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "setup_kind: dramatic_question",
          "question_or_setup: Who rang the loft bell?",
          "salience: high",
          "audience_visibility: explicit",
          "source_event: SE-1",
          "source_records:",
          "  - SF-1",
          "payoff_of: null",
          "status: open",
          "answer_event: null",
          "answer_records: []",
          "abandonment_rationale: null",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "PG-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "pages", "PG-1.yaml"),
        node_type: "page_record",
        body: [
          "id: PG-1",
          "branch_path:",
          "  - PG-1",
          "input:",
          "  choice_id: CHC-1",
          "  resolved_event_id: SE-1",
          "content_intensity: quiet",
          "created_at: '2026-05-03T10:00:00Z'",
          "summary: Loft opening page.",
          "state_snapshot:",
          "  unresolved_mystery_claims:",
          "    - mystery_id: M-1",
          "      authority: apparent",
          "      status: clue_added",
          "      evidence_records:",
          "        - SF-1",
          "        - SE-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "CHC-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "choices", "CHC-1.yaml"),
        node_type: "choice_record",
        body: "id: CHC-1\nparent_page_id: PG-1\nlabel: Climb down.\n"
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "SLT-21"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "storylets", "SLT-21.yaml"),
        node_type: "storylet_record",
        body: [
          "id: SLT-21",
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
          "  created_at_page: PG-1",
          "opens_obligations:",
          "  - OBL-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_OTHER_SLUG, "SLT-21"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_OTHER_SLUG,
        file_path: storyPath(STORY_FIXTURE_OTHER_SLUG, "storylets", "SLT-21.yaml"),
        node_type: "storylet_record",
        body: "id: SLT-21\ntitle: Salt Thread Choice\nsummary: Distant harbor scene.\n"
      }
    ],
    edges: [
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "STENT-2"),
        target_node_id: "entity:marla-kern",
        edge_type: "world_entity_binding"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "SF-1"),
        target_node_id: "CF-1",
        edge_type: "story_fact_derived_from"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "BEL-1"),
        target_node_id: storyNodeId(STORY_FIXTURE_SLUG, "SE-1"),
        edge_type: "created_at_page"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "SLT-21"),
        target_node_id: storyNodeId(STORY_FIXTURE_SLUG, "PG-1"),
        edge_type: "created_at_page"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "SLT-21"),
        target_node_id: storyNodeId(STORY_FIXTURE_SLUG, "OBL-1"),
        edge_type: "opens_obligation"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "CHC-1"),
        target_node_id: storyNodeId(STORY_FIXTURE_SLUG, "PG-1"),
        edge_type: "parent_page"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "THR-1"),
        target_node_id: storyNodeId(STORY_FIXTURE_SLUG, "OBL-1"),
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
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STENT-2"),
        story_slug: STORY_FIXTURE_SLUG,
        surface_text: "Marla Kern",
        resolved_entity_id: "entity:marla-kern",
        resolution_kind: "canonical",
        extraction_method: "exact_canonical"
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "SLT-21"),
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
      "  - m_id: M-1",
      "    status: active",
      "    future_resolution_safety: medium",
      "    domain_overlap: loft",
      "cast_bind_list:",
      "  - char_id: CHAR-1",
      "    stent_id: STENT-2",
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
