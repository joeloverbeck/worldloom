import yaml from "js-yaml";

import type { Context, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  fileInputsFrom,
  isPlainRecord,
  toPosixPath
} from "./utils.js";
import { appliesToStcharStoryState } from "./stchar-utils.js";

const VALIDATOR = "forbidden_stchar_tamper_hash_fields";
const FORBIDDEN_FIELDS = [
  "profile_hash",
  "voice_block_hash",
  "page_packet_hash",
  "source_char_hash"
] as const;
const STCHAR_PATH = /^stories\/[^/]+\/story-characters\/STCHAR-(0|[1-9][0-9]*)\.md$/;
const RECEIPT_PATH = /^stories\/[^/]+\/pages-prose-receipts\/PG-(0|[1-9][0-9]*)\.yaml$/;
const PLAN_PATH = /^stories\/[^/]+\/pages-prose-plans\/PG-(0|[1-9][0-9]*)\.md$/;

export const forbiddenStcharTamperHashFields: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];

    for (const file of fileInputsFrom(input, ctx)) {
      const filePath = toPosixPath(file.path);
      if (STCHAR_PATH.test(filePath)) {
        verdicts.push(...frontmatterVerdicts(filePath, file.content));
        continue;
      }
      if (RECEIPT_PATH.test(filePath)) {
        verdicts.push(...receiptVerdicts(filePath, file.content));
        continue;
      }
      if (PLAN_PATH.test(filePath)) {
        verdicts.push(...pagePlanVerdicts(filePath, file.content));
      }
    }

    return verdicts;
  }
};

function frontmatterVerdicts(filePath: string, content: string): Verdict[] {
  const frontmatter = parseFrontmatter(content);
  if (frontmatter === null) {
    return [];
  }
  return forbiddenKeyVerdicts(filePath, "STCHAR frontmatter", frontmatter);
}

function receiptVerdicts(filePath: string, content: string): Verdict[] {
  const parsed = yaml.load(content);
  return forbiddenKeyVerdicts(filePath, "prose receipt YAML", asPlainRecord(parsed));
}

function pagePlanVerdicts(filePath: string, content: string): Verdict[] {
  const sectionStart = content.search(/^##\s+16a\.\s+STCHAR-derived character authority packets\s*$/m);
  if (sectionStart === -1) {
    return [];
  }
  const section = content.slice(sectionStart).split(/\n(?=##\s+)/)[0] ?? "";
  const verdicts: Verdict[] = [];
  for (const field of FORBIDDEN_FIELDS) {
    const lineIndex = section.split(/\r?\n/).findIndex((line) => line.includes(field));
    if (lineIndex !== -1) {
      verdicts.push(forbiddenFieldVerdict(
        filePath,
        "page-plan 16a packet",
        field,
        lineNumber(content, sectionStart) + lineIndex
      ));
    }
  }
  return verdicts;
}

function parseFrontmatter(content: string): Record<string, unknown> | null {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") {
    return null;
  }
  const closingIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (closingIndex <= 0) {
    return null;
  }
  return asPlainRecord(yaml.load(lines.slice(1, closingIndex).join("\n")));
}

function forbiddenKeyVerdicts(
  filePath: string,
  surface: string,
  value: Record<string, unknown>,
  path: string[] = []
): Verdict[] {
  const verdicts: Verdict[] = [];
  for (const [key, nested] of Object.entries(value)) {
    if ((FORBIDDEN_FIELDS as readonly string[]).includes(key)) {
      verdicts.push(forbiddenFieldVerdict(filePath, surface, key, undefined, [...path, key].join(".")));
    }
    if (Array.isArray(nested)) {
      nested.forEach((item, index) => {
        if (isPlainRecord(item)) {
          verdicts.push(...forbiddenKeyVerdicts(filePath, surface, item, [...path, key, String(index)]));
        }
      });
      continue;
    }
    if (isPlainRecord(nested)) {
      verdicts.push(...forbiddenKeyVerdicts(filePath, surface, nested, [...path, key]));
    }
  }
  return verdicts;
}

function forbiddenFieldVerdict(
  filePath: string,
  surface: string,
  field: string,
  line?: number,
  path?: string
): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: `${VALIDATOR}.forbidden_field`,
    message: `${filePath} reintroduces forbidden STCHAR tamper hash field '${field}' on ${surface}.`,
    location: {
      file: filePath,
      ...(line === undefined ? {} : { line_range: [line, line] as [number, number] })
    },
    detail: { field, surface, ...(path === undefined ? {} : { path }) },
    suggested_fix: `Remove '${field}' from ${surface}; SPEC-71 retired STCHAR/page-packet tamper hashes.`
  };
}

function lineNumber(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length;
}
