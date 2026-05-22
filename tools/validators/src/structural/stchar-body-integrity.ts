import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  computeStcharProfileHash,
  computeStcharVoiceBlockHash
} from "@worldloom/world-index/hash/content";

import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  fileInputsFrom,
  locationFor,
  queryStructuralRecords,
  stringValue,
  toPosixPath,
  worldRootFrom
} from "./utils.js";
import { appliesToStcharStoryState, fail, recordId, shouldCheckRecordInPreApply } from "./stchar-utils.js";

const VALIDATOR = "stchar_body_integrity";
const STCHAR_PATH = /^stories\/[^/]+\/story-characters\/STCHAR-(0|[1-9][0-9]*)\.md$/;
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

// Keep this list in sync with .claude/skills/story-character-profile/SKILL.md Phase 3.
export const REQUIRED_STCHAR_SECTIONS = [
  "Story-Facing Identity",
  "Source Distillation",
  "Stable Persona Core",
  "Emotional Appraisal Map",
  "Pressure Behavior",
  "Voice Bible / Dialogue Authority",
  "Page-Plan Voice Block",
  "Perception and Embodiment",
  "Agency and Planning Tendencies",
  "Relationship-Specific Behavior",
  "Story-State Derivation Guide",
  "Prose Rendering Constraints",
  "Validation / Audit Anchors"
] as const;

export const REQUIRED_STCHAR_SUBSECTIONS = [
  {
    section: "Agency and Planning Tendencies",
    subsections: [
      "Operational capabilities and affordances",
      "Capability limits, costs, and access constraints"
    ]
  },
  {
    section: "Prose Rendering Constraints",
    subsections: [
      "Signature scene behaviors to render"
    ]
  }
] as const;

export const stcharBodyIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const files = stcharFilesByPath(input, ctx, records);
    const verdicts: Verdict[] = [];

    for (const record of records) {
      if (record.node_type !== "story_character_authority_record" || !STCHAR_PATH.test(toPosixPath(record.file_path))) {
        continue;
      }
      if (!shouldCheckRecordInPreApply(record, ctx)) {
        continue;
      }

      const filePath = toPosixPath(record.file_path);
      const content = files.get(filePath);
      if (content === undefined) {
        continue;
      }

      verdicts.push(...bodyVerdicts(record, content, ctx));
      verdicts.push(...hashVerdicts(record, content));
    }

    return verdicts;
  }
};

function bodyVerdicts(record: IndexedRecord, content: string, ctx: Context): Verdict[] {
  const body = bodyMarkdown(content);
  const id = recordId(record);
  const verdicts: Verdict[] = [];

  if (body.trim().length === 0) {
    verdicts.push(stcharFail(
      record,
      "empty_body",
      `${id} STCHAR body must not be empty.`,
      {},
      "Draft the 13 required STCHAR H2 sections before accepting this authority record."
    ));
    return verdicts;
  }

  const sections = sectionBodies(body);
  for (const section of REQUIRED_STCHAR_SECTIONS) {
    const bodies = sections.get(section) ?? [];
    if (bodies.length === 0) {
      verdicts.push(stcharFail(
        record,
        "missing_section",
        `${id} missing required STCHAR body section '## ${section}'.`,
        { section },
        `Add exactly one '## ${section}' section to ${id}.`
      ));
      continue;
    }
    if (bodies.length > 1) {
      verdicts.push(stcharFail(
        record,
        "duplicate_section",
        `${id} has duplicate STCHAR body section '## ${section}'.`,
        { section, count: bodies.length },
        `Collapse duplicate '## ${section}' sections so the STCHAR body has exactly one.`
      ));
    }
    if (bodies.some((sectionBody) => sectionBody.trim().length === 0)) {
      verdicts.push(stcharFail(
        record,
        "empty_section",
        `${id} has an empty STCHAR body section '## ${section}'.`,
        { section },
        `Fill '## ${section}' with non-empty authority prose.`
      ));
    }
  }

  verdicts.push(...requiredSubsectionVerdicts(record, sections, subsectionSeverity(record, ctx)));

  return verdicts;
}

function requiredSubsectionVerdicts(
  record: IndexedRecord,
  sections: Map<string, string[]>,
  severity: "fail" | "warn"
): Verdict[] {
  const id = recordId(record);
  const verdicts: Verdict[] = [];

  for (const requirement of REQUIRED_STCHAR_SUBSECTIONS) {
    const parentBodies = sections.get(requirement.section) ?? [];
    if (parentBodies.length === 0) {
      continue;
    }

    for (const subsection of requirement.subsections) {
      let count = 0;
      let hasEmpty = false;
      for (const sectionBody of parentBodies) {
        const subsectionBodies = subsectionBodiesByHeading(sectionBody).get(subsection) ?? [];
        count += subsectionBodies.length;
        hasEmpty ||= subsectionBodies.some((subsectionBody) => subsectionBody.trim().length === 0);
      }

      if (count === 0) {
        verdicts.push(stcharVerdict(
          record,
          severity,
          "missing_subsection",
          `${id} missing required STCHAR body subsection '### ${subsection}' under '## ${requirement.section}'.`,
          { section: requirement.section, subsection },
          `Add a non-empty '### ${subsection}' subsection under '## ${requirement.section}'.`
        ));
        continue;
      }
      if (count > 1) {
        verdicts.push(stcharVerdict(
          record,
          severity,
          "duplicate_subsection",
          `${id} has duplicate STCHAR body subsection '### ${subsection}' under '## ${requirement.section}'.`,
          { section: requirement.section, subsection, count },
          `Collapse duplicate '### ${subsection}' subsections under '## ${requirement.section}' so the STCHAR body has exactly one.`
        ));
      }
      if (hasEmpty) {
        verdicts.push(stcharVerdict(
          record,
          severity,
          "empty_subsection",
          `${id} has an empty STCHAR body subsection '### ${subsection}' under '## ${requirement.section}'.`,
          { section: requirement.section, subsection },
          `Fill '### ${subsection}' with non-empty operational authority prose.`
        ));
      }
    }
  }

  return verdicts;
}

function subsectionSeverity(record: IndexedRecord, ctx: Context): "fail" | "warn" {
  if (ctx.run_mode === "pre-apply" || ctx.touched_files.some((file) => toPosixPath(file) === toPosixPath(record.file_path))) {
    return "fail";
  }
  return "warn";
}

function hashVerdicts(record: IndexedRecord, content: string): Verdict[] {
  const parsed = asPlainRecord(record.parsed);
  const id = recordId(record);
  const verdicts: Verdict[] = [];

  const shapedHashes = new Map<"profile_hash" | "voice_block_hash", string>();
  for (const field of ["profile_hash", "voice_block_hash"] as const) {
    const value = stringValue(parsed[field]);
    if (!value || !HASH_PATTERN.test(value)) {
      verdicts.push(stcharFail(
        record,
        "hash_shape",
        `${id}.${field} must match sha256:<64 lowercase hex>.`,
        { field, observed: value ?? null },
        `Set ${field} to a lowercase SHA-256 digest with the sha256: prefix.`
      ));
      continue;
    }
    shapedHashes.set(field, value);
  }

  const expectedProfileHash = `sha256:${computeStcharProfileHash(content)}`;
  const storedProfileHash = shapedHashes.get("profile_hash");
  if (storedProfileHash && storedProfileHash !== expectedProfileHash) {
    verdicts.push(hashMismatchVerdict(record, "profile_hash", storedProfileHash, expectedProfileHash));
  }

  const storedVoiceBlockHash = shapedHashes.get("voice_block_hash");
  if (storedVoiceBlockHash) {
    const body = bodyMarkdown(content);
    const sections = sectionBodies(body);
    if ((sections.get("Page-Plan Voice Block") ?? []).length > 0) {
      const expectedVoiceBlockHash = `sha256:${computeStcharVoiceBlockHash(content)}`;
      if (storedVoiceBlockHash !== expectedVoiceBlockHash) {
        verdicts.push(hashMismatchVerdict(record, "voice_block_hash", storedVoiceBlockHash, expectedVoiceBlockHash));
      }
    }
  }

  return verdicts;
}

function hashMismatchVerdict(
  record: IndexedRecord,
  field: "profile_hash" | "voice_block_hash",
  stored: string,
  expected: string
): Verdict {
  const id = recordId(record);
  return stcharFail(
    record,
    "hash_mismatch",
    `${id}.${field} must match the canonical recompute from the STCHAR body.`,
    { field, stored, expected },
    `Restamp ${field} with ${expected} after finalizing the STCHAR body.`
  );
}

function stcharFilesByPath(input: unknown, ctx: Context, records: readonly IndexedRecord[]): Map<string, string> {
  const files = new Map<string, string>();
  for (const file of fileInputsFrom(input, ctx)) {
    const filePath = toPosixPath(file.path);
    if (STCHAR_PATH.test(filePath)) {
      files.set(filePath, file.content);
    }
  }

  const worldRoot = worldRootFrom(input, ctx);
  if (!worldRoot) {
    return files;
  }

  for (const record of records) {
    const filePath = toPosixPath(record.file_path);
    if (files.has(filePath) || !STCHAR_PATH.test(filePath)) {
      continue;
    }
    const absolutePath = path.join(worldRoot, filePath);
    if (existsSync(absolutePath)) {
      files.set(filePath, readFileSync(absolutePath, "utf8"));
    }
  }

  return files;
}

function bodyMarkdown(content: string): string {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") {
    return content;
  }
  const closingIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (closingIndex <= 0) {
    return content;
  }
  return lines.slice(closingIndex + 1).join("\n").replace(/^\n/, "");
}

function sectionBodies(body: string): Map<string, string[]> {
  const matches = [...body.matchAll(/^## (.+?)\s*$/gm)];
  const sections = new Map<string, string[]>();

  for (const [index, match] of matches.entries()) {
    const section = match[1] ?? "";
    const bodyStart = (match.index ?? 0) + match[0].length;
    const next = matches[index + 1];
    const bodyEnd = next?.index ?? body.length;
    const bucket = sections.get(section) ?? [];
    bucket.push(body.slice(bodyStart, bodyEnd));
    sections.set(section, bucket);
  }

  return sections;
}

function subsectionBodiesByHeading(sectionBody: string): Map<string, string[]> {
  const matches = [...sectionBody.matchAll(/^### (.+?)\s*$/gm)];
  const subsections = new Map<string, string[]>();

  for (const [index, match] of matches.entries()) {
    const subsection = match[1] ?? "";
    const bodyStart = (match.index ?? 0) + match[0].length;
    const next = matches[index + 1];
    const bodyEnd = next?.index ?? sectionBody.length;
    const bucket = subsections.get(subsection) ?? [];
    bucket.push(sectionBody.slice(bodyStart, bodyEnd));
    subsections.set(subsection, bucket);
  }

  return subsections;
}

function stcharFail(
  record: IndexedRecord,
  code: string,
  message: string,
  detail?: unknown,
  suggested_fix?: string
): Verdict {
  return stcharVerdict(record, "fail", code, message, detail, suggested_fix);
}

function stcharVerdict(
  record: IndexedRecord,
  severity: "fail" | "warn",
  code: string,
  message: string,
  detail?: unknown,
  suggested_fix?: string
): Verdict {
  if (severity === "fail") {
    return fail(VALIDATOR, record, `${VALIDATOR}.${code}`, message, detail, suggested_fix);
  }
  return {
    validator: VALIDATOR,
    severity,
    code: `${VALIDATOR}.${code}`,
    message,
    location: locationFor(record),
    ...(detail === undefined ? {} : { detail }),
    ...(suggested_fix === undefined ? {} : { suggested_fix })
  };
}
