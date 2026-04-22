import { createHash } from "node:crypto";

import YAML from "yaml";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input.normalize("NFC"), "utf8").digest("hex");
}

export function normalizeProseWhitespace(body: string): string {
  const trimmedPerLine = body.replace(/[^\S\n]+$/gm, "");
  const collapsedNewlines = trimmedPerLine.replace(/\n{3,}/g, "\n\n");
  return collapsedNewlines.replace(/^\n+|\n+$/g, "");
}

export function serializeStableYaml(value: unknown): string {
  return YAML.stringify(value, {
    lineWidth: 0,
    sortMapEntries: true
  });
}
