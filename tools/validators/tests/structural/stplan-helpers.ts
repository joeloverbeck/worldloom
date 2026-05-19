import type { IndexedRecord } from "../../src/framework/types.js";
import { context, record } from "./helpers.js";

export { context };

export function plan(overrides: Record<string, unknown> = {}): IndexedRecord {
  const parsed = {
    id: "STPLAN-1",
    story_id: "STORY-1",
    created_at_page: "PG-2",
    created_by_event: "SE-2",
    holder: "STENT-1",
    root_intention: "STINT-1",
    objective: "Get the key without alerting the guard.",
    plan_status: "active",
    belief_basis: ["BEL-1"],
    resource_basis: {
      facts: ["SF-1"],
      objects: ["STOBJ-1"],
      locations: ["STLOC-1"],
      artifacts: ["DA-1"],
      relationships: ["SREL-1"],
      obligations: ["OBL-1"]
    },
    blockers: ["THR-1"],
    current_step: {
      action_family: "investigate",
      target_records: ["STOBJ-1"],
      success_condition: { predicates: [{ pred: "record_active", record: "SF-1" }] }
    },
    fallback_steps: [],
    expires_when: "The key is found or the guard leaves.",
    derived_from: [],
    ...overrides
  };
  return storyRecord("story_plan_record", parsed.id as string, "plans", parsed);
}

export function baseRecords(extra: IndexedRecord[] = []): IndexedRecord[] {
  return [
    page("PG-2", {
      STENT: ["STENT-1"],
      STINT: ["STINT-1"],
      BEL: ["BEL-1"],
      SF: ["SF-1"],
      STOBJ: ["STOBJ-1"],
      STLOC: ["STLOC-1"],
      DA: ["DA-1"],
      SREL: ["SREL-1"],
      OBL: ["OBL-1"],
      THR: ["THR-1"],
      STPLAN: ["STPLAN-0"]
    }),
    storyRecord("story_entity_record", "STENT-1", "entities", { id: "STENT-1", created_at_page: "PG-1" }),
    storyRecord("intention_record", "STINT-1", "intentions", { id: "STINT-1", created_at_page: "PG-1", holder: "STENT-1" }),
    storyRecord("belief_record", "BEL-1", "beliefs", {
      id: "BEL-1",
      created_at_page: "PG-1",
      holder: "STENT-1",
      basis: { access_records: ["STENT-1"] }
    }),
    storyRecord("story_fact_record", "SF-1", "facts", { id: "SF-1", created_at_page: "PG-1" }),
    storyRecord("story_object_record", "STOBJ-1", "objects", { id: "STOBJ-1", created_at_page: "PG-1", owner: "STENT-1" }),
    storyRecord("story_location_record", "STLOC-1", "locations", { id: "STLOC-1", created_at_page: "PG-1" }),
    storyRecord("story_diegetic_artifact_record", "DA-1", "artifacts", { id: "DA-1", created_at_page: "PG-1", owner: "STENT-1" }),
    storyRecord("relationship_record_story", "SREL-1", "relationships", { id: "SREL-1", created_at_page: "PG-1", participants: ["STENT-1", "STENT-2"] }),
    storyRecord("obligation_record", "OBL-1", "obligations", { id: "OBL-1", created_at_page: "PG-1", owed_by: "STENT-1", owed_to: "STENT-2" }),
    storyRecord("thread_record", "THR-1", "threads", { id: "THR-1", created_at_page: "PG-1" }),
    storyRecord("story_event_record", "SE-1", "events", eventBody("SE-1", "No plan relation.")),
    storyRecord("story_event_record", "SE-2", "events", eventBody("SE-2", "No plan relation.")),
    ...extra
  ];
}

export function page(id: string, active_records: Record<string, string[]> = {}): IndexedRecord {
  return storyRecord("page_record", id, "pages", {
    id,
    branch_path: ["PG-1", "PG-2"],
    state_snapshot: { active_records }
  });
}

export function eventBody(id: string, world_logic_rationale: string, delta: Record<string, string[]> = {}): Record<string, unknown> {
  return {
    id,
    created_at_page: "PG-2",
    world_logic_rationale,
    state_delta: {
      create: delta.create ?? [],
      supersede: delta.supersede ?? [],
      close: delta.close ?? []
    }
  };
}

export function storyRecord(nodeType: string, id: string, subdir: string, parsed: Record<string, unknown>): IndexedRecord {
  return record(nodeType, `test-story:${id}`, `stories/test-story/_source/${subdir}/${id}.yaml`, parsed);
}

export function hasCode(verdicts: Array<{ code: string }>, code: string): boolean {
  return verdicts.some((verdict) => verdict.code === code);
}
