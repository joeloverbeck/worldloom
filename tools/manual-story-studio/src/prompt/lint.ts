// Prompt lint module.
//
// SPEC-106 promotes all eight SPEC-102 prompt-safety rules to hard tier:
//     1. moment_directive_present
//     2. content_policy_byte_equal
//     3. selected_cast_exists
//     4. selected_records_exist
//     5. no_internal_record_ids
//     6. no_engine_jargon
//     7. no_schema_validator_terms
//     8. no_record_class_narrator_voice
// Soft tier is reserved for future quality warnings (SPEC-111-adjacent) and
// intentionally empty until such warnings exist.
//
// Pure function: same (markdown, expected content-policy, id sets) →
// same result. No disk I/O, no LLM, no network.

import type { BeatTemplate } from "../schema/beat-template.js";
import type {
  PromptLintFinding,
  PromptLintResult,
} from "./types.js";

export const ENGINE_JARGON_DENYLIST: readonly string[] = [
  "PG-",
  "SE-",
  "SCN-",
  "SLT-",
  "STCHAR-",
  "STENT-",
  "STINT-",
  "STSEC-",
  "STPLAN-",
  "STEMO-",
  "SREL-",
  "BEL-",
  "SF-",
  "CHC-",
  "BR-",
  "OBL-",
  "CNSQ-",
  "THR-",
  "STSTAT-",
  "STLOC-",
  "STOBJ-",
  "STQ-",
  "DA-",
  "CLK-",
  "SLB-",
  "SAU-",
  "SP-",
  "RSP-",
  "CF-",
  "CH-",
  "INV-",
  "M-",
  "OQ-",
  "ENT-",
  "SEC-",
  "CHAR-",
  "PA-",
  "EPE-",
  "NCP-",
  "NCB-",
  "NWP-",
  "PR-",
  "RP-",
  "AU-",
];

export const SCHEMA_VALIDATOR_DENYLIST: readonly string[] = [
  "state_snapshot",
  "state_delta",
  "state_hash",
  "patch_plan",
  "submit_patch_plan",
  "validator",
  "validation_trace",
  "supersession",
  "superseded",
  "append_only",
  "mystery_policy",
  "provenance.origin",
  "bootstrap",
  "record_version",
  "schema_version",
];

export const INTERNAL_ID_REGEX = /\bm[a-z]+-[0-9]+\b/g;

export const RECORD_CLASS_NARRATOR_PHRASES: readonly string[] = [
  "SF authority",
  "BEL records",
  "BEL record",
  "STCHAR profile",
  "STCHAR record",
  "SLT pool",
  "STENT record",
  "the SE event",
  "SCN range",
  "PG range",
];

export interface PromptLintInput {
  markdown: string;
  moment_directive: string;
  expected_content_policy_body: string;
  selected_cast_ids: string[];
  resolved_cast_ids: Set<string>;
  selected_record_ids: string[];
  resolved_record_ids: Set<string>;
}

function findSection(markdown: string, n: number): string | null {
  const chunks = markdown.split(/(?=^## \d+\. )/m);
  for (const chunk of chunks) {
    const m = /^## (\d+)\. [^\n]+\n+([\s\S]*)$/.exec(chunk);
    if (m && Number(m[1]) === n) return m[2] ?? "";
  }
  return null;
}

function checkMomentDirectivePresent(
  input: PromptLintInput,
): PromptLintFinding[] {
  if (input.moment_directive.trim().length === 0) {
    return [
      {
        rule: "moment_directive_present",
        tier: "hard",
        message: "The moment directive must be non-empty.",
        section: "§4 Manual Moment Directive",
      },
    ];
  }
  return [];
}

function checkContentPolicyByteEqual(
  input: PromptLintInput,
): PromptLintFinding[] {
  const section1 = findSection(input.markdown, 1);
  if (section1 === null) {
    return [
      {
        rule: "content_policy_byte_equal",
        tier: "hard",
        message:
          "§1 Content Policy section is missing from the assembled prompt.",
        section: "§1 Content Policy",
      },
    ];
  }
  const expected = input.expected_content_policy_body.trim();
  if (section1.trim() !== expected) {
    return [
      {
        rule: "content_policy_byte_equal",
        tier: "hard",
        message:
          "§1 Content Policy body does not byte-equal docs/prose-renderer-contract/content-policy.md.",
        section: "§1 Content Policy",
      },
    ];
  }
  return [];
}

function checkSelectedCastExist(
  input: PromptLintInput,
): PromptLintFinding[] {
  const out: PromptLintFinding[] = [];
  for (const id of input.selected_cast_ids) {
    if (!input.resolved_cast_ids.has(id)) {
      out.push({
        rule: "selected_cast_exists",
        tier: "hard",
        message: `Selected cast id ${id} was not resolved on disk.`,
        section: "§7 Cast and Voice",
        snippet: id,
      });
    }
  }
  return out;
}

function checkSelectedRecordsExist(
  input: PromptLintInput,
): PromptLintFinding[] {
  const out: PromptLintFinding[] = [];
  for (const id of input.selected_record_ids) {
    if (!input.resolved_record_ids.has(id)) {
      out.push({
        rule: "selected_records_exist",
        tier: "hard",
        message: `Selected record id ${id} was not resolved on disk.`,
        snippet: id,
      });
    }
  }
  return out;
}

function checkNoInternalRecordIds(
  input: PromptLintInput,
): PromptLintFinding[] {
  const matches = input.markdown.match(INTERNAL_ID_REGEX);
  if (!matches || matches.length === 0) return [];
  const uniq = Array.from(new Set(matches));
  return uniq.map((snippet) => ({
    rule: "no_internal_record_ids",
    tier: "hard",
    message: `Manual Studio internal record id "${snippet}" appears in the prompt body.`,
    snippet,
  }));
}

function checkNoEngineJargon(
  input: PromptLintInput,
): PromptLintFinding[] {
  const out: PromptLintFinding[] = [];
  for (const prefix of ENGINE_JARGON_DENYLIST) {
    // Match prefix followed by an integer suffix (engine record-id shape).
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}[0-9]+\\b`, "g");
    const matches = input.markdown.match(re);
    if (matches && matches.length > 0) {
      for (const snippet of Array.from(new Set(matches))) {
        out.push({
          rule: "no_engine_jargon",
          tier: "hard",
          message: `Engine record-id "${snippet}" appears in the prompt body (denylist: ${prefix}).`,
          snippet,
        });
      }
    }
  }
  return out;
}

function checkNoSchemaValidatorTerms(
  input: PromptLintInput,
): PromptLintFinding[] {
  const out: PromptLintFinding[] = [];
  for (const term of SCHEMA_VALIDATOR_DENYLIST) {
    if (input.markdown.includes(term)) {
      out.push({
        rule: "no_schema_validator_terms",
        tier: "hard",
        message: `Schema/validator term "${term}" appears in the prompt body.`,
        snippet: term,
      });
    }
  }
  return out;
}

function checkNoRecordClassNarratorVoice(
  input: PromptLintInput,
): PromptLintFinding[] {
  const out: PromptLintFinding[] = [];
  for (const phrase of RECORD_CLASS_NARRATOR_PHRASES) {
    if (input.markdown.includes(phrase)) {
      out.push({
        rule: "no_record_class_narrator_voice",
        tier: "hard",
        message: `Record-class narrator-voice phrasing "${phrase}" appears in the prompt body.`,
        snippet: phrase,
      });
    }
  }
  return out;
}

export function lintPrompt(input: PromptLintInput): PromptLintResult {
  const findings: PromptLintFinding[] = [
    ...checkMomentDirectivePresent(input),
    ...checkContentPolicyByteEqual(input),
    ...checkSelectedCastExist(input),
    ...checkSelectedRecordsExist(input),
    ...checkNoInternalRecordIds(input),
    ...checkNoEngineJargon(input),
    ...checkNoSchemaValidatorTerms(input),
    ...checkNoRecordClassNarratorVoice(input),
  ];
  return {
    findings,
    cleanForCopy: findings.length === 0,
    blockingForCopy: findings.some((f) => f.tier === "hard"),
  };
}

// SPEC-104 §2.7: CRUD-time lint that catches engine-jargon, internal-id,
// schema/validator, and narrator-voice violations in a beat-template's
// beat_guidance.instruction strings. SPEC-106 makes these leakage findings
// hard-tier here too, mirroring the main prompt lint boundary.
export function lintBeatTemplateGuidance(
  template: BeatTemplate,
): PromptLintResult {
  const concatenated = template.beat_guidance
    .map((b) => b.instruction)
    .join("\n");
  const findings: PromptLintFinding[] = [];

  const idMatches = concatenated.match(INTERNAL_ID_REGEX);
  if (idMatches) {
    for (const snippet of Array.from(new Set(idMatches))) {
      findings.push({
        rule: "no_internal_record_ids",
        tier: "hard",
        message: `Manual Studio internal record id "${snippet}" appears in beat_guidance.instruction.`,
        snippet,
      });
    }
  }

  for (const prefix of ENGINE_JARGON_DENYLIST) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}[0-9]+\\b`, "g");
    const matches = concatenated.match(re);
    if (matches && matches.length > 0) {
      for (const snippet of Array.from(new Set(matches))) {
        findings.push({
          rule: "no_engine_jargon",
          tier: "hard",
          message: `Engine record-id "${snippet}" appears in beat_guidance.instruction (denylist: ${prefix}).`,
          snippet,
        });
      }
    }
  }

  for (const term of SCHEMA_VALIDATOR_DENYLIST) {
    if (concatenated.includes(term)) {
      findings.push({
        rule: "no_schema_validator_terms",
        tier: "hard",
        message: `Schema/validator term "${term}" appears in beat_guidance.instruction.`,
        snippet: term,
      });
    }
  }

  for (const phrase of RECORD_CLASS_NARRATOR_PHRASES) {
    if (concatenated.includes(phrase)) {
      findings.push({
        rule: "no_record_class_narrator_voice",
        tier: "hard",
        message: `Record-class narrator-voice phrasing "${phrase}" appears in beat_guidance.instruction.`,
        snippet: phrase,
      });
    }
  }

  return {
    findings,
    cleanForCopy: findings.length === 0,
    blockingForCopy: findings.some((f) => f.tier === "hard"),
  };
}
