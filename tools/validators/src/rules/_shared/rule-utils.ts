import type { Context, IndexedRecord, Verdict } from "../../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryRecordsByType,
  stringArray,
  touchedFilesInclude
} from "../../structural/utils.js";

export function appliesToCanonFacts(ctx: Context): boolean {
  return ctx.run_mode !== "incremental" || touchedFilesInclude(ctx, /_source\/canon\/CF-\d{4}\.yaml$/);
}

export function appliesToCanonFactsOrChangeLogs(ctx: Context): boolean {
  return (
    ctx.run_mode !== "incremental" ||
    touchedFilesInclude(ctx, /_source\/(canon\/CF-\d{4}|change-log\/CH-\d{4})\.yaml$/)
  );
}

export function appliesToMysteryReserve(ctx: Context): boolean {
  return ctx.run_mode !== "incremental" || touchedFilesInclude(ctx, /_source\/mystery-reserve\/M-\d+\.yaml$/);
}

export async function queryCanonFacts(ctx: Context): Promise<IndexedRecord[]> {
  return queryRecordsByType(ctx, "canon_fact_record");
}

export async function queryChangeLogs(ctx: Context): Promise<IndexedRecord[]> {
  return queryRecordsByType(ctx, "change_log_entry");
}

export async function queryMysteryReserve(ctx: Context): Promise<IndexedRecord[]> {
  return queryRecordsByType(ctx, "mystery_reserve_entry");
}

export function nonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

export function fail(
  validator: string,
  code: string,
  message: string,
  record: IndexedRecord
): Verdict {
  return {
    validator,
    severity: "fail",
    code,
    message,
    location: locationFor(record)
  };
}

export function recordIdFrom(record: IndexedRecord): string {
  const parsed = asPlainRecord(record.parsed);
  return typeof parsed.id === "string" ? parsed.id : record.node_id;
}

export function requiredWorldUpdates(record: IndexedRecord): string[] {
  return stringArray(asPlainRecord(record.parsed).required_world_updates);
}
