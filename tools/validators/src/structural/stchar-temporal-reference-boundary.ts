import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  fileInputsFrom,
  queryStructuralRecords,
  toPosixPath,
  worldRootFrom
} from "./utils.js";
import { appliesToStcharStoryState, fail, recordId, shouldCheckRecordInPreApply } from "./stchar-utils.js";
import { OPERATIONAL_TARGET_SECTIONS } from "./_stchar-operational-sections.js";

const VALIDATOR = "stchar_temporal_reference_boundary";
const STCHAR_PATH = /^stories\/[^/]+\/story-characters\/STCHAR-(0|[1-9][0-9]*)\.md$/;
const TEMPORAL_RECORD_ID = /\b(PG|SE|STEMO|BEL|STPLAN|STINT|STSTAT|STOBJ|STLOC|SREL|THR|OBL|CNSQ|CLK|STSEC|STQ)-(0|[1-9][0-9]*)\b/g;

export const stcharTemporalReferenceBoundary: Validator = {
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

      const content = files.get(toPosixPath(record.file_path));
      if (content === undefined) {
        continue;
      }

      verdicts.push(...temporalReferenceVerdicts(record, content));
    }

    return verdicts;
  }
};

function temporalReferenceVerdicts(record: IndexedRecord, content: string): Verdict[] {
  const verdicts: Verdict[] = [];
  const sections = sectionBodies(bodyMarkdown(content));

  for (const [section, bodies] of sections.entries()) {
    if (!OPERATIONAL_TARGET_SECTIONS.has(section)) {
      continue;
    }

    for (const sectionBody of bodies) {
      for (const match of sectionBody.matchAll(TEMPORAL_RECORD_ID)) {
        const temporalRecordId = match[0];
        verdicts.push(fail(
          VALIDATOR,
          record,
          `${VALIDATOR}.temporal_record_in_operational_section`,
          `${recordId(record)} operational section '${section}' cites temporal story-state record ${temporalRecordId} as durable character authority. Route current state to the appropriate story-state record and project it through page-plan section 16a.`,
          {
            section,
            record_id: temporalRecordId
          },
          "Remove current-state record references from durable STCHAR operational sections; keep them in Source Distillation, Validation / Audit Anchors, or page-plan/current-state records."
        ));
      }
    }
  }

  return verdicts;
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
