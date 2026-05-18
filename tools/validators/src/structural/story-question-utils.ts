import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryRecordsByType,
  stringArray,
  stringValue
} from "./utils.js";

export const STORY_QUESTION_MUTATION_OPS = new Set([
  "create_stq_record",
  "supersede_stq_record",
  "answer_story_question",
  "abandon_story_question"
]);

export const SOURCE_RECORD_TYPES: Readonly<Record<string, string>> = {
  SF: "story_fact_record",
  BEL: "belief_record",
  DA: "story_diegetic_artifact_record",
  THR: "thread_record",
  OBL: "obligation_record",
  CNSQ: "consequence_record",
  STINT: "intention_record",
  SREL: "relationship_record_story",
  STLOC: "story_location_record",
  STOBJ: "story_object_record",
  CLK: "pressure_clock_record",
  STSEC: "story_secret_record"
};

export function storyQuestionValidatorApplies(ctx: Context): boolean {
  if (ctx.run_mode === "full-world") {
    return true;
  }
  if (ctx.run_mode === "pre-apply") {
    return (ctx.patch_plan?.patches ?? []).some((patch) => STORY_QUESTION_MUTATION_OPS.has(patch.op));
  }
  return ctx.touched_files.some((file) =>
    /(?:^|\/)stories\/[^/]+\/_source\/story-questions\/STQ-\d+\.yaml$|(?:^|\/)_source\/story-questions\/STQ-\d+\.yaml$/.test(file)
  );
}

export function defineStoryQuestionValidator(
  name: string,
  runQuestion: (question: IndexedRecord, ctx: Context, records: StoryQuestionRecordSet) => Promise<Verdict[]> | Verdict[]
): Validator {
  return {
    name,
    severity_mode: "fail",
    applies_to: storyQuestionValidatorApplies,
    run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
      const records = await loadStoryQuestionRecordSet(ctx);
      const verdicts: Verdict[] = [];
      for (const question of records.questions) {
        verdicts.push(...await runQuestion(question, ctx, records));
      }
      return verdicts;
    }
  };
}

export interface StoryQuestionRecordSet {
  questions: IndexedRecord[];
  questionsById: Map<string, IndexedRecord>;
  eventsById: Map<string, IndexedRecord>;
  pagesById: Map<string, IndexedRecord>;
  sourceRecordsByTypeAndId: Map<string, IndexedRecord>;
}

export async function loadStoryQuestionRecordSet(ctx: Context): Promise<StoryQuestionRecordSet> {
  const [
    questions,
    events,
    pages,
    facts,
    beliefs,
    artifacts,
    threads,
    obligations,
    consequences,
    intentions,
    relationships,
    locations,
    objects,
    clocks,
    secrets
  ] = await Promise.all([
    queryRecordsByType(ctx, "story_question_record"),
    queryRecordsByType(ctx, "story_event_record"),
    queryRecordsByType(ctx, "page_record"),
    queryRecordsByType(ctx, "story_fact_record"),
    queryRecordsByType(ctx, "belief_record"),
    queryRecordsByType(ctx, "story_diegetic_artifact_record"),
    queryRecordsByType(ctx, "thread_record"),
    queryRecordsByType(ctx, "obligation_record"),
    queryRecordsByType(ctx, "consequence_record"),
    queryRecordsByType(ctx, "intention_record"),
    queryRecordsByType(ctx, "relationship_record_story"),
    queryRecordsByType(ctx, "story_location_record"),
    queryRecordsByType(ctx, "story_object_record"),
    queryRecordsByType(ctx, "pressure_clock_record"),
    queryRecordsByType(ctx, "story_secret_record")
  ]);

  const sourceRecordsByTypeAndId = new Map<string, IndexedRecord>();
  for (const record of [
    ...facts,
    ...beliefs,
    ...artifacts,
    ...threads,
    ...obligations,
    ...consequences,
    ...intentions,
    ...relationships,
    ...locations,
    ...objects,
    ...clocks,
    ...secrets
  ]) {
    const id = recordAuthoredId(record);
    if (id !== undefined) {
      sourceRecordsByTypeAndId.set(recordKey(record.node_type, storyKey(record), id), record);
    }
  }

  return {
    questions,
    questionsById: mapStoryRecordsById(questions),
    eventsById: mapStoryRecordsById(events),
    pagesById: mapStoryRecordsById(pages),
    sourceRecordsByTypeAndId
  };
}

export function storyQuestionId(question: IndexedRecord): string {
  return recordAuthoredId(question) ?? bareStoryId(question.node_id) ?? question.node_id;
}

export function createdAtPageId(record: IndexedRecord): string | undefined {
  return stringValue(asPlainRecord(record.parsed).created_at_page);
}

export function sourceRecordIds(question: IndexedRecord): string[] {
  return stringArray(asPlainRecord(question.parsed).source_records);
}

export function branchPathForPage(page: IndexedRecord | undefined): string[] {
  return stringArray(asPlainRecord(page?.parsed).branch_path);
}

export function pageForRecord(record: IndexedRecord, pagesById: ReadonlyMap<string, IndexedRecord>): IndexedRecord | undefined {
  const pageId = createdAtPageId(record);
  if (pageId === undefined) {
    return undefined;
  }
  return pagesById.get(recordKey("page_record", storyKey(record), pageId));
}

export function precedesInBranchPath(
  earlierPageId: string,
  laterPageId: string,
  laterPage: IndexedRecord | undefined
): boolean {
  if (earlierPageId === laterPageId) {
    return false;
  }
  const branchPath = branchPathForPage(laterPage);
  if (branchPath.length === 0) {
    return numericId(earlierPageId) < numericId(laterPageId);
  }
  const earlierIndex = branchPath.indexOf(earlierPageId);
  const laterIndex = branchPath.indexOf(laterPageId);
  return earlierIndex >= 0 && laterIndex >= 0 && earlierIndex < laterIndex;
}

export function sourceRecordTypeFor(id: string): string | undefined {
  const prefix = id.split("-")[0];
  return prefix === undefined ? undefined : SOURCE_RECORD_TYPES[prefix];
}

export function sourceRecord(
  records: StoryQuestionRecordSet,
  question: IndexedRecord,
  id: string
): IndexedRecord | undefined {
  const nodeType = sourceRecordTypeFor(id);
  if (nodeType === undefined) {
    return undefined;
  }
  return records.sourceRecordsByTypeAndId.get(recordKey(nodeType, storyKey(question), id));
}

export function isActiveAtQuestionPage(question: IndexedRecord, targetId: string, pagesById: ReadonlyMap<string, IndexedRecord>): boolean {
  const page = pageForRecord(question, pagesById);
  const activeRecords = asPlainRecord(asPlainRecord(asPlainRecord(page?.parsed).state_snapshot).active_records);
  const prefix = targetId.split("-")[0];
  const activeList = prefix === undefined ? undefined : activeRecords[prefix];
  return Array.isArray(activeList) && activeList.includes(targetId);
}

export function fail(question: IndexedRecord, validator: string, code: string, message: string, detail?: unknown): Verdict {
  return {
    validator,
    severity: "fail",
    code,
    message: `${storyQuestionId(question)}: ${message}`,
    location: locationFor(question),
    detail
  };
}

export function warn(question: IndexedRecord, validator: string, code: string, message: string, detail?: unknown): Verdict {
  return {
    validator,
    severity: "warn",
    code,
    message: `${storyQuestionId(question)}: ${message}`,
    location: locationFor(question),
    detail
  };
}

export function storyKey(record: IndexedRecord): string {
  if (record.story_slug) {
    return record.story_slug;
  }
  const [maybeStory] = record.node_id.split(":");
  return record.node_id.includes(":") && maybeStory ? maybeStory : "__world__";
}

export function recordAuthoredId(record: IndexedRecord): string | undefined {
  return stringValue(asPlainRecord(record.parsed).id) ?? bareStoryId(record.node_id) ?? undefined;
}

export function recordKey(nodeType: string, story: string, id: string): string {
  return `${nodeType}:${story}:${id}`;
}

function mapStoryRecordsById(records: IndexedRecord[]): Map<string, IndexedRecord> {
  const map = new Map<string, IndexedRecord>();
  for (const record of records) {
    const id = recordAuthoredId(record);
    if (id !== undefined) {
      map.set(recordKey(record.node_type, storyKey(record), id), record);
    }
  }
  return map;
}

function numericId(id: string): number {
  const value = Number(id.split("-").at(-1));
  return Number.isFinite(value) ? value : Number.NaN;
}

function bareStoryId(nodeId: string): string | null {
  const parts = nodeId.split(":");
  return parts.length > 1 ? parts[parts.length - 1] ?? null : nodeId;
}
