import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringValue, touchedFilesInclude } from "./utils.js";

// This validator checks non_propagation: tag syntax and closed-reason coverage.
// Full witness coverage is performed by the sibling validator expected_witness_coverage
// (see ./expected-witness-coverage.ts). This validator remains the tag-syntax check
// for non-propagation tags.

const VALID_REASONS = new Set([
  "no_witness",
  "witness_incapacitated",
  "evidence_concealed",
  "institution_suppresses_report",
  "event_leaves_no_accessible_trace"
]);

const TAG_START = "non_propagation:";
const TAG_CANDIDATE_PATTERN = /non_propagation:[A-Za-z_]+(?:\([^)]*\))?/g;
const REASON_TOKEN_PATTERN =
  /\b(no_witness|witness_incapacitated|evidence_concealed|institution_suppresses_report|event_leaves_no_accessible_trace)\b/g;
const RECORD_ID_PATTERN = /^(?:STENT|STLOC|STOBJ|BEL|SF|SE|DA|PG|BR|CHC|SLT|SREL|STSTAT|STINT|OBL|CNSQ|THR)-\d+$/;

export const nonPropagationTagShape: Validator = {
  name: "non_propagation_tag_shape",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_se_record") === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/events\/SE-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const event of records.filter((record) => record.node_type === "story_event_record")) {
      verdicts.push(...validateEvent(event));
    }

    return verdicts;
  }
};

function validateEvent(event: IndexedRecord): Verdict[] {
  const parsed = asPlainRecord(event.parsed);
  const rationale = stringValue(parsed.world_logic_rationale);
  if (rationale === undefined) {
    return [];
  }

  const verdicts: Verdict[] = [];
  const candidates = [...rationale.matchAll(TAG_CANDIDATE_PATTERN)];
  const validRanges: Array<[number, number]> = [];
  const malformedRanges: Array<[number, number]> = [];

  for (const candidate of candidates) {
    const tag = candidate[0];
    const start = candidate.index ?? 0;
    const end = start + tag.length;
    const parsedTag = parseTag(tag);

    if (parsedTag.valid) {
      validRanges.push([start, end]);
    } else {
      malformedRanges.push([start, end]);
      verdicts.push(malformed(event, tag, parsedTag.reason));
    }
  }

  const coveredRanges = [...validRanges, ...malformedRanges];
  for (const reason of rationale.matchAll(REASON_TOKEN_PATTERN)) {
    const start = reason.index ?? 0;
    if (isInsideAnyRange(start, coveredRanges)) {
      continue;
    }
    verdicts.push(missing(event, reason[1] ?? ""));
  }

  return verdicts;
}

function parseTag(tag: string): { valid: true } | { valid: false; reason: string } {
  if (!tag.startsWith(TAG_START)) {
    return { valid: false, reason: "Tag must start with non_propagation:." };
  }

  const match = /^non_propagation:([A-Za-z_]+)\(group=([^,()[\]\s]+), records=\[([^\]]*)\]\)$/.exec(tag);
  if (!match) {
    return { valid: false, reason: "Tag must match non_propagation:<reason>(group=<label>, records=[<record_ids>])." };
  }

  const reason = match[1] ?? "";
  const recordsRaw = match[3] ?? "";
  if (!VALID_REASONS.has(reason)) {
    return { valid: false, reason: `${reason} is not a valid non-propagation reason.` };
  }

  const records = recordsRaw.trim().length === 0
    ? []
    : recordsRaw.split(",").map((record) => record.trim());
  const invalidRecord = records.find((record) => !RECORD_ID_PATTERN.test(record));
  if (invalidRecord !== undefined) {
    return { valid: false, reason: `${invalidRecord} is not a valid record id in records=[...].` };
  }

  return { valid: true };
}

function isInsideAnyRange(index: number, ranges: ReadonlyArray<readonly [number, number]>): boolean {
  return ranges.some(([start, end]) => index >= start && index < end);
}

function malformed(event: IndexedRecord, tag: string, detail: string): Verdict {
  return {
    validator: "non_propagation_tag_shape",
    severity: "warn",
    code: "expected_witness_tag_malformed",
    message: `${event.node_id} has malformed non-propagation tag ${tag}.`,
    location: locationFor(event),
    detail: { tag, reason: detail },
    suggested_fix: "Use non_propagation:<reason>(group=<label>, records=[<record_ids>]) inside SE.world_logic_rationale."
  };
}

function missing(event: IndexedRecord, reason: string): Verdict {
  return {
    validator: "non_propagation_tag_shape",
    severity: "fail",
    code: "expected_witness_tag_missing",
    message: `${event.node_id} names non-propagation reason ${reason} without a parseable non_propagation tag.`,
    location: locationFor(event),
    detail: { reason },
    suggested_fix: "Carry closed-set non-propagation rationales as parseable tags in SE.world_logic_rationale."
  };
}
