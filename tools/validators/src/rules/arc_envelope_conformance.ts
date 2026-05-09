import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor } from "../structural/utils.js";

const VALIDATOR = "arc_envelope_conformance";

export const arcEnvelopeConformance: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some((patch) =>
      patch.op === "create_arc_trace_record" ||
      patch.op === "create_slt_record"
    )) ||
    (ctx.run_mode === "incremental" && ctx.touched_files.some(isEnvelopeRelevantPath)),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const [traces, storylets] = await Promise.all([
      ctx.index.query({
        world_slug: ctx.world_slug,
        record_type: "arc_trace_record",
        ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
      }),
      ctx.index.query({
        world_slug: ctx.world_slug,
        record_type: "storylet_record",
        ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
      })
    ]);
    const storyletsById = new Map(storylets.map((record) => [recordId(record), record]));
    const verdicts: Verdict[] = [];

    for (const trace of traces) {
      validateTrace(verdicts, trace, storyletsById);
    }

    return verdicts;
  }
};

function validateTrace(
  verdicts: Verdict[],
  trace: IndexedRecord,
  storyletsById: ReadonlyMap<string, IndexedRecord>
): void {
  const parsedTrace = asPlainRecord(trace.parsed);
  const traceId = recordId(trace);
  const pageId = parsedTrace.created_at_page;

  if (pageId === "PG-0001" && !stringValue(parsedTrace.arc_realized)) {
    return;
  }

  const storyletId = stringValue(parsedTrace.arc_realized);
  if (!storyletId) {
    addVerdict(verdicts, trace, "fail", "arc_envelope_conformance.missing_arc", `${traceId} arc_realized must name the realized arc unless this is the PG-0001 root special case`, "arc_realized");
    return;
  }
  if (!storyletsById.has(storyletId)) {
    addVerdict(verdicts, trace, "fail", "arc_envelope_conformance.missing_arc", `${traceId} arc_realized references missing ${storyletId}`, "arc_realized");
    return;
  }

  const violations = parsedTrace.possible_violations;
  if (!Array.isArray(violations)) {
    return;
  }

  violations.filter(isRecord).forEach((violation, index) => {
    const severity = violation.severity;
    if (severity === "high") {
      addVerdict(
        verdicts,
        trace,
        "fail",
        "arc_envelope_conformance.high_severity_violation",
        `${traceId} possible_violations[${index}] is high severity and cannot be committed`,
        `possible_violations[${index}]`
      );
    } else if (severity === "medium") {
      addVerdict(
        verdicts,
        trace,
        "warn",
        "arc_envelope_conformance.medium_severity_violation",
        `${traceId} possible_violations[${index}] is medium severity and should be reviewed`,
        `possible_violations[${index}]`
      );
    } else if (severity === "low") {
      addVerdict(
        verdicts,
        trace,
        "info",
        "arc_envelope_conformance.low_severity_violation",
        `${traceId} possible_violations[${index}] is low severity and recorded for audit visibility`,
        `possible_violations[${index}]`
      );
    }
  });
}

function isEnvelopeRelevantPath(file: string): boolean {
  return /(?:^|\/)stories\/[^/]+\/_source\/(?:arc-traces\/ARCTRACE|storylets\/SLT)-\d{4}\.yaml$/.test(file);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addVerdict(
  verdicts: Verdict[],
  record: IndexedRecord,
  severity: "fail" | "warn" | "info",
  code: string,
  message: string,
  fieldPath: string
): void {
  verdicts.push({
    validator: VALIDATOR,
    severity,
    code,
    message,
    location: locationFor(record),
    suggested_fix: `Review ${fieldPath} against the realized arc execution_envelope.`
  });
}

function recordId(record: IndexedRecord): string {
  const parsed = asPlainRecord(record.parsed);
  return typeof parsed.id === "string" ? parsed.id : record.node_id.split(":").at(-1) ?? record.node_id;
}
