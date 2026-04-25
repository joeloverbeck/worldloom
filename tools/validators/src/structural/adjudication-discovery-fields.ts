import type { Context, Validator, Verdict } from "../framework/types.js";
import { fileInputsFrom, toPosixPath, touchedFilesInclude } from "./utils.js";

const CANONICAL_FIELDS = new Set([
  "mystery_reserve_touched",
  "invariants_touched",
  "cf_records_touched",
  "open_questions_touched",
  "change_id"
]);

const DENYLIST = new Set(["New CF", "Modifications", "Critics dispatched", "Dispatch"]);

export const adjudicationDiscoveryFields: Validator = {
  name: "adjudication_discovery_fields",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode !== "incremental" || touchedFilesInclude(ctx, /adjudications\/PA-\d{4}.*\.md$/),
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];
    const files = fileInputsFrom(input, ctx).filter((file) =>
      toPosixPath(file.path).startsWith("adjudications/")
    );

    for (const file of files) {
      if (ctx.run_mode === "incremental" && ctx.touched_files.length > 0) {
        const touched = new Set(ctx.touched_files.map(toPosixPath));
        if (!touched.has(toPosixPath(file.path))) {
          continue;
        }
      }

      for (const field of discoveryFields(file.content)) {
        const normalized = normalizeField(field);
        if (DENYLIST.has(normalized) || (looksLikeDiscoveryField(normalized) && !CANONICAL_FIELDS.has(normalized))) {
          verdicts.push({
            validator: "adjudication_discovery_fields",
            severity: "fail",
            code: "adjudication_discovery_fields.non_canonical",
            message: `${file.path} Discovery block uses non-canonical field '${normalized}'`,
            location: { file: file.path }
          });
        }
      }
    }

    return verdicts;
  }
};

function discoveryFields(content: string): string[] {
  const heading = /^## Discovery\s*$/im.exec(content);
  if (!heading) {
    return [];
  }
  const afterHeading = content.slice(heading.index + heading[0].length);
  const nextHeading = /\n##\s+/.exec(afterHeading);
  const block = nextHeading ? afterHeading.slice(0, nextHeading.index) : afterHeading;
  const fields: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    const match = /^\s*[-*]\s*([^:]+):/.exec(line);
    if (match?.[1]) {
      fields.push(match[1].trim());
    }
  }
  return fields;
}

function looksLikeDiscoveryField(field: string): boolean {
  return field.includes(" ") || field.includes("_");
}

function normalizeField(field: string): string {
  return field.replaceAll("*", "").replaceAll("`", "").trim();
}
