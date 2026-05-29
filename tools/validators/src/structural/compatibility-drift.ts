import { existsSync } from "node:fs";
import path from "node:path";

import {
  OPTIONAL_ACTIVE_RECORDS_CLASSES,
  type ActiveRecordsClass
} from "../_helpers/state-snapshot-replay.js";
import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringValue,
  worldRootFrom
} from "./utils.js";

const OPTIONAL_SUBDIRECTORIES: Readonly<Record<OptionalActiveRecordsClass, string>> = {
  CLK: "_source/clocks",
  STSEC: "_source/secrets",
  STQ: "_source/story-questions",
  STPLAN: "_source/plans",
  STEMO: "_source/emotions",
  DA: "_source/artifacts"
};

type OptionalActiveRecordsClass = (typeof OPTIONAL_ACTIVE_RECORDS_CLASSES)[number];
type CompatibilityClassification =
  | "current_contract"
  | "compatible_optional_absence"
  | "grandfathered_snapshot_shape"
  | "compatible_with_advisory"
  | "requires_compatibility_audit"
  | "requires_migration_patch"
  | "manual_review"
  | "blocked_contract_break";

interface StoryScope {
  slug: string;
  pages: IndexedRecord[];
  records: IndexedRecord[];
}

export const compatibilityDrift: Validator = {
  name: "compatibility_drift",
  severity_mode: "info",
  applies_to: (ctx: Context) =>
    ctx.run_mode !== "pre-apply" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_pg_record") === true,
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const worldRoot = worldRootFrom(input, ctx);
    return stories(records, ctx).flatMap((story) => verdictsForStory(story, ctx, worldRoot));
  }
};

function stories(records: readonly IndexedRecord[], ctx: Context): StoryScope[] {
  const bySlug = new Map<string, IndexedRecord[]>();
  for (const record of records) {
    const slug = record.story_slug ?? storySlugFromPath(record.file_path);
    if (slug === undefined) {
      continue;
    }
    if (ctx.story_slug !== undefined && slug !== ctx.story_slug) {
      continue;
    }
    const bucket = bySlug.get(slug) ?? [];
    bucket.push(record);
    bySlug.set(slug, bucket);
  }

  return [...bySlug.entries()]
    .map(([slug, scopedRecords]) => ({
      slug,
      pages: scopedRecords.filter((record) => record.node_type === "page_record"),
      records: scopedRecords
    }))
    .filter((story) => story.pages.length > 0);
}

function verdictsForStory(story: StoryScope, ctx: Context, worldRoot: string | undefined): Verdict[] {
  const verdicts: Verdict[] = [];
  const classifications = new Set<CompatibilityClassification>();

  for (const [recordClass, subdir] of Object.entries(OPTIONAL_SUBDIRECTORIES) as Array<[OptionalActiveRecordsClass, string]>) {
    if (optionalSubdirectoryExists(story, recordClass, subdir, worldRoot)) {
      continue;
    }
    classifications.add("compatible_optional_absence");
    verdicts.push({
      validator: "compatibility_drift",
      severity: "info",
      code: "compat_optional_directory_absent",
      message: `${story.slug} is missing optional story-bundle directory ${subdir}; this is compatible optional absence in Wave 2.`,
      location: storyLocation(story),
      detail: {
        story_slug: story.slug,
        record_class: recordClass,
        subdirectory: subdir,
        classification: "compatible_optional_absence"
      },
      suggested_fix: "No fiction repair is required. Create the directory only when a future accepted record of that class is written."
    });
  }

  const pageById = new Map<string, IndexedRecord>();
  for (const page of story.pages) {
    const id = stringValue(asPlainRecord(page.parsed).id);
    if (id !== undefined) {
      pageById.set(id, page);
    }
  }

  for (const page of story.pages) {
    const pageRecord = asPlainRecord(page.parsed);
    const missingKeys = missingOptionalActiveRecordKeys(pageRecord);
    if (missingKeys.length === 0) {
      continue;
    }

    // Hard replay validators normalize missing optional keys to [] for legacy
    // compatibility, but current pages still carry the full map so fork/hash
    // review has one explicit per-class audit surface.
    const severity = isCreatedPageInPlan(pageRecord, ctx) || hasCurrentContractParent(pageRecord, pageById) ? "warn" : "info";
    const classification: CompatibilityClassification = severity === "warn"
      ? "requires_migration_patch"
      : "grandfathered_snapshot_shape";
    classifications.add(classification);

    verdicts.push({
      validator: "compatibility_drift",
      severity,
      code: severity === "warn" ? "compat_requires_migration_patch" : "compat_missing_active_record_key",
      message: `${pageId(pageRecord)} state_snapshot.active_records omits ${missingKeys.join(", ")}; ${severity === "warn" ? "new/current-contract pages must materialize the full active-record map" : "legacy parent snapshots are grandfathered and read as empty arrays"}.`,
      location: locationFor(page),
      detail: {
        story_slug: story.slug,
        page_id: pageId(pageRecord),
        missing_keys: missingKeys,
        classification
      },
      suggested_fix: severity === "warn"
        ? `Materialize ${missingKeys.join(", ")} as empty arrays on the new PG state_snapshot.active_records map.`
        : "Do not rewrite the historical PG only to add empty optional keys; replay validators normalize the missing keys to []."
    });
  }

  if (classifications.size === 0) {
    classifications.add("current_contract");
  }
  verdicts.push(classificationVerdict(story, classifications));
  return verdicts;
}

function missingOptionalActiveRecordKeys(page: Record<string, unknown>): OptionalActiveRecordsClass[] {
  const activeRecords = asPlainRecord(asPlainRecord(page.state_snapshot).active_records);
  if (Object.keys(activeRecords).length === 0) {
    return [];
  }
  return OPTIONAL_ACTIVE_RECORDS_CLASSES.filter((recordClass) => !Array.isArray(activeRecords[recordClass]));
}

function optionalSubdirectoryExists(
  story: StoryScope,
  recordClass: OptionalActiveRecordsClass,
  subdir: string,
  worldRoot: string | undefined
): boolean {
  if (worldRoot !== undefined && existsSync(path.join(worldRoot, "stories", story.slug, subdir))) {
    return true;
  }

  if (story.records.some((record) => classForRecord(record) === recordClass)) {
    return true;
  }

  const needle = `/stories/${story.slug}/${subdir}/`;
  return story.records.some((record) => `/${record.file_path}`.includes(needle));
}

function classForRecord(record: IndexedRecord): ActiveRecordsClass | undefined {
  switch (record.node_type) {
    case "pressure_clock_record":
      return "CLK";
    case "story_secret_record":
      return "STSEC";
    case "story_question_record":
      return "STQ";
    case "story_plan_record":
      return "STPLAN";
    case "story_emotion_record":
      return "STEMO";
    case "story_diegetic_artifact_record":
      return "DA";
    default:
      return undefined;
  }
}

function hasCurrentContractParent(page: Record<string, unknown>, pageById: ReadonlyMap<string, IndexedRecord>): boolean {
  const parentId = stringValue(page.parent_page_id);
  if (parentId === undefined) {
    return false;
  }
  const parent = pageById.get(parentId);
  if (parent === undefined) {
    return false;
  }
  return missingOptionalActiveRecordKeys(asPlainRecord(parent.parsed)).length === 0;
}

function isCreatedPageInPlan(page: Record<string, unknown>, ctx: Context): boolean {
  const pageIdValue = stringValue(page.id);
  if (pageIdValue === undefined) {
    return false;
  }
  return ctx.patch_plan?.patches.some((patch) => {
    if (patch.op !== "create_pg_record") {
      return false;
    }
    const payload = patch.payload as { record?: unknown };
    return stringValue(asPlainRecord(payload.record).id) === pageIdValue;
  }) === true;
}

function classificationVerdict(
  story: StoryScope,
  classifications: ReadonlySet<CompatibilityClassification>
): Verdict {
  const ordered = [...classifications].sort();
  return {
    validator: "compatibility_drift",
    severity: "info",
    code: "compatibility_drift.classification",
    message: `${story.slug} compatibility-drift classification: ${ordered.join(", ")}`,
    location: storyLocation(story),
    detail: {
      story_slug: story.slug,
      classifications: ordered
    }
  };
}

function storyLocation(story: StoryScope): Verdict["location"] {
  return story.pages[0] === undefined
    ? { file: `stories/${story.slug}`, node_id: story.slug }
    : locationFor(story.pages[0]);
}

function storySlugFromPath(filePath: string): string | undefined {
  const match = filePath.match(/(?:^|\/)stories\/([^/]+)\//);
  return match?.[1];
}

function pageId(page: Record<string, unknown>): string {
  return stringValue(page.id) ?? "<unknown page>";
}
