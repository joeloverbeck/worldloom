import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryRecordsByType,
  stringValue
} from "./utils.js";

export const SECRET_MUTATION_OPS = new Set([
  "create_stsec_record",
  "supersede_stsec_record",
  "append_secret_clue_carrier",
  "mark_secret_clue_discovered",
  "reveal_story_secret"
]);

export const CARRIER_TYPES: Readonly<Record<string, string>> = {
  DA: "story_diegetic_artifact_record",
  STOBJ: "story_object_record",
  STLOC: "story_location_record",
  BEL: "belief_record",
  SF: "story_fact_record",
  SE: "story_event_record"
};

export function secretValidatorApplies(ctx: Context): boolean {
  if (ctx.run_mode === "full-world") {
    return true;
  }
  if (ctx.run_mode === "pre-apply") {
    return (ctx.patch_plan?.patches ?? []).some((patch) => SECRET_MUTATION_OPS.has(patch.op));
  }
  return ctx.touched_files.some((file) =>
    /(?:^|\/)stories\/[^/]+\/_source\/secrets\/STSEC-\d+\.yaml$|(?:^|\/)_source\/secrets\/STSEC-\d+\.yaml$/.test(file)
  );
}

export function defineSecretValidator(
  name: string,
  runSecret: (secret: IndexedRecord, ctx: Context, records: SecretRecordSet) => Promise<Verdict[]> | Verdict[]
): Validator {
  return {
    name,
    severity_mode: "fail",
    applies_to: secretValidatorApplies,
    run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
      const records = await loadSecretRecordSet(ctx);
      const verdicts: Verdict[] = [];
      for (const secret of records.secrets) {
        verdicts.push(...await runSecret(secret, ctx, records));
      }
      return verdicts;
    }
  };
}

export interface SecretRecordSet {
  secrets: IndexedRecord[];
  carriersByTypeAndId: Map<string, IndexedRecord>;
  eventsById: Map<string, IndexedRecord>;
  mysteriesById: Map<string, IndexedRecord>;
  pagesById: Map<string, IndexedRecord>;
}

export interface ClueCarrier {
  index: number;
  kind?: string;
  record?: string;
  status?: string;
}

export async function loadSecretRecordSet(ctx: Context): Promise<SecretRecordSet> {
  const [
    secrets,
    artifacts,
    objects,
    locations,
    beliefs,
    facts,
    events,
    mysteries,
    pages
  ] = await Promise.all([
    queryRecordsByType(ctx, "story_secret_record"),
    queryRecordsByType(ctx, "story_diegetic_artifact_record"),
    queryRecordsByType(ctx, "story_object_record"),
    queryRecordsByType(ctx, "story_location_record"),
    queryRecordsByType(ctx, "belief_record"),
    queryRecordsByType(ctx, "story_fact_record"),
    queryRecordsByType(ctx, "story_event_record"),
    queryRecordsByType(ctx, "mystery_reserve_entry"),
    queryRecordsByType(ctx, "page_record")
  ]);

  const carriersByTypeAndId = new Map<string, IndexedRecord>();
  for (const record of [...artifacts, ...objects, ...locations, ...beliefs, ...facts, ...events]) {
    const id = recordAuthoredId(record);
    if (id !== undefined) {
      carriersByTypeAndId.set(carrierKey(record.node_type, storyKey(record), id), record);
    }
  }

  return {
    secrets,
    carriersByTypeAndId,
    eventsById: mapStoryRecordsById(events),
    mysteriesById: mapWorldRecordsById(mysteries),
    pagesById: mapStoryRecordsById(pages)
  };
}

export function secretId(secret: IndexedRecord): string {
  return recordAuthoredId(secret) ?? bareStoryId(secret.node_id) ?? secret.node_id;
}

export function clueCarriers(secret: IndexedRecord): ClueCarrier[] {
  const value = asPlainRecord(secret.parsed).clue_carriers;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry, index) => {
    const carrier = asPlainRecord(entry);
    const kind = stringValue(carrier.kind);
    const record = stringValue(carrier.record);
    const status = stringValue(carrier.status);
    return {
      index,
      ...(kind !== undefined ? { kind } : {}),
      ...(record !== undefined ? { record } : {}),
      ...(status !== undefined ? { status } : {})
    };
  });
}

export function carrierRecord(records: SecretRecordSet, secret: IndexedRecord, carrier: ClueCarrier): IndexedRecord | undefined {
  if (carrier.kind === undefined || carrier.record === undefined) {
    return undefined;
  }
  const nodeType = CARRIER_TYPES[carrier.kind];
  if (nodeType === undefined) {
    return undefined;
  }
  return records.carriersByTypeAndId.get(carrierKey(nodeType, storyKey(secret), carrier.record));
}

export function isInSecretBranch(secret: IndexedRecord, target: IndexedRecord, pagesById: ReadonlyMap<string, IndexedRecord>): boolean {
  const secretPageId = stringValue(asPlainRecord(secret.parsed).created_at_page);
  const targetPageId = referencePageId(target);
  if (secretPageId === undefined || targetPageId === undefined) {
    return true;
  }
  if (secretPageId === targetPageId) {
    return true;
  }
  const secretPage = pagesById.get(carrierKey("page_record", storyKey(secret), secretPageId));
  const branchPath = asPlainRecord(secretPage?.parsed).branch_path;
  return Array.isArray(branchPath) && branchPath.includes(targetPageId);
}

export function precedesReveal(secret: IndexedRecord, target: IndexedRecord, revealEvent: IndexedRecord, pagesById: ReadonlyMap<string, IndexedRecord>): boolean {
  const revealPageId = referencePageId(revealEvent);
  const targetPageId = referencePageId(target);
  if (revealPageId === undefined || targetPageId === undefined) {
    return true;
  }
  const revealPage = pagesById.get(carrierKey("page_record", storyKey(secret), revealPageId));
  const branchPath = asPlainRecord(revealPage?.parsed).branch_path;
  if (!Array.isArray(branchPath)) {
    return targetPageId === revealPageId;
  }
  const targetIndex = branchPath.indexOf(targetPageId);
  const revealIndex = branchPath.indexOf(revealPageId);
  return targetIndex >= 0 && revealIndex >= 0 && targetIndex <= revealIndex;
}

export function fail(secret: IndexedRecord, validator: string, code: string, message: string, detail?: unknown): Verdict {
  return {
    validator,
    severity: "fail",
    code,
    message: `${secretId(secret)}: ${message}`,
    location: locationFor(secret),
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

function referencePageId(record: IndexedRecord): string | undefined {
  const parsed = asPlainRecord(record.parsed);
  return stringValue(parsed.created_at_page) ?? stringValue(parsed.id);
}

function mapStoryRecordsById(records: IndexedRecord[]): Map<string, IndexedRecord> {
  const map = new Map<string, IndexedRecord>();
  for (const record of records) {
    const id = recordAuthoredId(record);
    if (id !== undefined) {
      map.set(carrierKey(record.node_type, storyKey(record), id), record);
    }
  }
  return map;
}

function mapWorldRecordsById(records: IndexedRecord[]): Map<string, IndexedRecord> {
  const map = new Map<string, IndexedRecord>();
  for (const record of records) {
    const id = recordAuthoredId(record);
    if (id !== undefined) {
      map.set(id, record);
    }
  }
  return map;
}

function carrierKey(nodeType: string, story: string, id: string): string {
  return `${nodeType}:${story}:${id}`;
}

function bareStoryId(nodeId: string): string | null {
  const parts = nodeId.split(":");
  return parts.length > 1 ? parts[parts.length - 1] ?? null : nodeId;
}
