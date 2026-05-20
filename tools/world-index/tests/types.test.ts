import assert from "node:assert/strict";
import test from "node:test";

import {
  ATTRIBUTION_EDGE_TYPES,
  EDGE_TYPES,
  ENTITY_EDGE_TYPES,
  NODE_TYPES,
  SCOPED_EDGE_TYPES,
  STORY_EDGE_TYPES,
  YAML_EDGE_TYPES,
  type EdgeType,
  type NodeType
} from "../src/schema/types.js";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type _NodeTypeIsString = Assert<NodeType extends string ? true : false>;
type _NodeTypeMatchesTuple = Assert<IsEqual<NodeType, (typeof NODE_TYPES)[number]>>;
type _EdgeTypeMatchesTuple = Assert<IsEqual<EdgeType, (typeof EDGE_TYPES)[number]>>;

test("node and edge type registries match the spec counts and contain no duplicates", () => {
  const nodeTypes: readonly NodeType[] = NODE_TYPES;
  const edgeTypes: readonly EdgeType[] = EDGE_TYPES;

  assert.equal(nodeTypes.length, 49);
  assert.equal(new Set(nodeTypes).size, nodeTypes.length);
  assert.ok(nodeTypes.includes("pressure_clock_record"));
  assert.ok(nodeTypes.includes("story_secret_record"));
  assert.ok(nodeTypes.includes("story_question_record"));
  assert.ok(nodeTypes.includes("story_plan_record"));
  assert.ok(nodeTypes.includes("story_emotion_record"));
  assert.ok(nodeTypes.includes("story_character_authority_record"));

  assert.equal(YAML_EDGE_TYPES.length, 10);
  assert.equal(ATTRIBUTION_EDGE_TYPES.length, 2);
  assert.equal(ENTITY_EDGE_TYPES.length, 1);
  assert.equal(SCOPED_EDGE_TYPES.length, 2);
  assert.equal(STORY_EDGE_TYPES.length, 69);
  assert.ok(STORY_EDGE_TYPES.includes("state_delta_create"));
  assert.ok(STORY_EDGE_TYPES.includes("state_delta_supersede"));
  assert.ok(STORY_EDGE_TYPES.includes("state_delta_close"));
  assert.ok(STORY_EDGE_TYPES.includes("creation_evidence"));
  assert.ok(STORY_EDGE_TYPES.includes("event_state_relation_target"));
  assert.ok(STORY_EDGE_TYPES.includes("event_alias_binding"));
  assert.ok(STORY_EDGE_TYPES.includes("event_introduces_record"));
  assert.ok(STORY_EDGE_TYPES.includes("page_active_record"));
  assert.ok(STORY_EDGE_TYPES.includes("page_visible_affordance_record"));
  assert.ok(STORY_EDGE_TYPES.includes("page_emitted_choice"));
  assert.ok(STORY_EDGE_TYPES.includes("belief_holder"));
  assert.ok(STORY_EDGE_TYPES.includes("belief_basis_event"));
  assert.ok(STORY_EDGE_TYPES.includes("belief_access_record"));
  assert.ok(STORY_EDGE_TYPES.includes("belief_opens"));
  assert.ok(STORY_EDGE_TYPES.includes("relationship_participant"));
  assert.ok(STORY_EDGE_TYPES.includes("relationship_derived_from"));
  assert.ok(STORY_EDGE_TYPES.includes("intention_holder"));
  assert.ok(STORY_EDGE_TYPES.includes("intention_supersedes"));
  assert.ok(STORY_EDGE_TYPES.includes("status_entity"));
  assert.ok(STORY_EDGE_TYPES.includes("clock_linked_record"));
  assert.ok(STORY_EDGE_TYPES.includes("clock_driver"));
  assert.ok(STORY_EDGE_TYPES.includes("clock_tick_event"));
  assert.ok(STORY_EDGE_TYPES.includes("secret_truth_anchor"));
  assert.ok(STORY_EDGE_TYPES.includes("secret_holder"));
  assert.ok(STORY_EDGE_TYPES.includes("secret_clue_carrier"));
  assert.ok(STORY_EDGE_TYPES.includes("secret_reveal_record"));
  assert.ok(STORY_EDGE_TYPES.includes("story_question_source"));
  assert.ok(STORY_EDGE_TYPES.includes("story_question_payoff_of"));
  assert.ok(STORY_EDGE_TYPES.includes("story_question_answer_record"));
  assert.ok(STORY_EDGE_TYPES.includes("stent_character_authority"));
  assert.ok(STORY_EDGE_TYPES.includes("stchar_source_character"));
  assert.ok(STORY_EDGE_TYPES.includes("stchar_supersedes"));
  assert.ok(STORY_EDGE_TYPES.includes("stchar_bound_stent"));
  assert.ok(STORY_EDGE_TYPES.includes("choice_grounded_in"));
  assert.ok(STORY_EDGE_TYPES.includes("choice_associated_storylet"));
  assert.ok(STORY_EDGE_TYPES.includes("choice_affordance_ordinal"));
  assert.ok(STORY_EDGE_TYPES.includes("storylet_predicate_ref"));
  assert.ok(STORY_EDGE_TYPES.includes("storylet_effect_ref"));
  assert.ok(STORY_EDGE_TYPES.includes("storylet_exit_likely_effect_ref"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_holder"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_root_intention"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_belief_basis"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_resource_basis"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_blocker"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_current_step_target"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_fallback_step_target"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_success_predicate_ref"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_fallback_predicate_ref"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_derived_from"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_expires_when_ref"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_created_by_event"));
  assert.ok(STORY_EDGE_TYPES.includes("plan_supersedes"));
  assert.ok(STORY_EDGE_TYPES.includes("emotion_holder"));
  assert.ok(STORY_EDGE_TYPES.includes("emotion_trigger_event"));
  assert.ok(STORY_EDGE_TYPES.includes("emotion_appraisal_basis"));
  assert.ok(STORY_EDGE_TYPES.includes("emotion_oriented_toward"));
  assert.ok(STORY_EDGE_TYPES.includes("emotion_supersedes"));
  assert.ok(STORY_EDGE_TYPES.includes("emotion_derived_from"));
  assert.ok(STORY_EDGE_TYPES.includes("emotion_expires_when_ref"));
  assert.ok(STORY_EDGE_TYPES.includes("event_actor"));
  assert.ok(STORY_EDGE_TYPES.includes("event_target"));
  assert.ok(STORY_EDGE_TYPES.includes("event_selected_storylet"));
  const storyEdgeNames = new Set<string>(STORY_EDGE_TYPES);
  assert.equal(storyEdgeNames.has("opens_obligation"), false);
  assert.equal(storyEdgeNames.has("pays_off_obligation"), false);
  assert.equal(storyEdgeNames.has("complicates_obligation"), false);
  assert.equal(storyEdgeNames.has("transfers_obligation"), false);
  assert.equal(edgeTypes.length, 84);
  assert.equal(new Set(edgeTypes).size, edgeTypes.length);
});
