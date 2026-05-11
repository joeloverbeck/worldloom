import { Buffer } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor } from "../structural/utils.js";

const VALIDATOR = "arc_trace_evidence_alignment";

export const arcTraceEvidenceAlignment: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some((patch) =>
      patch.op === "create_arc_trace_record" ||
      patch.op === "create_pg_record" ||
      patch.op === "create_slt_record"
    )) ||
    (ctx.run_mode === "incremental" && ctx.touched_files.some(isTraceEvidenceRelevantPath)),
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const [traces, pages, storylets] = await Promise.all([
      ctx.index.query({
        world_slug: ctx.world_slug,
        record_type: "arc_trace_record",
        ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
      }),
      ctx.index.query({
        world_slug: ctx.world_slug,
        record_type: "page_record",
        ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
      }),
      ctx.index.query({
        world_slug: ctx.world_slug,
        record_type: "storylet_record",
        ...(ctx.story_slug ? { story_slug: ctx.story_slug } : {})
      })
    ]);
    const pagesById = new Map(pages.map((record) => [recordId(record), record]));
    const storyletsById = new Map(storylets.map((record) => [recordId(record), record]));
    const verdicts: Verdict[] = [];

    for (const trace of traces) {
      validateTrace(verdicts, trace, pagesById, storyletsById, input, ctx);
    }

    return verdicts;
  }
};

function validateTrace(
  verdicts: Verdict[],
  trace: IndexedRecord,
  pagesById: ReadonlyMap<string, IndexedRecord>,
  storyletsById: ReadonlyMap<string, IndexedRecord>,
  input: unknown,
  ctx: Context
): void {
  const parsedTrace = asPlainRecord(trace.parsed);
  const traceId = recordId(trace);
  const pageId = stringValue(parsedTrace.created_at_page);
  const arcId = stringValue(parsedTrace.arc_realized);

  if (!pageId) {
    addFailure(verdicts, trace, "arc_trace_evidence_alignment.missing_page_ref", `${traceId} created_at_page must reference a PG record`, "created_at_page");
    return;
  }

  const page = pagesById.get(pageId);
  if (!page) {
    addFailure(verdicts, trace, "arc_trace_evidence_alignment.missing_page", `${traceId} created_at_page references missing ${pageId}`, "created_at_page");
    return;
  }

  const parsedPage = asPlainRecord(page.parsed);
  const proseStatus = stringValue(parsedPage.prose_status) ?? "rendered";
  if (proseStatus !== "rendered") {
    verdicts.push({
      validator: VALIDATOR,
      severity: "info",
      code: "arc_trace_evidence_alignment.deferred_prose_pending",
      message: `DEFERRED — referenced page ${pageId} has prose_status="${proseStatus}"; rule re-runs at finalize when prose is rendered`,
      location: locationFor(trace)
    });
    return;
  }

  const prose = proseForPage(page, input, ctx);
  if (prose === undefined) {
    addFailure(verdicts, trace, "arc_trace_evidence_alignment.missing_page_prose", `${traceId} cannot verify evidence spans because ${pageId} prose is unavailable`, "created_at_page");
  } else {
    validateAllSpans(verdicts, trace, parsedTrace, Buffer.byteLength(prose, "utf8"));
  }

  if (!arcId) {
    addFailure(verdicts, trace, "arc_trace_evidence_alignment.missing_arc_ref", `${traceId} arc_realized must reference an SLT record`, "arc_realized");
    return;
  }

  const storylet = storyletsById.get(arcId);
  if (!storylet) {
    addFailure(verdicts, trace, "arc_trace_evidence_alignment.missing_arc", `${traceId} arc_realized references missing ${arcId}`, "arc_realized");
    return;
  }

  validateEffectEvidence(verdicts, trace, parsedTrace, storylet);
  validateStopCondition(verdicts, trace, parsedTrace, storylet);
}

function validateAllSpans(
  verdicts: Verdict[],
  trace: IndexedRecord,
  parsedTrace: Record<string, unknown>,
  proseLength: number
): void {
  const traceId = recordId(trace);
  for (const { path: spanPath, span } of evidenceSpans(parsedTrace)) {
    const start = span.start;
    const end = span.end;
    if (
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end <= start ||
      end > proseLength
    ) {
      addFailure(
        verdicts,
        trace,
        "arc_trace_evidence_alignment.invalid_evidence_span",
        `${traceId} ${spanPath} must be a valid byte-offset range within the cited page prose`,
        spanPath
      );
    }
  }
}

function validateEffectEvidence(
  verdicts: Verdict[],
  trace: IndexedRecord,
  parsedTrace: Record<string, unknown>,
  storylet: IndexedRecord
): void {
  const traceId = recordId(trace);
  const variantId = stringValue(parsedTrace.effect_variant_applied);
  if (!variantId) {
    addFailure(verdicts, trace, "arc_trace_evidence_alignment.missing_effect_variant", `${traceId} effect_variant_applied must name the realized arc variant`, "effect_variant_applied");
    return;
  }

  const variant = variantById(storylet, variantId);
  if (!variant) {
    addFailure(verdicts, trace, "arc_trace_evidence_alignment.unknown_effect_variant", `${traceId} effect_variant_applied '${variantId}' is not a variant id on ${recordId(storylet)}`, "effect_variant_applied");
    return;
  }

  const requiredEffects = Array.isArray(variant.required_effects) ? variant.required_effects.filter(isRecord) : [];
  const effectEvidence = Array.isArray(parsedTrace.effect_evidence) ? parsedTrace.effect_evidence.filter(isRecord) : [];
  effectEvidence.forEach((evidence, index) => {
    const effectRef = evidence.effect_ref;
    if (
      typeof effectRef !== "number" ||
      !Number.isInteger(effectRef) ||
      effectRef < 0 ||
      effectRef >= requiredEffects.length
    ) {
      addFailure(
        verdicts,
        trace,
        "arc_trace_evidence_alignment.effect_ref_out_of_range",
        `${traceId} effect_evidence[${index}].effect_ref points outside ${recordId(storylet)} variant '${variantId}' required_effects[]`,
        `effect_evidence[${index}].effect_ref`
      );
    }
  });
}

function validateStopCondition(
  verdicts: Verdict[],
  trace: IndexedRecord,
  parsedTrace: Record<string, unknown>,
  storylet: IndexedRecord
): void {
  const stopCondition = asPlainRecord(parsedTrace.stop_condition_hit);
  const stopId = stringValue(stopCondition.id);
  if (!stopId) {
    addFailure(verdicts, trace, "arc_trace_evidence_alignment.missing_stop_condition_id", `${recordId(trace)} stop_condition_hit.id must be populated`, "stop_condition_hit.id");
    return;
  }

  if (!stopConditionIds(storylet).has(stopId)) {
    addFailure(
      verdicts,
      trace,
      "arc_trace_evidence_alignment.unknown_stop_condition",
      `${recordId(trace)} stop_condition_hit.id '${stopId}' does not reference a real stop_policy entry on ${recordId(storylet)}`,
      "stop_condition_hit.id"
    );
  }
}

function* evidenceSpans(value: unknown, basePath = ""): Generator<{ path: string; span: Record<string, unknown> }> {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      yield* evidenceSpans(value[index], `${basePath}[${index}]`);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = basePath ? `${basePath}.${key}` : key;
    if (key === "evidence_span" && isRecord(child)) {
      yield { path: childPath, span: child };
      continue;
    }
    yield* evidenceSpans(child, childPath);
  }
}

function proseForPage(page: IndexedRecord, input: unknown, ctx: Context): string | undefined {
  const parsedPage = asPlainRecord(page.parsed);
  for (const key of ["prose", "body", "body_markdown", "content"]) {
    const value = parsedPage[key];
    if (typeof value === "string") {
      return value;
    }
  }

  const pageId = recordId(page);
  const storySlug = page.story_slug ?? storySlugFromFile(page.file_path);
  if (!storySlug) {
    return undefined;
  }

  const inputRecord = asPlainRecord(input);
  const explicitFiles = inputRecord.files;
  if (Array.isArray(explicitFiles)) {
    const expectedPath = `stories/${storySlug}/pages-prose/${pageId}.md`;
    const explicit = explicitFiles
      .filter(isRecord)
      .find((file) => file.path === expectedPath || file.path === `worlds/${ctx.world_slug}/${expectedPath}`);
    if (typeof explicit?.content === "string") {
      return explicit.content;
    }
  }

  const worldRoot = worldRootFor(input, ctx);
  if (!worldRoot) {
    return undefined;
  }
  const prosePath = path.join(worldRoot, "stories", storySlug, "pages-prose", `${pageId}.md`);
  return existsSync(prosePath) ? readFileSync(prosePath, "utf8") : undefined;
}

function worldRootFor(input: unknown, ctx: Context): string | undefined {
  const record = asPlainRecord(input);
  const direct = stringValue(record.world_root) ?? stringValue(record.worldRoot);
  if (direct) {
    return path.resolve(direct);
  }
  const candidates = [
    path.resolve(process.cwd(), "worlds", ctx.world_slug),
    path.resolve(process.cwd(), "../..", "worlds", ctx.world_slug)
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function storySlugFromFile(filePath: string): string | undefined {
  const match = /(?:^|\/)stories\/([^/]+)\//.exec(filePath);
  return match?.[1];
}

function variantById(storylet: IndexedRecord, variantId: string): Record<string, unknown> | undefined {
  const variants = asPlainRecord(asPlainRecord(storylet.parsed).effect_model).variants;
  if (!Array.isArray(variants)) {
    return undefined;
  }
  return variants.filter(isRecord).find((variant) => variant.id === variantId);
}

function stopConditionIds(storylet: IndexedRecord): Set<string> {
  const stopPolicy = asPlainRecord(asPlainRecord(storylet.parsed).stop_policy);
  const ids = new Set<string>();
  for (const field of ["normal_exits", "interrupt_before"]) {
    const entries = stopPolicy[field];
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries.filter(isRecord)) {
      const id = stringValue(entry.id);
      if (id) {
        ids.add(id);
      }
    }
  }
  const safetyValves = asPlainRecord(stopPolicy.safety_valves);
  for (const key of Object.keys(safetyValves)) {
    ids.add(key);
  }
  return ids;
}

function isTraceEvidenceRelevantPath(file: string): boolean {
  return /(?:^|\/)stories\/[^/]+\/(?:_source\/(?:arc-traces\/ARCTRACE|pages\/PG|storylets\/SLT)-\d{4}\.yaml|pages-prose\/PG-\d{4}\.md)$/.test(file);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addFailure(verdicts: Verdict[], record: IndexedRecord, code: string, message: string, fieldPath: string): void {
  verdicts.push({
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(record),
    suggested_fix: `Correct ${fieldPath} so ARC_TRACE evidence references real prose, effects, and stop-policy entries.`
  });
}

function recordId(record: IndexedRecord): string {
  const parsed = asPlainRecord(record.parsed);
  return typeof parsed.id === "string" ? parsed.id : record.node_id.split(":").at(-1) ?? record.node_id;
}
