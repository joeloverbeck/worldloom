import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { readCurrentContext } from "./current-context.js";
import {
  MANUAL_RECORD_CLASSES,
  MANUAL_RECORD_CLASS_PREFIXES,
  type ManualRecord,
  type ManualRecordClass,
  type ManualRecordOfClass,
  type ManualRecordSummary,
} from "../schema/manual-story.js";
import { emptyKnownIds, type KnownIds } from "../validate/refs.js";
import { err, ok, type ReadResult } from "./result.js";

export interface ListRecordsOptions {
  includeArchived?: boolean;
}

export function listRecords(manualStoryRoot: string, recordClass: ManualRecordClass, opts: ListRecordsOptions = {}): ReadResult<ManualRecordSummary[]> {
  const includeArchived = opts.includeArchived === true;
  const targetDir = path.join(manualStoryRoot, "records", recordClass);
  if (!existsSync(targetDir)) return ok([]);
  const prefix = MANUAL_RECORD_CLASS_PREFIXES[recordClass];
  const filenamePattern = new RegExp(`^${escapeRegex(prefix)}-(\\d+)\\.yaml$`);
  const out: ManualRecordSummary[] = [];

  for (const entry of readdirSync(targetDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match = filenamePattern.exec(entry.name);
    if (!match) continue;
    const fullPath = path.join(targetDir, entry.name);
    const parsed = readYamlFile(fullPath);
    if (!parsed.ok) return err(parsed.error);
    const summary = toSummary(parsed.value);
    if (!summary) {
      return err({
        code: "schema_validation_failed",
        path: fullPath,
        repair_hint: `Record at records/${recordClass}/${entry.name} is missing required fields (id, title).`,
      });
    }
    if (!includeArchived && summary.active === false) continue;
    out.push(summary);
  }
  out.sort((a, b) =>
    extractNumericSuffix(a.id) - extractNumericSuffix(b.id),
  );
  return ok(out);
}

export function readRecord<C extends ManualRecordClass>(manualStoryRoot: string, recordClass: C, id: string): ReadResult<ManualRecordOfClass<C>> {
  const prefix = MANUAL_RECORD_CLASS_PREFIXES[recordClass];
  if (!new RegExp(`^${escapeRegex(prefix)}-\\d+$`).test(id)) {
    return err({
      code: "invalid_id_shape",
      path: path.join(manualStoryRoot, "records", recordClass, `${id}.yaml`),
      repair_hint: `Record id must match ${prefix}-<integer>.`,
    });
  }
  const fullPath = path.join(
    manualStoryRoot,
    "records",
    recordClass,
    `${id}.yaml`,
  );
  if (!existsSync(fullPath)) {
    return err({
      code: "file_not_found",
      path: fullPath,
      repair_hint: `Create records/${recordClass}/${id}.yaml or remove the reference.`,
    });
  }
  const parsed = readYamlFile(fullPath);
  if (!parsed.ok) return err(parsed.error);
  if (!toSummary(parsed.value)) {
    return err({
      code: "schema_validation_failed",
      path: fullPath,
      repair_hint: `Record at records/${recordClass}/${id}.yaml is missing required fields (id, title).`,
    });
  }
  return ok(parsed.value as ManualRecordOfClass<C>);
}

export function listAllKnownIds(manualStoryRoot: string): ReadResult<KnownIds> {
  const known = emptyKnownIds();
  for (const cls of MANUAL_RECORD_CLASSES) {
    const summariesResult = listRecords(manualStoryRoot, cls, {
      includeArchived: true,
    });
    if (!summariesResult.ok) return err(summariesResult.error);
    const summaries = summariesResult.value;
    for (const s of summaries) {
      known[cls].add(s.id);
    }
  }
  // Segments: read manual-story.yaml's segment_order if present
  const manualStoryYaml = path.join(manualStoryRoot, "manual-story.yaml");
  if (existsSync(manualStoryYaml)) {
    const parsed = readYamlFile(manualStoryYaml);
    if (!parsed.ok) return err(parsed.error);
    if (
      typeof parsed.value === "object" &&
      parsed.value !== null &&
      Array.isArray((parsed.value as { segment_order?: unknown }).segment_order)
    ) {
      for (const seg of (parsed.value as { segment_order: unknown[] }).segment_order) {
        if (typeof seg === "string") known.segments.add(seg);
      }
    }
  }
  return ok(known);
}

export interface ReferrerEntry {
  recordClass: ManualRecordClass;
  id: string;
  field: string;
}

export interface ManualRecordSummaryWithClass {
  recordClass: ManualRecordClass;
  summary: ManualRecordSummary;
}

export function scanReferences(manualStoryRoot: string, targetId: string): ReadResult<ReferrerEntry[]> {
  const referrers: ReferrerEntry[] = [];
  for (const cls of MANUAL_RECORD_CLASSES) {
    const summariesResult = listRecords(manualStoryRoot, cls, {
      includeArchived: true,
    });
    if (!summariesResult.ok) return err(summariesResult.error);
    const summaries = summariesResult.value;
    for (const summary of summaries) {
      const record = readRecord(manualStoryRoot, cls, summary.id);
      if (!record.ok) return err(record.error);
      collectReferrers(record.value, cls, targetId, referrers);
    }
  }
  const currentContextResult = collectCurrentContextReferrers(
    manualStoryRoot,
    targetId,
    referrers,
  );
  if (!currentContextResult.ok) return currentContextResult;
  const templateSidecarResult = collectTemplateSidecarReferrers(
    manualStoryRoot,
    targetId,
    referrers,
  );
  if (!templateSidecarResult.ok) return templateSidecarResult;
  return ok(referrers);
}

export function resolveReferrerSummaries(
  manualStoryRoot: string,
  targetId: string,
): ReadResult<ManualRecordSummaryWithClass[]> {
  const referrersResult = scanReferences(manualStoryRoot, targetId);
  if (!referrersResult.ok) return err(referrersResult.error);

  const grouped = new Map<string, ReferrerEntry[]>();
  for (const referrer of referrersResult.value) {
    const key = `${referrer.recordClass}\0${referrer.id}`;
    const entries = grouped.get(key);
    if (entries) {
      entries.push(referrer);
    } else {
      grouped.set(key, [referrer]);
    }
  }

  const out: ManualRecordSummaryWithClass[] = [];
  for (const entries of grouped.values()) {
    const first = entries[0];
    if (!first) continue;
    if (isRecordIdForClass(first.recordClass, first.id)) {
      const record = readRecord(manualStoryRoot, first.recordClass, first.id);
      if (!record.ok) return err(record.error);
      const summary = toSummary(record.value);
      if (!summary) {
        return err({
          code: "schema_validation_failed",
          path: path.join(
            manualStoryRoot,
            "records",
            first.recordClass,
            `${first.id}.yaml`,
          ),
          repair_hint: `Record at records/${first.recordClass}/${first.id}.yaml is missing required fields (id, title).`,
        });
      }
      out.push({ recordClass: first.recordClass, summary });
      continue;
    }

    out.push({
      recordClass: first.recordClass,
      summary: syntheticReferrerSummary(first.id, targetId, entries),
    });
  }

  return ok(out);
}

function collectReferrers(
  record: ManualRecord,
  recordClass: ManualRecordClass,
  targetId: string,
  out: ReferrerEntry[],
): void {
  const obj = record as unknown as Record<string, unknown>;
  const refs = obj.refs as
    | { characters?: unknown; locations?: unknown; related_records?: unknown }
    | undefined;
  if (refs) {
    if (Array.isArray(refs.characters)) {
      refs.characters.forEach((entry, i) => {
        if (entry === targetId) {
          out.push({ recordClass, id: record.id, field: `refs.characters[${i}]` });
        }
      });
    }
    if (Array.isArray(refs.locations)) {
      refs.locations.forEach((entry, i) => {
        if (entry === targetId) {
          out.push({ recordClass, id: record.id, field: `refs.locations[${i}]` });
        }
      });
    }
    if (Array.isArray(refs.related_records)) {
      refs.related_records.forEach((entry, i) => {
        if (entry === targetId) {
          out.push({
            recordClass,
            id: record.id,
            field: `refs.related_records[${i}]`,
          });
        }
      });
    }
  }

  // Per-class typed pointers — single string fields
  const STRING_FIELDS: Partial<Record<ManualRecordClass, string[]>> = {
    beliefs: ["holder"],
    intentions: ["holder"],
    plans: ["holder"],
    emotions: ["holder"],
    obligations: ["owed_by", "owed_to"],
    statuses: ["subject"],
    consequences: ["caused_by_segment"],
    objects: ["current_location", "current_holder"],
    artifacts: ["current_holder"],
  };
  const PAIR_FIELDS: Partial<Record<ManualRecordClass, string[]>> = {
    relationships: ["between"],
  };
  const LIST_FIELDS: Partial<Record<ManualRecordClass, string[]>> = {
    secrets: ["held_by"],
  };

  for (const f of STRING_FIELDS[recordClass] ?? []) {
    const v = obj[f];
    if (v === targetId) {
      out.push({ recordClass, id: record.id, field: f });
    }
  }
  for (const f of PAIR_FIELDS[recordClass] ?? []) {
    const v = obj[f];
    if (Array.isArray(v)) {
      v.forEach((entry, i) => {
        if (entry === targetId) {
          out.push({ recordClass, id: record.id, field: `${f}[${i}]` });
        }
      });
    }
  }
  for (const f of LIST_FIELDS[recordClass] ?? []) {
    const v = obj[f];
    if (Array.isArray(v)) {
      v.forEach((entry, i) => {
        if (entry === targetId) {
          out.push({ recordClass, id: record.id, field: `${f}[${i}]` });
        }
      });
    }
  }
}

function collectCurrentContextReferrers(
  manualStoryRoot: string,
  targetId: string,
  out: ReferrerEntry[],
): ReadResult<void> {
  const contextResult = readCurrentContext(manualStoryRoot);
  if (!contextResult.ok) return err(contextResult.error);
  const context = contextResult.value;
  if (!context) return ok(undefined);
  const recordClass = inferRecordClassFromId(targetId) ?? "facts";

  collectOptionalString(context.current_location, recordClass, "current-context", "current-context.current_location", targetId, out);
  collectOptionalString(context.pov_holder, recordClass, "current-context", "current-context.pov_holder", targetId, out);
  collectOptionalString(context.last_accepted_segment, recordClass, "current-context", "current-context.last_accepted_segment", targetId, out);
  collectOptionalString(context.last_reviewed_after_segment, recordClass, "current-context", "current-context.last_reviewed_after_segment", targetId, out);
  collectStringArray(context.current_cast, recordClass, "current-context", "current-context.current_cast", targetId, out);
  collectStringArray(context.active_pressure_clocks, recordClass, "current-context", "current-context.active_pressure_clocks", targetId, out);
  collectStringArray(context.active_secrets_questions, recordClass, "current-context", "current-context.active_secrets_questions", targetId, out);
  collectStringArray(context.pinned_records, recordClass, "current-context", "current-context.pinned_records", targetId, out);
  collectStringArray(context.excluded_records ?? [], recordClass, "current-context", "current-context.excluded_records", targetId, out);
  collectStringArray(context.must_not_reveal, recordClass, "current-context", "current-context.must_not_reveal", targetId, out);

  return ok(undefined);
}

function collectTemplateSidecarReferrers(
  manualStoryRoot: string,
  targetId: string,
  out: ReferrerEntry[],
): ReadResult<void> {
  if (!/^mtemplate-\d+$/.test(targetId)) return ok(undefined);

  const segmentsResult = collectSelectedTemplateSidecars(
    manualStoryRoot,
    "segments",
    targetId,
    "selected_template",
    out,
  );
  if (!segmentsResult.ok) return segmentsResult;
  const promptRunsResult = collectSelectedTemplateSidecars(
    manualStoryRoot,
    "prompt-runs",
    targetId,
    "included_template_path",
    out,
  );
  if (!promptRunsResult.ok) return promptRunsResult;

  return ok(undefined);
}

function collectSelectedTemplateSidecars(
  manualStoryRoot: string,
  subdir: "segments" | "prompt-runs",
  targetId: string,
  sourceField: "selected_template" | "included_template_path",
  out: ReferrerEntry[],
): ReadResult<void> {
  const dir = path.join(manualStoryRoot, subdir);
  if (!existsSync(dir)) return ok(undefined);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".yaml")) continue;
    const fullPath = path.join(dir, entry.name);
    const parsed = readYamlFile(fullPath);
    if (!parsed.ok) return err(parsed.error);
    const obj = parsed.value as Record<string, unknown>;
    const raw = obj[sourceField];
    const selectedTemplate = sourceField === "included_template_path"
      ? deriveTemplateIdFromPath(raw)
      : raw;
    if (selectedTemplate === targetId) {
      out.push({
        recordClass: "beat-templates",
        id: path.basename(entry.name, ".yaml"),
        field: `${subdir}/${entry.name}:${sourceField}`,
      });
    }
  }
  return ok(undefined);
}

function collectOptionalString(
  value: string | null | undefined,
  recordClass: ManualRecordClass,
  id: string,
  field: string,
  targetId: string,
  out: ReferrerEntry[],
): void {
  if (value === targetId) {
    out.push({ recordClass, id, field });
  }
}

function collectStringArray(
  value: readonly string[],
  recordClass: ManualRecordClass,
  id: string,
  field: string,
  targetId: string,
  out: ReferrerEntry[],
): void {
  value.forEach((entry, i) => {
    if (entry === targetId) {
      out.push({ recordClass, id, field: `${field}[${i}]` });
    }
  });
}

function toSummary(parsed: unknown): ManualRecordSummary | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.id !== "string") return null;
  if (typeof obj.title !== "string") return null;
  return {
    id: obj.id,
    title: obj.title,
    active: typeof obj.active === "boolean" ? obj.active : true,
    importance:
      typeof obj.importance === "string"
        ? (obj.importance as ManualRecordSummary["importance"])
        : "medium",
    tags: Array.isArray(obj.tags) ? (obj.tags as string[]) : [],
    summary: typeof obj.summary === "string" ? obj.summary : "",
    prompt_visibility:
      typeof obj.prompt_visibility === "string"
        ? (obj.prompt_visibility as ManualRecordSummary["prompt_visibility"])
        : "always",
    involved_cast: involvedCastFromRefs(obj.refs),
  };
}

function involvedCastFromRefs(refs: unknown): string[] {
  if (typeof refs !== "object" || refs === null) return [];
  const characters = (refs as Record<string, unknown>).characters;
  if (!Array.isArray(characters)) return [];
  return characters.filter((id): id is string => typeof id === "string");
}

function readYamlFile(fullPath: string): ReadResult<unknown> {
  let text: string;
  try {
    text = readFileSync(fullPath, "utf8");
  } catch (cause) {
    return err({
      code: "io_error",
      path: fullPath,
      cause,
      repair_hint: `Check file permissions for ${fullPath}.`,
    });
  }

  try {
    return ok(YAML.parse(text) as unknown);
  } catch (cause) {
    return err({
      code: "yaml_parse_failed",
      path: fullPath,
      cause,
      repair_hint: `Fix YAML syntax in ${fullPath}.`,
    });
  }
}

function extractNumericSuffix(id: string): number {
  const m = /-(\d+)$/.exec(id);
  if (!m) return 0;
  const n = Number.parseInt(m[1] ?? "0", 10);
  return Number.isFinite(n) ? n : 0;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRecordIdForClass(recordClass: ManualRecordClass, id: string): boolean {
  const prefix = MANUAL_RECORD_CLASS_PREFIXES[recordClass];
  return new RegExp(`^${escapeRegex(prefix)}-\\d+$`).test(id);
}

function inferRecordClassFromId(id: string): ManualRecordClass | null {
  for (const cls of MANUAL_RECORD_CLASSES) {
    const prefix = MANUAL_RECORD_CLASS_PREFIXES[cls];
    if (new RegExp(`^${escapeRegex(prefix)}-\\d+$`).test(id)) {
      return cls;
    }
  }
  return null;
}

function deriveTemplateIdFromPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /(?:^|[/\\])(mtemplate-\d+)\.yaml$/.exec(value);
  return match?.[1] ?? null;
}

function syntheticReferrerSummary(
  id: string,
  targetId: string,
  referrers: ReferrerEntry[],
): ManualRecordSummary {
  const fields = referrers.map((r) => r.field).sort();
  const title = id === "current-context" ? "Current context" : `${id} sidecar`;
  return {
    id,
    title,
    active: true,
    importance: "medium",
    tags: [],
    summary: `References ${targetId} via ${fields.join(", ")}.`,
    prompt_visibility: "always",
    involved_cast: [],
  };
}
