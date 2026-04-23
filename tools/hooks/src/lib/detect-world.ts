import { readdirSync } from "node:fs";
import path from "node:path";

import { resolveWorldsRoot } from "./pathing";

function listWorldSlugs(cwd?: string): string[] {
  try {
    return readdirSync(resolveWorldsRoot(cwd), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

function hasWordBoundaryMatch(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}

export function detectWorldSlug(prompt: string, cwd?: string): string | null {
  const pathMatch = prompt.match(/worlds\/([a-z0-9-]+)\//i);
  if (pathMatch?.[1] !== undefined) {
    return pathMatch[1];
  }

  const slashCommandMatch = prompt.match(/(?:^|\s)(?:\/\w+\s+)([a-z0-9-]+)(?=\s|$)/i);
  if (slashCommandMatch?.[1] !== undefined) {
    const candidate = slashCommandMatch[1].toLowerCase();
    if (listWorldSlugs(cwd).includes(candidate)) {
      return candidate;
    }
  }

  for (const slug of listWorldSlugs(cwd)) {
    if (hasWordBoundaryMatch(prompt, slug)) {
      return slug;
    }
  }

  return null;
}

export function worldRelativeFilePath(absoluteFilePath: string, worldSlug: string): string | null {
  const marker = `${path.sep}worlds${path.sep}${worldSlug}${path.sep}`;
  const normalized = path.resolve(absoluteFilePath);
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  return normalized.slice(markerIndex + marker.length);
}
