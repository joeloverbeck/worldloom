import yaml from "js-yaml";

import type { Context, Validator, Verdict } from "../framework/types.js";
import { fileInputsFrom, toPosixPath } from "./utils.js";

export const yamlParseIntegrity: Validator = {
  name: "yaml_parse_integrity",
  severity_mode: "fail",
  applies_to: () => true,
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];
    const files = scopedFiles(input, ctx);

    for (const file of files) {
      const contentToParse = yamlContentForFile(file.path, file.content);
      if (contentToParse === null) {
        continue;
      }
      try {
        yaml.load(contentToParse, { schema: yaml.JSON_SCHEMA });
      } catch (error) {
        verdicts.push({
          validator: "yaml_parse_integrity",
          severity: "fail",
          code: "yaml_parse_integrity.parse_error",
          message: error instanceof Error ? error.message : String(error),
          location: { file: file.path }
        });
      }
    }

    return verdicts;
  }
};

export function yamlContentForFile(filePath: string, content: string): string | null {
  const normalizedPath = toPosixPath(filePath);
  if (normalizedPath.startsWith("_source/") && normalizedPath.endsWith(".yaml")) {
    return content;
  }
  if (
    (normalizedPath.startsWith("characters/") || normalizedPath.startsWith("diegetic-artifacts/")) &&
    normalizedPath.endsWith(".md")
  ) {
    return frontmatterFor(content);
  }
  return null;
}

export function frontmatterFor(content: string): string | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  return match?.[1] ?? null;
}

function scopedFiles(input: unknown, ctx: Context) {
  const files = fileInputsFrom(input, ctx);
  if (ctx.run_mode !== "incremental" || ctx.touched_files.length === 0) {
    return files;
  }

  const touched = new Set(ctx.touched_files.map(toPosixPath));
  return files.filter((file) => touched.has(toPosixPath(file.path)));
}
