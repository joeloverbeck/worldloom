import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor } from "../structural/utils.js";

const VALIDATOR = "narrative_point_classification";

const NARRATIVE_POINTS = [
  "CONTINUE_ARC",
  "NATURAL_COMMITMENT_HINGE",
  "INTERRUPT_HINGE",
  "CONTINUE_ONLY_PAUSE",
  "TERMINAL_OR_CHAPTER_CLOSE"
] as const;

const NARRATIVE_POINT_SET = new Set<string>(NARRATIVE_POINTS);

const CLASSIFICATION_TO_STOP_CATEGORY: Readonly<Record<string, string>> = {
  NATURAL_COMMITMENT_HINGE: "normal_exit",
  INTERRUPT_HINGE: "interrupt_before",
  CONTINUE_ONLY_PAUSE: "safety_valve"
};

export const narrativePointClassification: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some((patch) =>
      patch.op === "create_pg_record" ||
      patch.op === "create_arc_trace_record"
    )) ||
    (ctx.run_mode === "incremental" && ctx.touched_files.some(isNarrativePointRelevantPath)),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const [pages, traces] = await Promise.all([
      ctx.index.query({
        world_slug: ctx.world_slug,
        record_type: "page_record",
        ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
      }),
      ctx.index.query({
        world_slug: ctx.world_slug,
        record_type: "arc_trace_record",
        ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
      })
    ]);
    const tracesById = new Map(traces.map((record) => [recordId(record), record]));
    const tracesByPage = new Map(traces.map((record) => [String(asPlainRecord(record.parsed).created_at_page ?? ""), record]));
    const verdicts: Verdict[] = [];

    for (const page of pages) {
      validatePage(verdicts, page, tracesById, tracesByPage);
    }

    return verdicts;
  }
};

function validatePage(
  verdicts: Verdict[],
  page: IndexedRecord,
  tracesById: ReadonlyMap<string, IndexedRecord>,
  tracesByPage: ReadonlyMap<string, IndexedRecord>
): void {
  const parsedPage = asPlainRecord(page.parsed);
  const pageId = recordId(page);
  const stateSnapshot = asPlainRecord(parsedPage.state_snapshot);
  const classification = stateSnapshot.narrative_point_classification;

  if (pageId === "PG-0001" && classification === "NATURAL_COMMITMENT_HINGE") {
    return;
  }

  if (typeof classification !== "string" || !NARRATIVE_POINT_SET.has(classification)) {
    addFailure(
      verdicts,
      page,
      "narrative_point_classification.unknown_classification",
      `${pageId} state_snapshot.narrative_point_classification must be one of ${NARRATIVE_POINTS.join(", ")}`,
      "state_snapshot.narrative_point_classification"
    );
    return;
  }

  const expectedCategory = CLASSIFICATION_TO_STOP_CATEGORY[classification];
  if (!expectedCategory) {
    return;
  }

  const traceId = typeof stateSnapshot.arc_trace_id === "string" ? stateSnapshot.arc_trace_id : undefined;
  const trace = (traceId ? tracesById.get(traceId) : undefined) ?? tracesByPage.get(pageId);
  if (!trace) {
    addFailure(
      verdicts,
      page,
      "narrative_point_classification.missing_arc_trace",
      `${pageId} classification ${classification} requires an ARC_TRACE stop_condition_hit for consistency checking`,
      "state_snapshot.arc_trace_id"
    );
    return;
  }

  const category = asPlainRecord(asPlainRecord(trace.parsed).stop_condition_hit).category;
  if (category !== expectedCategory) {
    addFailure(
      verdicts,
      page,
      "narrative_point_classification.inconsistent_stop_category",
      `${pageId} classification ${classification} requires ARC_TRACE.stop_condition_hit.category '${expectedCategory}', got '${String(category)}'`,
      "state_snapshot.narrative_point_classification"
    );
  }
}

function isNarrativePointRelevantPath(file: string): boolean {
  return /(?:^|\/)stories\/[^/]+\/_source\/(?:pages\/PG|arc-traces\/ARCTRACE)-\d{4}\.yaml$/.test(file);
}

function addFailure(verdicts: Verdict[], record: IndexedRecord, code: string, message: string, fieldPath: string): void {
  verdicts.push({
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(record),
    suggested_fix: `Correct ${fieldPath} so the page's narrative point matches its ARC_TRACE stop category.`
  });
}

function recordId(record: IndexedRecord): string {
  const parsed = asPlainRecord(record.parsed);
  return typeof parsed.id === "string" ? parsed.id : record.node_id.split(":").at(-1) ?? record.node_id;
}
