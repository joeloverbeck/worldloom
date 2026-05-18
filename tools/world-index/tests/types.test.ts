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

  assert.equal(nodeTypes.length, 46);
  assert.equal(new Set(nodeTypes).size, nodeTypes.length);
  assert.ok(nodeTypes.includes("pressure_clock_record"));
  assert.ok(nodeTypes.includes("story_secret_record"));
  assert.ok(nodeTypes.includes("story_question_record"));

  assert.equal(YAML_EDGE_TYPES.length, 10);
  assert.equal(ATTRIBUTION_EDGE_TYPES.length, 2);
  assert.equal(ENTITY_EDGE_TYPES.length, 1);
  assert.equal(SCOPED_EDGE_TYPES.length, 2);
  assert.equal(STORY_EDGE_TYPES.length, 20);
  assert.ok(STORY_EDGE_TYPES.includes("state_delta_create"));
  assert.ok(STORY_EDGE_TYPES.includes("state_delta_supersede"));
  assert.ok(STORY_EDGE_TYPES.includes("creation_evidence"));
  assert.ok(STORY_EDGE_TYPES.includes("belief_holder"));
  assert.ok(STORY_EDGE_TYPES.includes("belief_basis_event"));
  assert.ok(STORY_EDGE_TYPES.includes("belief_access_record"));
  assert.ok(STORY_EDGE_TYPES.includes("belief_opens"));
  assert.ok(STORY_EDGE_TYPES.includes("relationship_participant"));
  assert.ok(STORY_EDGE_TYPES.includes("relationship_derived_from"));
  assert.equal(edgeTypes.length, 35);
  assert.equal(new Set(edgeTypes).size, edgeTypes.length);
});
