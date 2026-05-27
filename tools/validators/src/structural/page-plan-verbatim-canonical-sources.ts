export const CANONICAL_SOURCES = {
  "2": "docs/prose-renderer-contract/content-policy.md",
  "3": "docs/prose-renderer-contract/prose-craft-contract.md",
  "19": "docs/prose-renderer-contract/render-time-instruction.md"
} as const;

export type VerbatimSectionNumber = keyof typeof CANONICAL_SOURCES;

export function stripFramingHeader(content: string): string {
  const lines = content.split(/\r?\n/);
  const separatorIndex = lines.findIndex((line) => line.trim() === "---");
  if (separatorIndex < 0) {
    throw new Error("Canonical source file lacks the required `---` separator line.");
  }
  return trimTrailingWhitespace(lines.slice(separatorIndex + 1).join("\n"));
}

export function trimTrailingWhitespace(value: string): string {
  return value.replace(/[ \t\r\n]+$/, "");
}
