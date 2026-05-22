import type { Context, IndexedRecord, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  stringArray,
  stringValue,
  touchedFilesInclude
} from "./utils.js";

export const STCHAR_ID = /^STCHAR-(0|[1-9][0-9]*)$/;
export const STENT_ID = /^STENT-(0|[1-9][0-9]*)$/;
export const CHAR_ID = /\bCHAR-[0-9]+\b/;

const STCHAR_RELEVANT_OPS = new Set([
  "create_stent_record",
  "create_pg_record",
  "create_chc_record",
  "create_se_record",
  "create_stplan_record",
  "create_stemo_record",
  "append_story_character_authority_record",
  "supersede_story_character_authority_record"
]);

export interface StoryMaps {
  byId: Map<string, IndexedRecord>;
  byType: Map<string, IndexedRecord[]>;
}

export interface StoryReference {
  id: string;
  path: string;
}

export function appliesToStcharStoryState(ctx: Context): boolean {
  return ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => STCHAR_RELEVANT_OPS.has(String(patch.op))) === true ||
    touchedFilesInclude(
      ctx,
      /^stories\/[^/]+\/(?:_source\/(?:entities|pages|choices|events|plans|emotions)\/|story-characters\/|pages-prose-plans\/|pages-prose-receipts\/)/
    );
}

export function shouldCheckRecordInPreApply(record: IndexedRecord, ctx: Context): boolean {
  if (ctx.run_mode !== "pre-apply") {
    return true;
  }
  return ctx.patch_plan?.patches.some((patch) => {
    const payload = asPlainRecord(patch.payload);
    const parsed = asPlainRecord(payload.record);
    return stringValue(parsed.id) === stringValue(asPlainRecord(record.parsed).id);
  }) === true;
}

export function storyMaps(records: readonly IndexedRecord[], storySlug: string | null): StoryMaps {
  const byId = new Map<string, IndexedRecord>();
  const byType = new Map<string, IndexedRecord[]>();

  for (const record of records) {
    if ((record.story_slug ?? null) !== storySlug) {
      continue;
    }
    byId.set(record.node_id, record);
    const id = stringValue(asPlainRecord(record.parsed).id);
    if (id !== undefined) {
      byId.set(id, record);
    }
    const bucket = byType.get(record.node_type) ?? [];
    bucket.push(record);
    byType.set(record.node_type, bucket);
  }

  return { byId, byType };
}

export function allStorySlugs(records: readonly IndexedRecord[]): Array<string | null> {
  return [...new Set(records.map((record) => record.story_slug ?? null))];
}

export function recordId(record: IndexedRecord): string {
  return stringValue(asPlainRecord(record.parsed).id) ?? record.node_id;
}

export function pageId(page: IndexedRecord): string {
  return recordId(page);
}

export function isNonBackgroundEntity(parsed: Record<string, unknown>): boolean {
  const roles = stringArray(parsed.role_in_story);
  return roles.length !== 1 || roles[0] !== "background";
}

export function activeRecordsForPage(page: IndexedRecord): Record<string, unknown> {
  return asPlainRecord(asPlainRecord(asPlainRecord(page.parsed).state_snapshot).active_records);
}

export function activeIds(page: IndexedRecord, recordClass: string): string[] {
  return stringArray(activeRecordsForPage(page)[recordClass]);
}

export function generatedAtPageOrdinal(value: unknown): number | null {
  const page = stringValue(value);
  if (page === "story_bootstrap") {
    return 0;
  }
  const match = page?.match(/^PG-(0|[1-9][0-9]*)$/);
  return match ? Number(match[1]) : null;
}

export function recordPageOrdinal(record: IndexedRecord): number | null {
  const parsed = asPlainRecord(record.parsed);
  return generatedAtPageOrdinal(parsed.generated_at_page ?? parsed.created_at_page ?? parsed.id);
}

export function collectStringReferences(value: unknown, basePath: string, pattern: RegExp): StoryReference[] {
  const references: StoryReference[] = [];
  collectStringReferencesInto(value, basePath, pattern, references);
  return references;
}

function collectStringReferencesInto(value: unknown, path: string, pattern: RegExp, references: StoryReference[]): void {
  if (typeof value === "string") {
    for (const match of value.matchAll(new RegExp(pattern.source, "g"))) {
      references.push({ id: match[0], path });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStringReferencesInto(item, `${path}[${index}]`, pattern, references));
    return;
  }
  const record = asPlainRecord(value);
  for (const [key, nested] of Object.entries(record)) {
    collectStringReferencesInto(nested, `${path}.${key}`, pattern, references);
  }
}

export function fail(
  validator: string,
  record: IndexedRecord,
  code: string,
  message: string,
  detail?: unknown,
  suggested_fix?: string
): Verdict {
  return {
    validator,
    severity: "fail",
    code,
    message,
    location: locationFor(record),
    ...(detail === undefined ? {} : { detail }),
    ...(suggested_fix === undefined ? {} : { suggested_fix })
  };
}
