import assert from "node:assert/strict";
import test from "node:test";

import type { IndexedRecord } from "../../src/framework/types.js";
import {
  isBranchLocal,
  rootPageIdsForStory
} from "../../src/structural/branch-locality-utils.js";
import { record } from "./helpers.js";

test("branch locality helper accepts ancestor and bundle-genesis records, rejects siblings", () => {
  const maps = recordMaps([
    branch("BR-1", null, "PG-1"),
    branch("BR-2", "BR-1"),
    branch("BR-3", "BR-1"),
    page("PG-1", "BR-1", null, 0),
    page("PG-2", "BR-2"),
    page("PG-3", "BR-3"),
    fact("SF-1", "PG-1"),
    fact("SF-2", "PG-2"),
    fact("SF-3", "PG-3")
  ]);
  const rootPageIds = rootPageIdsForStory(maps);

  assert.equal(isBranchLocal("SF-1", { branchId: "BR-2", maps, rootPageIds }), true);
  assert.equal(isBranchLocal("SF-2", { branchId: "BR-2", maps, rootPageIds }), true);
  assert.equal(isBranchLocal("SF-3", { branchId: "BR-2", maps, rootPageIds }), false);
});

function recordMaps(records: IndexedRecord[]) {
  const byId = new Map<string, IndexedRecord>();
  const byType = new Map<string, IndexedRecord[]>();
  for (const item of records) {
    const id = typeof item.parsed.id === "string" ? item.parsed.id : item.node_id;
    byId.set(item.node_id, item);
    byId.set(id, item);
    const typed = byType.get(item.node_type) ?? [];
    typed.push(item);
    byType.set(item.node_type, typed);
  }
  return { byId, byType };
}

function branch(id: string, parentBranchId: string | null, rootPageId?: string) {
  return storyRecord("branch_record", id, "branches", {
    id,
    parent_branch_id: parentBranchId,
    ...(rootPageId === undefined ? {} : { root_page_id: rootPageId })
  });
}

function page(id: string, branchId: string, parentPageId?: string | null, turnIndex?: number) {
  return storyRecord("page_record", id, "pages", {
    id,
    branch_id: branchId,
    ...(parentPageId === undefined ? {} : { parent_page_id: parentPageId }),
    ...(turnIndex === undefined ? {} : { turn_index: turnIndex })
  });
}

function fact(id: string, createdAtPage: string) {
  return storyRecord("story_fact_record", id, "facts", {
    id,
    created_at_page: createdAtPage,
    authority: "branch_local",
    derived_from: []
  });
}

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, `test-story:${id}`, `stories/test-story/_source/${sourceDir}/${id}.yaml`, parsed),
    story_slug: "test-story"
  };
}
