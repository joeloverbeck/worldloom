import type { IndexedRecord } from "../../src/framework/types.js";
import { context, record } from "./helpers.js";

export { context };

export function emotion(overrides: Record<string, unknown> = {}): IndexedRecord {
  const parsed = {
    id: "STEMO-1",
    story_id: "STORY-1",
    created_at_page: "PG-2",
    created_by_event: "SE-2",
    supersedes: null,
    holder: "STENT-1",
    status: "active",
    affect_kind: "fear",
    intensity: "medium",
    orientation: { toward_records: ["STENT-2"] },
    appraisal_basis: ["BEL-1"],
    trigger_event: "SE-1",
    behavioral_pressure: ["flee"],
    agency_effect: "none",
    expires_when: "The threat is resolved.",
    derived_from: [],
    ...overrides
  };
  return storyRecord("story_emotion_record", parsed.id as string, "emotions", parsed);
}

export function baseRecords(extra: IndexedRecord[] = []): IndexedRecord[] {
  return [
    page("PG-2", {
      STENT: ["STENT-1", "STENT-2"],
      STSTAT: ["STSTAT-1", "STSTAT-2"],
      BEL: ["BEL-1"],
      SE: ["SE-1", "SE-2"],
      STEMO: ["STEMO-0"]
    }),
    storyRecord("story_entity_record", "STENT-1", "entities", {
      id: "STENT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      display_name: "Holder",
      role_in_story: ["primary_actor"]
    }),
    storyRecord("story_entity_record", "STENT-2", "entities", {
      id: "STENT-2",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      display_name: "Visible target",
      role_in_story: ["witness"]
    }),
    storyRecord("story_status_record", "STSTAT-1", "status", {
      id: "STSTAT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      entity: "STENT-1",
      life: "alive",
      agency: "free",
      location: "STLOC-1"
    }),
    storyRecord("story_status_record", "STSTAT-2", "status", {
      id: "STSTAT-2",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      entity: "STENT-2",
      life: "alive",
      agency: "free",
      location: "STLOC-1"
    }),
    storyRecord("belief_record", "BEL-1", "beliefs", {
      id: "BEL-1",
      created_at_page: "PG-1",
      holder: "STENT-1",
      basis: { access_records: ["STENT-1"] }
    }),
    storyRecord("story_event_record", "SE-1", "events", eventBody("SE-1", "Trigger event.")),
    storyRecord("story_event_record", "SE-2", "events", eventBody("SE-2", "Creation event.")),
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

export function eventBody(id: string, world_logic_rationale: string): Record<string, unknown> {
  return {
    id,
    created_at_page: id === "SE-3" ? "PG-3" : "PG-2",
    world_logic_rationale,
    state_delta: {
      create: [],
      supersede: [],
      close: []
    }
  };
}

export function storyRecord(nodeType: string, id: string, subdir: string, parsed: Record<string, unknown>): IndexedRecord {
  return record(nodeType, `test-story:${id}`, `stories/test-story/_source/${subdir}/${id}.yaml`, parsed);
}

export function hasCode(verdicts: Array<{ code: string }>, code: string): boolean {
  return verdicts.some((verdict) => verdict.code === code);
}
