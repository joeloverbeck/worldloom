import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { seedWorld } from "./_shared.js";

export const STORY_FIXTURE_WORLD = "seeded";
export const STORY_FIXTURE_SLUG = "opening-bells";
export const STORY_FIXTURE_OTHER_SLUG = "salt-thread";

function storyPath(storySlug: string, subdir: string, fileName: string): string {
  return `stories/${storySlug}/_source/${subdir}/${fileName}`;
}

function storyCharacterPath(storySlug: string, fileName: string): string {
  return `stories/${storySlug}/story-characters/${fileName}`;
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
          "bound_stchar_id: STCHAR-1",
          "role_in_story: [viewpoint, primary_actor]",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STENT-3"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "entities", "STENT-3.yaml"),
        node_type: "story_entity_record",
        body: [
          "id: STENT-3",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "name: The stairwell watcher",
          "display_name: The stairwell watcher",
          "bound_stchar_id: null",
          "role_in_story: [background]",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STCHAR-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyCharacterPath(STORY_FIXTURE_SLUG, "STCHAR-1.md"),
        node_type: "story_character_authority_record",
        body: [
          "---",
          "id: STCHAR-1",
          "story_id: STORY-1",
          `story_slug: ${STORY_FIXTURE_SLUG}`,
          `world_slug: ${STORY_FIXTURE_WORLD}`,
          "source_kind: world_char",
          "source_char_id: CHAR-1",
          `source_char_hash: sha256:${"a".repeat(64)}`,
          "source_char_sections_used: [frontmatter]",
          "generated_at_page: story_bootstrap",
          "created_by_skill: branching-story-bootstrap",
          "supersedes: null",
          "superseded_by: null",
          "status: active",
          "bound_stent_ids: [STENT-2]",
          "profile_revision: 1",
          "body_schema_version: stchar.v1",
          `profile_hash: sha256:${"b".repeat(64)}`,
          `voice_block_hash: sha256:${"c".repeat(64)}`,
          `page_packet_hash: sha256:${"d".repeat(64)}`,
          "---",
          "## Profile",
          "",
          "Marla Kern keeps her fear below the surface while looking for a clean exit.",
          "",
          "## Page-Plan Voice Block",
          "",
          "Use clipped, observant phrasing and avoid direct world-character dossier text.",
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
          "  access_records:",
          "    - DA-1",
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
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "BEL-3"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "beliefs", "BEL-3.yaml"),
        node_type: "belief_record",
        body: [
          "id: BEL-3",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "holder: STENT-3",
          "claim: The watcher believes Marla heard the bell.",
          "belief_mode: believes",
          "truth_relation: unknown",
          "confidence: medium",
          "visibility: factional",
          "basis:",
          "  source_event: SE-1",
          "  access_route: direct_observation",
          "consequences:",
          "  opens: []",
          "  constrains_choices: []",
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
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STINT-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "intentions", "STINT-1.yaml"),
        node_type: "intention_record",
        body: [
          "id: STINT-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "holder: STENT-2",
          "intent: Marla wants to reach the loft window unseen.",
          "urgency: high",
          "expires_when: Marla is seen by the watch patrol.",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STPLAN-0"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "plans", "STPLAN-0.yaml"),
        node_type: "story_plan_record",
        body: [
          "id: STPLAN-0",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "created_by_event: SE-1",
          "supersedes: null",
          "holder: STENT-2",
          "root_intention: STINT-1",
          "objective: Marla first tries the public stairwell.",
          "plan_status: active",
          "belief_basis:",
          "  - BEL-1",
          "resource_basis:",
          "  facts: []",
          "  objects: []",
          "  locations: []",
          "  artifacts: []",
          "  relationships: []",
          "  obligations: []",
          "blockers: []",
          "current_step:",
          "  action_family: travel",
          "  target_records:",
          "    - STLOC-1",
          "  success_condition:",
          "    predicates:",
          "      - pred: record_active",
          "        record: STLOC-1",
          "fallback_steps: []",
          "expires_when: Marla learns the stairwell is watched.",
          "derived_from:",
          "  - BEL-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STPLAN-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "plans", "STPLAN-1.yaml"),
        node_type: "story_plan_record",
        body: [
          "id: STPLAN-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "created_by_event: SE-1",
          "supersedes: STPLAN-0",
          "holder: STENT-2",
          "root_intention: STINT-1",
          "objective: Reach the loft window by using the brass latch before the watcher arrives.",
          "plan_status: active",
          "belief_basis:",
          "  - BEL-1",
          "resource_basis:",
          "  facts:",
          "    - SF-1",
          "  objects:",
          "    - STOBJ-1",
          "  locations:",
          "    - STLOC-1",
          "  artifacts:",
          "    - DA-1",
          "  relationships:",
          "    - SREL-1",
          "  obligations:",
          "    - OBL-4",
          "blockers:",
          "  - THR-1",
          "current_step:",
          "  action_family: evade",
          "  target_records:",
          "    - STLOC-1",
          "    - STOBJ-1",
          "  success_condition:",
          "    predicates:",
          "      - pred: record_active",
          "        record: STLOC-1",
          "fallback_steps:",
          "  - action_family: negotiate",
          "    trigger_predicates:",
          "      - pred: plan_blocked",
          "        holder: STENT-2",
          "    target_records:",
          "      - STENT-3",
          "expires_when: The watcher enters the loft.",
          "derived_from:",
          "  - BEL-1",
          "  - SF-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STLOC-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "locations", "STLOC-1.yaml"),
        node_type: "story_location_record",
        body: [
          "id: STLOC-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "label: Loft window",
          "description: A narrow window above the old loft.",
          "bound_ent: null",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STLOC-2"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "locations", "STLOC-2.yaml"),
        node_type: "story_location_record",
        body: [
          "id: STLOC-2",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "label: Unused cellar",
          "description: A cellar not referenced by the active branch state.",
          "bound_ent: null",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STOBJ-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "objects", "STOBJ-1.yaml"),
        node_type: "story_object_record",
        body: [
          "id: STOBJ-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "label: Brass latch",
          "description: A tarnished latch on the loft window.",
          "owner: public",
          "current_location: STLOC-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STOBJ-2"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "objects", "STOBJ-2.yaml"),
        node_type: "story_object_record",
        body: [
          "id: STOBJ-2",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "label: Unused ledger",
          "description: A ledger not referenced by the active branch state.",
          "owner: null",
          "current_location: unknown",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "SREL-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "relationships", "SREL-1.yaml"),
        node_type: "relationship_record_story",
        body: [
          "id: SREL-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "axis: trust",
          "participants:",
          "  - STENT-2",
          "  - STENT-3",
          "direction:",
          "  kind: bidirectional",
          "  from: null",
          "  to: null",
          "value: low",
          "valence: symmetric",
          "description: Marla and the watcher do not yet trust each other.",
          "derived_from:",
          "  - BEL-2",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "SREL-2"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "relationships", "SREL-2.yaml"),
        node_type: "relationship_record_story",
        body: [
          "id: SREL-2",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "axis: fear",
          "participants:",
          "  - STENT-3",
          "  - STENT-2",
          "direction:",
          "  kind: directed",
          "  from: STENT-3",
          "  to: STENT-2",
          "value: medium",
          "valence: asymmetric",
          "description: The watcher fears Marla may expose him.",
          "derived_from:",
          "  - SE-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STEMO-0"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "emotions", "STEMO-0.yaml"),
        node_type: "story_emotion_record",
        body: [
          "id: STEMO-0",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "created_by_event: SE-1",
          "supersedes: null",
          "holder: STENT-2",
          "status: active",
          "affect_kind: fear",
          "intensity: low",
          "orientation:",
          "  toward_records:",
          "    - THR-1",
          "appraisal_basis:",
          "  - BEL-2",
          "trigger_event: SE-1",
          "behavioral_pressure:",
          "  - flee",
          "agency_effect: none",
          "expires_when: Marla reaches the loft window.",
          "derived_from:",
          "  - BEL-2",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STEMO-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "emotions", "STEMO-1.yaml"),
        node_type: "story_emotion_record",
        body: [
          "id: STEMO-1",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "created_by_event: SE-1",
          "supersedes: STEMO-0",
          "holder: STENT-2",
          "status: active",
          "affect_kind: anxiety",
          "intensity: high",
          "orientation:",
          "  toward_records:",
          "    - THR-1",
          "    - STENT-3",
          "appraisal_basis:",
          "  - BEL-2",
          "trigger_event: SE-1",
          "behavioral_pressure:",
          "  - conceal",
          "  - plan",
          "agency_effect: constraining",
          "expires_when: The watcher is neutralized or Marla leaves the loft.",
          "derived_from:",
          "  - BEL-2",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "STEMO-2"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "emotions", "STEMO-2.yaml"),
        node_type: "story_emotion_record",
        body: [
          "id: STEMO-2",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "created_by_event: SE-1",
          "supersedes: null",
          "holder: STENT-3",
          "status: dissociated",
          "affect_kind: null",
          "orientation:",
          "  toward_records:",
          "    - STENT-2",
          "appraisal_basis: []",
          "trigger_event: SE-1",
          "behavioral_pressure: []",
          "agency_effect: none",
          "expires_when: The watcher chooses a side.",
          "derived_from:",
          "  - SE-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "SE-1"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "events", "SE-1.yaml"),
        node_type: "story_event_record",
        body: "id: SE-1\nsummary: Marla enters the loft.\ntargets:\n  - STLOC-1\n  - STOBJ-1\n"
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
          "supersedes: null",
          "title: Loft Bell Note",
          "author: unknown",
          "genre: note",
          "body: The bell rang before Marla entered.",
          "intended_audience: public",
          "circulation: public",
          "truth_relation: unknown",
          "derived_from:",
          "  - SE-1",
          ""
        ].join("\n")
      },
      {
        node_id: storyNodeId(STORY_FIXTURE_SLUG, "DA-2"),
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        file_path: storyPath(STORY_FIXTURE_SLUG, "artifacts", "DA-2.yaml"),
        node_type: "story_diegetic_artifact_record",
        body: [
          "id: DA-2",
          "story_id: STORY-1",
          "created_at_page: PG-1",
          "supersedes: null",
          "title: Unused receipt",
          "author: anonymous",
          "genre: receipt",
          "body: A receipt no one has referenced.",
          "intended_audience: none",
          "circulation: private",
          "truth_relation: unknown",
          "derived_from: []",
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
          "effects:",
          "  create:",
          "    - OBL-1",
          "  supersede: []",
          "  close: []",
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
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "STENT-2"),
        target_node_id: storyNodeId(STORY_FIXTURE_SLUG, "STCHAR-1"),
        edge_type: "stent_character_authority"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "STCHAR-1"),
        target_unresolved_ref: "CHAR-1",
        edge_type: "stchar_source_character"
      },
      {
        story_slug: STORY_FIXTURE_SLUG,
        source_node_id: storyNodeId(STORY_FIXTURE_SLUG, "STCHAR-1"),
        target_node_id: storyNodeId(STORY_FIXTURE_SLUG, "STENT-2"),
        edge_type: "stchar_bound_stent"
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
        edge_type: "storylet_effect_ref"
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
      "  - stchar_id: STCHAR-1",
      "    source_char_id: CHAR-1",
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
