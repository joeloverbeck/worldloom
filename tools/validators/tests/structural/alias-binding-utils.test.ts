import assert from "node:assert/strict";
import test from "node:test";

import {
  aliasBindingsFor,
  resolveAliasBinding,
  resolveStoryEntityAliasBinding
} from "../../src/structural/alias-binding-utils.js";
import { record } from "./helpers.js";

test("alias binding helper resolves plain and bound-prefixed aliases", () => {
  const event = {
    commitment: {
      alias_bindings: {
        protagonist: "STENT-1",
        plan: "STPLAN-1"
      }
    }
  };

  assert.equal(resolveAliasBinding(event, "protagonist"), "STENT-1");
  assert.equal(resolveAliasBinding(event, "bound:plan"), "STPLAN-1");
  assert.deepEqual([...aliasBindingsFor(event).entries()], [
    ["protagonist", "STENT-1"],
    ["plan", "STPLAN-1"]
  ]);
});

test("alias binding helper resolves IndexedRecord events and filters actor aliases to STENT ids", () => {
  const event = record("story_event_record", "test-story:SE-1", "stories/test-story/_source/events/SE-1.yaml", {
    id: "SE-1",
    commitment: {
      alias_bindings: {
        protagonist: "STENT-1",
        plan: "STPLAN-1"
      }
    }
  });

  assert.equal(resolveStoryEntityAliasBinding(event, "bound:protagonist"), "STENT-1");
  assert.equal(resolveStoryEntityAliasBinding(event, "plan"), undefined);
});
