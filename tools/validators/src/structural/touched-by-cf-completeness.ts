import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  FILE_CLASS_TO_SUBDIR,
  asPlainRecord,
  locationFor,
  nestedRecords,
  queryRecordsByType,
  stringArray,
  toPosixPath,
  touchedFilesInclude
} from "./utils.js";

const SECTION_FILE_CLASSES = new Set([
  "EVERYDAY_LIFE",
  "INSTITUTIONS",
  "MAGIC_OR_TECH_SYSTEMS",
  "GEOGRAPHY",
  "ECONOMY_AND_RESOURCES",
  "PEOPLES_AND_SPECIES",
  "TIMELINE"
]);

export const touchedByCfCompleteness: Validator = {
  name: "touched_by_cf_completeness",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode !== "incremental" || touchedFilesInclude(ctx, /_source\/(canon|everyday-life|institutions|magic-or-tech-systems|geography|economy-and-resources|peoples-and-species|timeline)\//),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const cfRecords = await queryRecordsByType(ctx, "canon_fact_record");
    const sectionRecords = await queryRecordsByType(ctx, "section");
    const cfById = new Map(cfRecords.map((record) => [record.node_id, record]));
    const sectionsByFileClass = groupSectionsByFileClass(sectionRecords);
    const verdicts: Verdict[] = [];

    for (const section of sectionRecords) {
      const parsed = asPlainRecord(section.parsed);
      const fileClass = String(parsed.file_class ?? "");
      for (const cfId of stringArray(parsed.touched_by_cf)) {
        const cf = cfById.get(cfId);
        const cfUpdates = cf ? stringArray(asPlainRecord(cf.parsed).required_world_updates) : [];
        if (!cf || !cfUpdates.includes(fileClass)) {
          verdicts.push({
            validator: "touched_by_cf_completeness",
            severity: "fail",
            code: "touched_by_cf_completeness.sec_to_cf_miss",
            message: `${section.node_id} cites ${cfId}, but that CF does not list ${fileClass} in required_world_updates`,
            location: locationFor(section)
          });
        }
      }
    }

    for (const cf of cfRecords) {
      const parsed = asPlainRecord(cf.parsed);
      for (const fileClass of stringArray(parsed.required_world_updates)) {
        if (!SECTION_FILE_CLASSES.has(fileClass)) {
          continue;
        }
        const candidates = sectionsByFileClass.get(fileClass) ?? [];
        if (candidates.some((section) => sectionCitesCf(section, cf.node_id))) {
          continue;
        }
        verdicts.push({
          validator: "touched_by_cf_completeness",
          severity: "fail",
          code: "touched_by_cf_completeness.cf_to_sec_miss",
          message: `${cf.node_id} lists ${fileClass}, but no ${FILE_CLASS_TO_SUBDIR[fileClass] ?? "matching"} SEC cites it in touched_by_cf or extensions.originating_cf (${candidates.length} SECs searched)`,
          location: locationFor(cf)
        });
      }
    }

    return verdicts;
  }
};

function groupSectionsByFileClass(sectionRecords: IndexedRecord[]): Map<string, IndexedRecord[]> {
  const grouped = new Map<string, IndexedRecord[]>();
  for (const section of sectionRecords) {
    const parsed = asPlainRecord(section.parsed);
    const fileClass = String(parsed.file_class ?? "");
    const directory = toPosixPath(section.file_path).split("/").at(-2);
    if (FILE_CLASS_TO_SUBDIR[fileClass] !== directory) {
      continue;
    }
    const bucket = grouped.get(fileClass) ?? [];
    bucket.push(section);
    grouped.set(fileClass, bucket);
  }
  return grouped;
}

function sectionCitesCf(section: IndexedRecord, cfId: string): boolean {
  const parsed = asPlainRecord(section.parsed);
  if (stringArray(parsed.touched_by_cf).includes(cfId)) {
    return true;
  }
  return nestedRecords(parsed, "extensions").some((entry) => entry.originating_cf === cfId);
}
