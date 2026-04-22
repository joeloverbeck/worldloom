import {
  normalizeProseWhitespace,
  serializeStableYaml,
  sha256Hex
} from "../hash/content";

export const ANCHOR_CONTEXT_LINES = 3;

export function contentHashForYaml(parsed: unknown): string {
  return sha256Hex(serializeStableYaml(parsed));
}

export function contentHashForProse(body: string): string {
  return sha256Hex(normalizeProseWhitespace(body));
}

export function anchorChecksum(lines: string[], lineStart: number, lineEnd: number): string {
  const bodyStartIndex = Math.max(0, lineStart - 1);
  const bodyEndIndex = Math.max(bodyStartIndex, lineEnd);
  const contextStartIndex = Math.max(0, bodyStartIndex - ANCHOR_CONTEXT_LINES);
  const contextEndIndex = Math.min(lines.length, lineEnd + ANCHOR_CONTEXT_LINES);
  const anchorForm = lines.slice(contextStartIndex, contextEndIndex).join("\n");

  return sha256Hex(anchorForm);
}
