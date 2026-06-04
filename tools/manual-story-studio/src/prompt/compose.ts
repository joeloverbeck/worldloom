// Deterministic 12-stage prompt composition pipeline.
//
// SPEC-102 §Scope item 2 — every input is a record file or a known doc
// file, every stage is testable in isolation, and every emitted prompt is
// byte-identical given the same inputs. Disk reads (content-policy and
// prose-craft-contract) happen at compose time (stages 6 / 7) so doc
// edits flow through without rebuilding.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { readPromptWorkingSet } from "../read/prompt-working-set.js";
import { readManualStoryMetadata } from "../read/manual-story-metadata.js";
import { listRecords, readRecord } from "../read/records.js";
import type { BeatTemplate } from "../schema/beat-template.js";
import type { PromptWorkingSet } from "../schema/prompt-working-set.js";
import type {
  ManualCharacterRecord,
  ManualRecord,
  ManualRecordClass,
  RecordCommonFields,
} from "../schema/manual-story.js";
import { validateBeatTemplate } from "../validate/beat-template-schema.js";
import { lintPrompt } from "./lint.js";
import { classifyManualRecordId } from "./record-class.js";
import { assembleSections } from "./sections/index.js";
import type { TranslatorContext } from "./translators/index.js";
import { assertInsideSandbox, type ManualStoryRoot } from "../write/sandbox.js";
import type {
  PromptComposeInput,
  PromptComposeResult,
  PromptExcludedRecord,
  PromptIncludedReason,
  PromptResolution,
  PromptLintFinding,
  PromptLintResult,
} from "./types.js";
import "./translators/all.js";

const CONTENT_POLICY_REL =
  "docs/prose-renderer-contract/content-policy.md";
const PROSE_CRAFT_CONTRACT_REL =
  "docs/manual-story-studio/prose-craft-contract.md";

function manualStoryRootForInput(input: PromptComposeInput): ManualStoryRoot {
  const relative = path.relative(input.repoRoot, input.manualStoryRoot);
  const segments = relative.split(path.sep);
  const worldSlug = segments[1] ?? "";
  const manualStorySlug = segments[3] ?? "";
  return {
    repoRoot: input.repoRoot,
    worldSlug,
    manualStorySlug,
    absolutePath: input.manualStoryRoot,
  };
}

function hardFinding(rule: string, message: string): PromptLintFinding {
  return { rule, tier: "hard", message };
}

function earlyExit(
  findings: PromptLintFinding[],
  sidecarDraft: PromptComposeResult["sidecar_draft"],
): PromptComposeResult {
  const lint: PromptLintResult = {
    findings,
    cleanForCopy: false,
    blockingForCopy: findings.some((f) => f.tier === "hard"),
  };
  return {
    markdown: "",
    lint,
    sidecar_draft: sidecarDraft,
    resolution: resolutionFromFindings(findings),
  };
}

export async function composePrompt(
  input: PromptComposeInput,
): Promise<PromptComposeResult> {
  const sidecarDraft: PromptComposeResult["sidecar_draft"] = {
    manual_story_slug: "",
    included_cast: input.included_cast,
    included_records: input.included_records,
    included_template_path: input.included_template_path ?? null,
    moment_directive: input.moment_directive,
  };

  // Stage 1 — Validate moment directive is non-empty.
  if (input.moment_directive.trim().length === 0) {
    return earlyExit(
      [
        hardFinding(
          "moment_directive_present",
          "The moment directive must be non-empty.",
        ),
      ],
      sidecarDraft,
    );
  }

  // Stage 2 — Load metadata + prose preferences.
  const metadataResult = readManualStoryMetadata(input.manualStoryRoot);
  if (!metadataResult.ok) {
    throw new Error(
      `manual_story_metadata_unavailable: ${metadataResult.error.code} at ${metadataResult.error.path}`,
    );
  }
  const metadata = metadataResult.value;
  sidecarDraft.manual_story_slug = metadata.manual_story_slug;

  // Stage 2.5 — Load optional prompt-working-set selector.
  const promptWorkingSetResult = readPromptWorkingSet(input.manualStoryRoot);
  if (!promptWorkingSetResult.ok) {
    throw new Error(
      `prompt_working_set_unavailable: ${promptWorkingSetResult.error.code} at ${promptWorkingSetResult.error.path}`,
    );
  }
  const promptWorkingSet = promptWorkingSetResult.value;
  const seededCastIds =
    promptWorkingSet && promptWorkingSet.current_cast.length > 0
      ? promptWorkingSet.current_cast.slice()
      : input.included_cast.slice();
  const unfilteredSeededRecordIds = mergeIds(
    input.included_records,
    [
      ...(promptWorkingSet?.current_location ? [promptWorkingSet.current_location] : []),
      ...(promptWorkingSet?.active_pressure_clocks ?? []),
      ...(promptWorkingSet?.pinned_records ?? []),
      ...(promptWorkingSet?.active_secrets_questions ?? []),
      ...(promptWorkingSet?.must_not_reveal ?? []),
    ],
  );
  const seedReasons = seedReasonMap(input, promptWorkingSet);
  const excludedRecordIds = new Set(promptWorkingSet?.excluded_records ?? []);
  const resolution: PromptResolution = {
    included: [],
    excluded: [],
    suppressed: [],
    blocked: [],
    section_map: {},
  };
  const seededRecordIds: string[] = [];
  for (const id of unfilteredSeededRecordIds) {
    if (excludedRecordIds.has(id)) {
      const excluded = describeExistingRecord(
        input.manualStoryRoot,
        id,
        "working_set_excluded",
      );
      if (excluded) {
        resolution.excluded.push(excluded);
      }
      continue;
    }
    seededRecordIds.push(id);
  }
  sidecarDraft.included_cast = seededCastIds.slice();
  sidecarDraft.included_records = seededRecordIds.slice();

  // Stage 3 — Load selected cast profiles.
  const cast: ManualCharacterRecord[] = [];
  const missingCastFindings: PromptLintFinding[] = [];
  for (const id of seededCastIds) {
    const rec = readRecord(input.manualStoryRoot, "cast", id);
    if (!rec.ok) {
      missingCastFindings.push(
        hardFinding(
          rec.error.code === "file_not_found"
            ? "selected_cast_exists"
            : "selected_cast_valid",
          `Selected cast member ${id} could not be read: ${rec.error.code} at ${rec.error.path}. ${rec.error.repair_hint}`,
        ),
      );
      continue;
    }
    cast.push(rec.value);
    resolution.included.push({
      id: rec.value.id,
      title: rec.value.title,
      class: "cast",
      ...ledgerIdentity(rec.value),
      reason: "current_cast",
      section: null,
    });
  }

  // Stage 4 — Load selected / active relevant records.
  const records: ManualRecord[] = [];
  const missingRecordFindings: PromptLintFinding[] = [];
  const mustNotRevealIds = new Set(promptWorkingSet?.must_not_reveal ?? []);
  const visibleMustNotRevealIds = new Set(mustNotRevealIds);
  for (const id of seededRecordIds) {
    const cls = classifyManualRecordId(id);
    if (!cls) {
      missingRecordFindings.push(
        hardFinding(
          "selected_records_exist",
          `Selected record ${id} does not match any known Manual Studio class prefix.`,
        ),
      );
      continue;
    }
    const rec = readRecord(input.manualStoryRoot, cls, id);
    if (!rec.ok) {
      missingRecordFindings.push(
        hardFinding(
          rec.error.code === "file_not_found"
            ? "selected_records_exist"
            : "selected_records_valid",
          `Selected record ${id} could not be read: ${rec.error.code} at ${rec.error.path}. ${rec.error.repair_hint}`,
        ),
      );
      continue;
    }
    if (rec.value.prompt_visibility === "never_prompt") {
      visibleMustNotRevealIds.delete(id);
      resolution.excluded.push({
        id: rec.value.id,
        title: rec.value.title,
        class: cls,
        ...ledgerIdentity(rec.value),
        reason: "never_prompt",
      });
      continue;
    }
    if (rec.value.active === false) {
      resolution.excluded.push({
        id: rec.value.id,
        title: rec.value.title,
        class: cls,
        ...ledgerIdentity(rec.value),
        reason: "inactive",
      });
      continue;
    }
    const record = rec.value as ManualRecord;
    records.push(record);
    if (mustNotRevealIds.has(id)) {
      resolution.suppressed.push({
        id: record.id,
        title: record.title,
        class: cls,
        ...ledgerIdentity(record),
        reason: "must_not_reveal",
      });
    } else {
      resolution.included.push({
        id: record.id,
        title: record.title,
        class: cls,
        ...ledgerIdentity(record),
        reason: seedReasons.get(id) ?? "explicitly_selected",
        section: null,
      });
    }
  }

  // Stage 5 — Load optional beat template.
  //
  // SPEC-104: parse the template YAML and assemble two artifacts:
  //   (a) `includedTemplateBody` — a Markdown enumerated list of
  //        `beat_guidance` entries keyed by `function`, surfaced as the
  //        body of section 6.
  //   (b) `templateForbiddenInventions` — the template's
  //        `forbidden_inventions[]`, threaded into section 12 alongside
  //        the existing per-cast prose_constraints.forbidden_inventions.
  // A malformed-YAML template produces a hard lint finding rather than a
  // silent empty body.
  let includedTemplateBody: string | null = null;
  let templateForbiddenInventions: string[] | undefined;
  const templateLintFindings: PromptLintFinding[] = [];
  if (input.included_template_path) {
    const tplPath = path.isAbsolute(input.included_template_path)
      ? input.included_template_path
      : path.join(input.repoRoot, input.included_template_path);
    try {
      assertInsideSandbox(tplPath, manualStoryRootForInput(input));
    } catch (err) {
      templateLintFindings.push(
        hardFinding(
          "selected_template_valid",
          `Selected beat template at ${tplPath} is outside the manual-story sandbox: ${(err as Error).message}`,
        ),
      );
    }
    if (templateLintFindings.length === 0 && existsSync(tplPath)) {
      let rawText: string | null = null;
      try {
        rawText = readFileSync(tplPath, "utf8");
      } catch (err) {
        templateLintFindings.push(
          hardFinding(
            "selected_template_valid",
            `Selected beat template at ${tplPath} could not be read: ${(err as Error).message}`,
          ),
        );
      }
      let parsed: unknown;
      if (rawText !== null) {
        try {
          parsed = YAML.parse(rawText);
        } catch (err) {
          templateLintFindings.push(
            hardFinding(
              "selected_template_valid",
              `Selected beat template at ${tplPath} failed to parse as YAML: ${(err as Error).message}`,
            ),
          );
        }
      }
      if (templateLintFindings.length === 0) {
        const validation = validateBeatTemplate(parsed);
        if (!validation.valid) {
          templateLintFindings.push(
            hardFinding(
              "selected_template_valid",
              `Selected beat template at ${tplPath} failed schema validation: ${validation.violations
                .map((v) => `${v.field}: ${v.message}`)
                .join("; ")}`,
            ),
          );
        } else {
          includedTemplateBody = renderBeatGuidance(validation.record);
          templateForbiddenInventions = [...validation.record.forbidden_inventions];
        }
      }
    }
  }

  // Stage 6 — Load canonical content policy.
  const contentPolicyPath = path.join(input.repoRoot, CONTENT_POLICY_REL);
  if (!existsSync(contentPolicyPath)) {
    throw new Error(
      `content_policy_not_found: ${contentPolicyPath}`,
    );
  }
  const contentPolicyBody = readFileSync(contentPolicyPath, "utf8");

  // Stage 7 — Load Manual Studio prose-craft contract.
  const proseCraftPath = path.join(input.repoRoot, PROSE_CRAFT_CONTRACT_REL);
  if (!existsSync(proseCraftPath)) {
    throw new Error(
      `prose_craft_contract_not_found: ${proseCraftPath}`,
    );
  }
  const proseCraftBody = readFileSync(proseCraftPath, "utf8");

  // Stage 8 — Translate records: implicit via the translator registry; the
  // section emitters call translators per-record at assembly time. We
  // build the TranslatorContext that lets translators resolve referenced
  // ids to titles without I/O.
  const ctx = buildTranslatorContext(input.manualStoryRoot, cast, records);

  // Recent-segment pre-paragraph for stage 3's optional fallback.
  const recentSegmentLastParagraph = loadRecentSegmentLastParagraph(
    input.manualStoryRoot,
    metadata.prompt_policy.include_recent_segments,
  );

  // Stage 9 — Compose Markdown via 15 sections.
  const sectionInput: Parameters<typeof assembleSections>[0] = {
    metadata,
    cast,
    records,
    included_cast_ids: seededCastIds.slice(),
    moment_directive: input.moment_directive,
    included_template_body: includedTemplateBody,
    handoff_summary: promptWorkingSet?.handoff_summary ?? null,
    pov_holder: promptWorkingSet?.pov_holder ?? null,
    must_not_reveal: [...visibleMustNotRevealIds],
    active_secrets_questions: promptWorkingSet?.active_secrets_questions ?? [],
    recent_segment_last_paragraph: recentSegmentLastParagraph,
    content_policy_body: contentPolicyBody,
    prose_craft_contract_body: proseCraftBody,
  };
  if (templateForbiddenInventions) {
    sectionInput.template_forbidden_inventions = templateForbiddenInventions;
  }
  const assembled = assembleSections(sectionInput, ctx);
  const markdown = assembled.markdown;
  resolution.section_map = assembled.section_map;
  applyIncludedSections(resolution);

  // Stage 10 — Run prompt lint over the assembled Markdown.
  const knownCastIds = new Set<string>();
  const knownRecordIds = new Set<string>();
  for (const c of cast) knownCastIds.add(c.id);
  for (const r of records) knownRecordIds.add(r.id);

  const lint = lintPrompt({
    markdown,
    moment_directive: input.moment_directive,
    expected_content_policy_body: contentPolicyBody,
    selected_cast_ids: seededCastIds.slice(),
    resolved_cast_ids: knownCastIds,
    selected_record_ids: seededRecordIds.slice(),
    resolved_record_ids: knownRecordIds,
    latest_segment_available: recentSegmentLastParagraph !== null,
    prompt_policy: {
      include_recent_segments: metadata.prompt_policy.include_recent_segments,
    },
  });

  // Carry the upstream hard-finding short-circuits forward.
  const allFindings = [
    ...missingCastFindings,
    ...missingRecordFindings,
    ...templateLintFindings,
    ...lint.findings,
  ];
  resolution.blocked = findingsToBlocked([
    ...missingCastFindings,
    ...missingRecordFindings,
    ...templateLintFindings,
  ]);
  const consolidated: PromptLintResult = {
    findings: allFindings,
    cleanForCopy: allFindings.length === 0,
    blockingForCopy: allFindings.some((f) => f.tier === "hard"),
  };

  // Stage 11 — Return composed Markdown + lint + sidecar draft.
  return {
    markdown,
    lint: consolidated,
    sidecar_draft: sidecarDraft,
    resolution,
  };

  // Stage 12 — "Save Prompt" is the write side; lives in ../write/prompts.ts
  // and is invoked by the HTTP route layer, not by compose itself.
}

function mergeIds(primary: string[], secondary: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of [...primary, ...secondary]) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function seedReasonMap(
  input: PromptComposeInput,
  promptWorkingSet: PromptWorkingSet | null,
): Map<string, PromptIncludedReason> {
  const reasons = new Map<string, PromptIncludedReason>();
  for (const id of input.included_records) {
    if (!reasons.has(id)) reasons.set(id, "explicitly_selected");
  }
  if (promptWorkingSet?.current_location) {
    if (!reasons.has(promptWorkingSet.current_location)) {
      reasons.set(promptWorkingSet.current_location, "current_location");
    }
  }
  for (const id of promptWorkingSet?.active_pressure_clocks ?? []) {
    if (!reasons.has(id)) reasons.set(id, "active_pressure_clock");
  }
  for (const id of promptWorkingSet?.pinned_records ?? []) {
    if (!reasons.has(id)) reasons.set(id, "pinned");
  }
  for (const id of promptWorkingSet?.active_secrets_questions ?? []) {
    if (!reasons.has(id)) reasons.set(id, "active_secret_question");
  }
  return reasons;
}

function describeExistingRecord(
  manualStoryRoot: string,
  id: string,
  reason: PromptExcludedRecord["reason"],
): PromptExcludedRecord | null {
  const cls = classifyManualRecordId(id);
  if (!cls) return null;
  const rec = readRecord(manualStoryRoot, cls, id);
  if (!rec.ok) return null;
  return {
    id: rec.value.id,
    title: rec.value.title,
    class: cls,
    ...ledgerIdentity(rec.value),
    reason,
  };
}

function ledgerIdentity(record: RecordCommonFields): Pick<
  PromptExcludedRecord,
  "summary" | "importance" | "prompt_visibility" | "involved_cast" | "tags"
> {
  return {
    summary: record.summary,
    importance: record.importance,
    prompt_visibility: record.prompt_visibility,
    involved_cast: record.refs.characters.slice(),
    tags: record.tags.slice(),
  };
}

function findingsToBlocked(findings: PromptLintFinding[]): PromptResolution["blocked"] {
  return findings.map((finding) => ({
    ref: finding.rule,
    reason: finding.message,
  }));
}

function applyIncludedSections(resolution: PromptResolution): void {
  const firstSectionById = new Map<string, string>();
  for (const [section, ids] of Object.entries(resolution.section_map)) {
    for (const id of ids) {
      if (!firstSectionById.has(id)) {
        firstSectionById.set(id, section);
      }
    }
  }
  for (const entry of resolution.included) {
    entry.section = firstSectionById.get(entry.id) ?? null;
  }
}

function resolutionFromFindings(findings: PromptLintFinding[]): PromptResolution {
  return {
    included: [],
    excluded: [],
    suppressed: [],
    blocked: findingsToBlocked(findings),
    section_map: {},
  };
}

function buildTranslatorContext(
  manualStoryRoot: string,
  cast: ManualCharacterRecord[],
  records: ManualRecord[],
): TranslatorContext {
  const castTitles = new Map<string, string>();
  for (const c of cast) castTitles.set(c.id, c.title);

  const recordTitles = new Map<string, string>();
  for (const r of records) recordTitles.set(r.id, r.title);

  // Lazy-load the rest of the cast for cross-cast title resolution
  // (relationships may reference a cast member not in the pinned set).
  // We list summaries once and cache to keep compose deterministic + cheap.
  let castSummariesLoaded = false;
  function loadCastSummariesOnce(): void {
    if (castSummariesLoaded) return;
    castSummariesLoaded = true;
    const summaries = listRecords(manualStoryRoot, "cast", {
      includeInactive: true,
    });
    if (!summaries.ok) return;
    for (const s of summaries.value) {
      if (!castTitles.has(s.id)) castTitles.set(s.id, s.title);
    }
  }

  return {
    getCastTitle(id: string): string | null {
      if (castTitles.has(id)) return castTitles.get(id) ?? null;
      loadCastSummariesOnce();
      return castTitles.get(id) ?? null;
    },
    getRecordTitle(id: string): string | null {
      if (recordTitles.has(id)) return recordTitles.get(id) ?? null;
      const cls = classifyManualRecordId(id);
      if (cls === "cast") {
        return this.getCastTitle(id);
      }
      if (cls) {
        // One-off disk lookup; deterministic given disk content.
        try {
          const rec = readRecord(
            manualStoryRoot,
            cls as ManualRecordClass,
            id,
          );
          if (rec.ok) {
            recordTitles.set(id, rec.value.title);
            return rec.value.title;
          }
        } catch {
          // fall through
        }
      }
      return null;
    },
  };
}

function renderBeatGuidance(template: BeatTemplate): string {
  // Markdown enumerated list keyed by beat `function`. The 1-5 length
  // bound is enforced by validateBeatTemplate; this renderer trusts that
  // invariant and emits exactly as many lines as beat_guidance carries.
  const lines = template.beat_guidance.map(
    (beat) => `- **${beat.function}**: ${beat.instruction}`,
  );
  return lines.join("\n");
}

function loadRecentSegmentLastParagraph(
  manualStoryRoot: string,
  includeRecentSegments: number,
): string | null {
  if (!Number.isFinite(includeRecentSegments) || includeRecentSegments <= 0) {
    return null;
  }
  const segmentsDir = path.join(manualStoryRoot, "segments");
  if (!existsSync(segmentsDir)) return null;
  let entries: string[];
  try {
    entries = readdirSync(segmentsDir);
  } catch {
    return null;
  }
  const segmentFiles = entries
    .filter((name) => /^SEG-\d+\.md$/.test(name))
    .map((name) => ({
      name,
      n: Number(/^SEG-(\d+)\.md$/.exec(name)?.[1] ?? "0"),
    }))
    .sort((a, b) => b.n - a.n);
  if (segmentFiles.length === 0) return null;
  const latest = segmentFiles[0]!;
  const latestPath = path.join(segmentsDir, latest.name);
  try {
    if (!statSync(latestPath).isFile()) return null;
    const text = readFileSync(latestPath, "utf8");
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    return paragraphs.length > 0
      ? paragraphs[paragraphs.length - 1] ?? null
      : null;
  } catch {
    return null;
  }
}
