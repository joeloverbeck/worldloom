// Deterministic 12-stage prompt composition pipeline.
//
// SPEC-102 §Scope item 2 — every input is a record file or a known doc
// file, every stage is testable in isolation, and every emitted prompt is
// byte-identical given the same inputs. Disk reads (content-policy and
// prose-craft-contract) happen at compose time (stages 6 / 7) so doc
// edits flow through without rebuilding.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { readManualStoryMetadata } from "../read/manual-story-metadata.js";
import { listRecords, readRecord } from "../read/records.js";
import type {
  ManualCharacterRecord,
  ManualRecord,
  ManualRecordClass,
} from "../schema/manual-story.js";
import { lintPrompt } from "./lint.js";
import { classifyManualRecordId } from "./record-class.js";
import { assembleSections } from "./sections/index.js";
import type { TranslatorContext } from "./translators/index.js";
import type {
  PromptComposeInput,
  PromptComposeResult,
  PromptLintFinding,
  PromptLintResult,
} from "./types.js";
import "./translators/all.js";

const CONTENT_POLICY_REL =
  "docs/prose-renderer-contract/content-policy.md";
const PROSE_CRAFT_CONTRACT_REL =
  "docs/manual-story-studio/prose-craft-contract.md";

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
  return { markdown: "", lint, sidecar_draft: sidecarDraft };
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
  const metadata = readManualStoryMetadata(input.manualStoryRoot);
  if (!metadata) {
    throw new Error(
      `manual_story_not_found: ${input.manualStoryRoot}`,
    );
  }
  sidecarDraft.manual_story_slug = metadata.manual_story_slug;

  // Stage 3 — Load selected cast profiles.
  const cast: ManualCharacterRecord[] = [];
  const missingCastFindings: PromptLintFinding[] = [];
  for (const id of input.included_cast) {
    const rec = readRecord(input.manualStoryRoot, "cast", id);
    if (!rec) {
      missingCastFindings.push(
        hardFinding(
          "selected_cast_exists",
          `Selected cast member ${id} was not found on disk.`,
        ),
      );
      continue;
    }
    cast.push(rec);
  }

  // Stage 4 — Load selected / active relevant records.
  const records: ManualRecord[] = [];
  const missingRecordFindings: PromptLintFinding[] = [];
  for (const id of input.included_records) {
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
    if (!rec) {
      missingRecordFindings.push(
        hardFinding(
          "selected_records_exist",
          `Selected record ${id} was not found on disk.`,
        ),
      );
      continue;
    }
    if (rec.active === false) continue;
    records.push(rec as ManualRecord);
  }

  // Stage 5 — Load optional beat template.
  let includedTemplateBody: string | null = null;
  if (input.included_template_path) {
    const tplPath = path.isAbsolute(input.included_template_path)
      ? input.included_template_path
      : path.join(input.repoRoot, input.included_template_path);
    if (existsSync(tplPath)) {
      try {
        includedTemplateBody = readFileSync(tplPath, "utf8");
      } catch {
        includedTemplateBody = null;
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
  const markdown = assembleSections(
    {
      metadata,
      cast,
      records,
      included_cast_ids: input.included_cast.slice(),
      moment_directive: input.moment_directive,
      included_template_body: includedTemplateBody,
      recent_segment_last_paragraph: recentSegmentLastParagraph,
      content_policy_body: contentPolicyBody,
      prose_craft_contract_body: proseCraftBody,
    },
    ctx,
  );

  // Stage 10 — Run prompt lint over the assembled Markdown.
  const knownCastIds = new Set<string>();
  const knownRecordIds = new Set<string>();
  for (const c of cast) knownCastIds.add(c.id);
  for (const r of records) knownRecordIds.add(r.id);

  const lint = lintPrompt({
    markdown,
    moment_directive: input.moment_directive,
    expected_content_policy_body: contentPolicyBody,
    selected_cast_ids: input.included_cast.slice(),
    resolved_cast_ids: knownCastIds,
    selected_record_ids: input.included_records.slice(),
    resolved_record_ids: knownRecordIds,
  });

  // Carry the upstream hard-finding short-circuits forward.
  const allFindings = [
    ...missingCastFindings,
    ...missingRecordFindings,
    ...lint.findings,
  ];
  const consolidated: PromptLintResult = {
    findings: allFindings,
    cleanForCopy: allFindings.length === 0,
    blockingForCopy: allFindings.some((f) => f.tier === "hard"),
  };

  // Stage 11 — Return composed Markdown + lint + sidecar draft.
  return { markdown, lint: consolidated, sidecar_draft: sidecarDraft };

  // Stage 12 — "Save Prompt" is the write side; lives in ../write/prompts.ts
  // and is invoked by the HTTP route layer, not by compose itself.
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
      includeArchived: true,
    });
    for (const s of summaries) {
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
          if (rec) {
            recordTitles.set(id, rec.title);
            return rec.title;
          }
        } catch {
          // fall through
        }
      }
      return null;
    },
  };
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
