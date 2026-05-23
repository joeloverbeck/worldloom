import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  fileInputsFrom,
  queryStructuralRecords,
  stringValue,
  toPosixPath,
  worldRootFrom
} from "./utils.js";
import { appliesToStcharStoryState, fail, recordId, shouldCheckRecordInPreApply } from "./stchar-utils.js";

const VALIDATOR = "stchar_body_integrity";
const STCHAR_PATH = /^stories\/[^/]+\/story-characters\/STCHAR-(0|[1-9][0-9]*)\.md$/;
interface RequiredSubsectionRule {
  section: string;
  subsections: readonly string[];
  source_kind?: string;
}

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

export const REQUIRED_STCHAR_SUBSECTIONS: readonly RequiredSubsectionRule[] = [
  {
    section: "Agency and Planning Tendencies",
    subsections: [
      "Operational capabilities and affordances",
      "Capability limits, costs, and access constraints"
    ]
  },
  {
    section: "Source Distillation",
    subsections: ["Stable Source Material Inventory"],
    source_kind: "world_char"
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

  verdicts.push(...requiredSubsectionVerdicts(record, sections));

  return verdicts;
}

function requiredSubsectionVerdicts(
  record: IndexedRecord,
  sections: Map<string, string[]>
): Verdict[] {
  const id = recordId(record);
  const verdicts: Verdict[] = [];

  for (const requirement of REQUIRED_STCHAR_SUBSECTIONS) {
    if (requirement.source_kind !== undefined && sourceKind(record) !== requirement.source_kind) {
      continue;
    }

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
        verdicts.push(stcharFail(
          record,
          "missing_subsection",
          `${id} missing required STCHAR body subsection '### ${subsection}' under '## ${requirement.section}'.`,
          { section: requirement.section, subsection },
          `Add a non-empty '### ${subsection}' subsection under '## ${requirement.section}'.`
        ));
        continue;
      }
      if (count > 1) {
        verdicts.push(stcharFail(
          record,
          "duplicate_subsection",
          `${id} has duplicate STCHAR body subsection '### ${subsection}' under '## ${requirement.section}'.`,
          { section: requirement.section, subsection, count },
          `Collapse duplicate '### ${subsection}' subsections under '## ${requirement.section}' so the STCHAR body has exactly one.`
        ));
      }
      if (hasEmpty) {
        verdicts.push(stcharFail(
          record,
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

function sourceKind(record: IndexedRecord): string | undefined {
  return stringValue(asPlainRecord(record.parsed).source_kind);
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
  return fail(VALIDATOR, record, `${VALIDATOR}.${code}`, message, detail, suggested_fix);
}
