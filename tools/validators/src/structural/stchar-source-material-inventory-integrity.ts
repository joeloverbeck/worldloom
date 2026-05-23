import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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
import { OPERATIONAL_TARGET_SECTIONS } from "./_stchar-operational-sections.js";

const VALIDATOR = "stchar_source_material_inventory_integrity";
const STCHAR_PATH = /^stories\/[^/]+\/story-characters\/STCHAR-(0|[1-9][0-9]*)\.md$/;

const RETAINED_DISPOSITIONS = new Set(["copied", "transformed", "compressed"]);
const OMITTED_DISPOSITIONS = new Set(["omitted_with_rationale", "story_irrelevant"]);
const VALID_DISPOSITIONS = new Set([...RETAINED_DISPOSITIONS, ...OMITTED_DISPOSITIONS]);
const BOOTSTRAP_STORY_IRRELEVANT_RATIONALES = new Set([
  "outside_story_scope",
  "content_constraint",
  "premise_incompatible",
  "non_operational_trivia",
  "duplicate_of_retained_material"
]);
const FORBIDDEN_OPENING_RATIONALES = [
  "opening_not_relevant",
  "not_needed_on_page_1",
  "not_in_root_scene"
] as const;

interface InventoryRow {
  rowIndex: number;
  sourceArea: string | undefined;
  disposition: string | undefined;
  operationalHome: string | undefined;
  rationale: string | undefined;
}

export const stcharSourceMaterialInventoryIntegrity: Validator = {
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
      if (!shouldCheckRecordInPreApply(record, ctx) || sourceKind(record) !== "world_char") {
        continue;
      }

      const content = files.get(toPosixPath(record.file_path));
      if (content === undefined) {
        continue;
      }

      verdicts.push(...inventoryVerdicts(record, content));
    }

    return verdicts;
  }
};

function inventoryVerdicts(record: IndexedRecord, content: string): Verdict[] {
  const id = recordId(record);
  const body = bodyMarkdown(content);
  const sourceDistillation = sectionBodies(body).get("Source Distillation")?.[0];
  const inventory = sourceDistillation === undefined
    ? undefined
    : subsectionBodiesByHeading(sourceDistillation).get("Stable Source Material Inventory")?.[0];

  if (inventory === undefined || inventory.trim().length === 0) {
    return [stcharFail(
      record,
      "missing_inventory",
      `${id} source_kind world_char STCHAR must include a non-empty '### Stable Source Material Inventory' subsection under '## Source Distillation'.`,
      { section: "Source Distillation", subsection: "Stable Source Material Inventory" },
      "Add a populated Stable Source Material Inventory table covering stable operational source material."
    )];
  }

  const parseResult = inventoryRows(inventory);
  if (!parseResult.hasRequiredColumns) {
    return [stcharFail(
      record,
      "invalid_inventory_header",
      `${id} Stable Source Material Inventory table must include source_area, disposition, operational_home, and rationale columns.`,
      { required_columns: ["source_area", "disposition", "operational_home", "rationale"] },
      "Use the required inventory table columns before accepting this STCHAR."
    )];
  }

  if (parseResult.rows.length === 0) {
    return [stcharFail(
      record,
      "empty_inventory",
      `${id} Stable Source Material Inventory must contain at least one material row.`,
      { subsection: "Stable Source Material Inventory" },
      "Add one row per loaded source area carrying stable operational character material."
    )];
  }

  return parseResult.rows.flatMap((row) => rowVerdicts(record, row));
}

function rowVerdicts(record: IndexedRecord, row: InventoryRow): Verdict[] {
  const verdicts: Verdict[] = [];
  const detail = { row_index: row.rowIndex, source_area: row.sourceArea ?? null };

  if (row.sourceArea === undefined) {
    verdicts.push(stcharFail(
      record,
      "missing_source_area",
      `${recordId(record)} Stable Source Material Inventory row ${row.rowIndex} must name source_area.`,
      detail,
      "Name the loaded source area that the row covers."
    ));
  }

  if (row.disposition === undefined || !VALID_DISPOSITIONS.has(row.disposition)) {
    verdicts.push(stcharFail(
      record,
      "invalid_disposition",
      `${recordId(record)} Stable Source Material Inventory row ${row.rowIndex} has an invalid disposition.`,
      { ...detail, disposition: row.disposition ?? null },
      "Use copied, transformed, compressed, omitted_with_rationale, or story_irrelevant."
    ));
    return verdicts;
  }

  if (RETAINED_DISPOSITIONS.has(row.disposition)) {
    if (row.operationalHome === undefined) {
      verdicts.push(stcharFail(
        record,
        "missing_operational_home",
        `${recordId(record)} retained Stable Source Material Inventory row ${row.rowIndex} must name operational_home.`,
        { ...detail, disposition: row.disposition },
        "Set operational_home to the operational STCHAR H2 that carries the retained material."
      ));
    } else if (row.operationalHome === "Source Distillation") {
      verdicts.push(stcharFail(
        record,
        "source_distillation_operational_home",
        `${recordId(record)} retained Stable Source Material Inventory row ${row.rowIndex} maps retained material to Source Distillation.`,
        { ...detail, operational_home: row.operationalHome },
        "Move retained operational material to one of the operational STCHAR H2 sections."
      ));
    } else if (!OPERATIONAL_TARGET_SECTIONS.has(row.operationalHome)) {
      verdicts.push(stcharFail(
        record,
        "invalid_operational_home",
        `${recordId(record)} Stable Source Material Inventory row ${row.rowIndex} maps retained material to a non-operational STCHAR home.`,
        { ...detail, operational_home: row.operationalHome },
        "Use one of the 11 operational STCHAR H2 section names."
      ));
    }
  }

  if (OMITTED_DISPOSITIONS.has(row.disposition) && row.rationale === undefined) {
    verdicts.push(stcharFail(
      record,
      "missing_rationale",
      `${recordId(record)} omitted Stable Source Material Inventory row ${row.rowIndex} must include a rationale.`,
      { ...detail, disposition: row.disposition },
      "Add a non-empty rationale for omitted_with_rationale or story_irrelevant dispositions."
    ));
  }

  if (row.disposition === "story_irrelevant" && row.rationale !== undefined) {
    if (!BOOTSTRAP_STORY_IRRELEVANT_RATIONALES.has(row.rationale)) {
      verdicts.push(stcharFail(
        record,
        "invalid_story_irrelevant_rationale",
        `${recordId(record)} story_irrelevant inventory row ${row.rowIndex} must use a structured bootstrap rationale category.`,
        { ...detail, rationale: row.rationale },
        "Use outside_story_scope, content_constraint, premise_incompatible, non_operational_trivia, or duplicate_of_retained_material."
      ));
    }
    const lowered = row.rationale.toLowerCase();
    const forbidden = FORBIDDEN_OPENING_RATIONALES.find((item) => lowered.includes(item));
    if (forbidden !== undefined) {
      verdicts.push(stcharFail(
        record,
        "opening_relevance_rationale",
        `${recordId(record)} story_irrelevant inventory row ${row.rowIndex} uses opening-page relevance as the omission rationale.`,
        { ...detail, rationale: row.rationale, forbidden },
        "Opening-page relevance is never the STCHAR source-material inclusion test."
      ));
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

function inventoryRows(markdown: string): { hasRequiredColumns: boolean; rows: InventoryRow[] } {
  const tableLines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));

  if (tableLines.length < 2) {
    return { hasRequiredColumns: false, rows: [] };
  }

  const headers = splitTableRow(tableLines[0] ?? "").map(normalizeHeader);
  const required = ["source_area", "disposition", "operational_home", "rationale"];
  const indexes = Object.fromEntries(required.map((key) => [key, headers.indexOf(key)])) as Record<string, number>;
  if (Object.values(indexes).some((index) => index < 0)) {
    return { hasRequiredColumns: false, rows: [] };
  }
  const sourceAreaIndex = indexes.source_area;
  const dispositionIndex = indexes.disposition;
  const operationalHomeIndex = indexes.operational_home;
  const rationaleIndex = indexes.rationale;
  if (
    sourceAreaIndex === undefined ||
    dispositionIndex === undefined ||
    operationalHomeIndex === undefined ||
    rationaleIndex === undefined
  ) {
    return { hasRequiredColumns: false, rows: [] };
  }

  const rows = tableLines.slice(2)
    .map(splitTableRow)
    .filter((cells) => cells.some((cell) => cell.trim().length > 0))
    .map((cells, index) => ({
      rowIndex: index + 1,
      sourceArea: cellValue(cells[sourceAreaIndex] ?? ""),
      disposition: cellValue(cells[dispositionIndex] ?? ""),
      operationalHome: cellValue(cells[operationalHomeIndex] ?? ""),
      rationale: cellValue(cells[rationaleIndex] ?? "")
    }));

  return { hasRequiredColumns: true, rows };
}

function splitTableRow(line: string): string[] {
  return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/`/g, "").replace(/\s+/g, "_");
}

function cellValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === "-" || trimmed.toLowerCase() === "null") {
    return undefined;
  }
  return trimmed;
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
