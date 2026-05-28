import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { Context } from "../framework/types.js";
import { fileInputsFrom, toPosixPath, worldRootFrom } from "./utils.js";

const SCENE_PLAN_PATH_PATTERN = /^stories\/([^/]+)\/scene-prose-plans\/(SCN-(0|[1-9][0-9]*))\.md$/;

export interface ScenePlanTarget {
  storySlug: string;
  sceneId: string;
  path: string;
  content: string;
}

export interface MarkdownSection {
  key: string;
  title: string;
  startLine: number;
  lines: string[];
}

export function scenePlanTargets(input: unknown, ctx: Context): ScenePlanTarget[] {
  const explicit = fileInputsFrom(input, ctx).flatMap((file) => scenePlanTargetFromContent(file.path, file.content));
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

  const targets: ScenePlanTarget[] = [];
  for (const storyEntry of readdirSync(storiesRoot, { withFileTypes: true })) {
    if (!storyEntry.isDirectory() || (ctx.story_slug && storyEntry.name !== ctx.story_slug)) {
      continue;
    }
    const plansRoot = path.join(storiesRoot, storyEntry.name, "scene-prose-plans");
    if (!existsSync(plansRoot)) {
      continue;
    }
    for (const file of readdirSync(plansRoot, { withFileTypes: true })) {
      if (!file.isFile()) {
        continue;
      }
      const relative = toPosixPath(path.join("stories", storyEntry.name, "scene-prose-plans", file.name));
      targets.push(...scenePlanTargetFromContent(relative, readFileSync(path.join(plansRoot, file.name), "utf8")));
    }
  }
  return targets;
}

export function scenePlanTargetFromContent(filePath: string, content: string): ScenePlanTarget[] {
  const normalizedPath = toPosixPath(filePath);
  const match = normalizedPath.match(SCENE_PLAN_PATH_PATTERN);
  const storySlug = match?.[1];
  const sceneId = match?.[2];
  return storySlug && sceneId ? [{ storySlug, sceneId, path: normalizedPath, content }] : [];
}

export function parseScenePlanSections(content: string): MarkdownSection[] {
  const lines = content.split(/\r?\n/);
  const headings: Array<{ lineIndex: number; key: string; title: string }> = [];
  lines.forEach((line, index) => {
    const match = line.match(/^##\s+(?:(\d+)\.\s*)?(.+?)\s*$/);
    if (match?.[2]) {
      headings.push({
        lineIndex: index,
        key: normalizeHeadingKey(match[2], match[1]),
        title: match[2].trim()
      });
    }
  });

  return headings.map((heading, index) => {
    const next = headings[index + 1]?.lineIndex ?? lines.length;
    return {
      key: heading.key,
      title: heading.title,
      startLine: heading.lineIndex + 1,
      lines: lines.slice(heading.lineIndex, next)
    };
  });
}

export function sectionBody(content: string, key: string): string | undefined {
  const section = parseScenePlanSections(content).find((item) => item.key === key);
  if (!section) {
    return undefined;
  }
  return trimSectionBody(section.lines.slice(1).join("\n"));
}

export function normalizeHeadingKey(title: string, _number?: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");
}

function trimSectionBody(value: string): string {
  const lines = value.split(/\r?\n/);
  while ((lines[0] ?? "").trim() === "") {
    lines.shift();
  }
  while ((lines[lines.length - 1] ?? "").trim() === "") {
    lines.pop();
  }
  return lines.join("\n");
}
