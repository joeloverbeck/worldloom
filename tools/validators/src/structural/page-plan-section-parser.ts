import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { Context } from "../framework/types.js";
import { fileInputsFrom, toPosixPath, worldRootFrom } from "./utils.js";

const PLAN_PATH_PATTERN = /^stories\/([^/]+)\/pages-prose-plans\/(PG-(0|[1-9][0-9]*))\.md$/;

export interface PagePlanTarget {
  storySlug: string;
  pageId: string;
  path: string;
  content: string;
}

export function pagePlanTargets(input: unknown, ctx: Context): PagePlanTarget[] {
  const explicit = fileInputsFrom(input, ctx).flatMap((file) => pagePlanTargetFromContent(file.path, file.content));
  if (explicit.length > 0 || ctx.run_mode === "pre-apply") {
    return explicit;
  }

  const worldRoot = worldRootFrom(input, ctx);
  if (!worldRoot) {
    return [];
  }
  const storiesRoot = path.join(worldRoot, "stories");
  if (!existsSync(storiesRoot)) {
    return [];
  }

  const targets: PagePlanTarget[] = [];
  for (const storyEntry of readdirSync(storiesRoot, { withFileTypes: true })) {
    if (!storyEntry.isDirectory() || (ctx.story_slug && storyEntry.name !== ctx.story_slug)) {
      continue;
    }
    const plansRoot = path.join(storiesRoot, storyEntry.name, "pages-prose-plans");
    if (!existsSync(plansRoot)) {
      continue;
    }
    for (const file of readdirSync(plansRoot, { withFileTypes: true })) {
      if (!file.isFile()) {
        continue;
      }
      const relative = toPosixPath(path.join("stories", storyEntry.name, "pages-prose-plans", file.name));
      targets.push(...pagePlanTargetFromContent(relative, readFileSync(path.join(plansRoot, file.name), "utf8")));
    }
  }
  return targets;
}

export function pagePlanTargetFromContent(filePath: string, content: string): PagePlanTarget[] {
  const normalizedPath = toPosixPath(filePath);
  const match = normalizedPath.match(PLAN_PATH_PATTERN);
  const storySlug = match?.[1];
  const planPageId = match?.[2];
  return storySlug && planPageId ? [{ storySlug, pageId: planPageId, path: normalizedPath, content }] : [];
}

export function markdownSection(content: string, headingPattern: RegExp): string | null {
  const match = headingPattern.exec(content);
  if (match?.index === undefined) {
    return null;
  }
  return content.slice(match.index).split(/\n(?=##\s+)/)[0] ?? "";
}
