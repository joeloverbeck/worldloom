import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  fileInputsFrom,
  queryStructuralRecords,
  stringValue,
  toPosixPath,
  worldRootFrom
} from "./utils.js";
import { allStorySlugs, appliesToStcharStoryState, isNonBackgroundEntity, recordId, storyMaps } from "./stchar-utils.js";
import { frontmatterFor } from "./yaml-parse-integrity.js";

const VALIDATOR = "story_kernel_cast_bind_list_integrity";
const KERNEL_PATH_PATTERN = /^stories\/([^/]+)\/STORY_KERNEL\.md$/;
const STCHAR_ID = /^STCHAR-(0|[1-9][0-9]*)$/;

interface KernelTarget {
  storySlug: string;
  path: string;
  content: string;
}

interface CastBindEntry {
  index: number;
  record: Record<string, unknown>;
}

export const storyKernelCastBindListIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    appliesToStcharStoryState(ctx) ||
    ctx.touched_files.some((file) => KERNEL_PATH_PATTERN.test(toPosixPath(file))),
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const kernels = kernelTargets(input, ctx);
    const verdicts: Verdict[] = [];

    for (const storySlug of allStorySlugs(records)) {
      const maps = storyMaps(records, storySlug);
      const kernel = kernels.find((target) => target.storySlug === storySlug);
      if (!kernel) {
        continue;
      }

      const frontmatter = parseKernelFrontmatter(kernel);
      if (!frontmatter.ok) {
        verdicts.push(kernelFail(
          kernel.path,
          "story_kernel_cast_bind_list_integrity.frontmatter_parse",
          `${kernel.path} STORY_KERNEL.md frontmatter could not be parsed.`,
          { error: frontmatter.error },
          "Repair the STORY_KERNEL.md YAML frontmatter before checking cast bindings."
        ));
        continue;
      }

      const castEntries = castBindEntries(frontmatter.value.cast_bind_list);
      for (const entry of castEntries) {
        verdicts.push(...entryVerdicts(kernel, entry, maps.byId));
      }
    }

    return verdicts;
  }
};

function entryVerdicts(
  kernel: KernelTarget,
  entry: CastBindEntry,
  recordsById: Map<string, IndexedRecord>
): Verdict[] {
  const verdicts: Verdict[] = [];
  const stentId = stringValue(entry.record.stent_id);
  const stcharId = stringValue(entry.record.stchar_id);
  const sourceCharId = stringValue(entry.record.source_char_id);
  const pathPrefix = `cast_bind_list[${entry.index}]`;

  if (Object.hasOwn(entry.record, "bound_char_id")) {
    verdicts.push(kernelFail(
      kernel.path,
      "story_kernel_cast_bind_list_integrity.bound_char_id_present",
      `${kernel.path} ${pathPrefix} carries legacy bound_char_id; story runtime authority must use STCHAR ids.`,
      { story_slug: kernel.storySlug, stent_id: stentId ?? null, reference_path: `${pathPrefix}.bound_char_id` },
      "Remove bound_char_id from the cast binding entry; keep world CHAR ids only in source_char_id provenance."
    ));
  }

  if (!isNonBackgroundEntity(entry.record)) {
    return verdicts;
  }

  if (!stcharId || !STCHAR_ID.test(stcharId)) {
    verdicts.push(kernelFail(
      kernel.path,
      "story_kernel_cast_bind_list_integrity.missing_stchar_id",
      `${kernel.path} ${pathPrefix} is a non-background cast entry without a valid stchar_id.`,
      { story_slug: kernel.storySlug, stent_id: stentId ?? null, stchar_id: stcharId ?? null, reference_path: `${pathPrefix}.stchar_id` },
      "Bind every non-background cast STENT to its story-local STCHAR id."
    ));
    return verdicts;
  }

  const stchar = recordsById.get(stcharId);
  if (stchar?.node_type !== "story_character_authority_record") {
    verdicts.push(kernelFail(
      kernel.path,
      "story_kernel_cast_bind_list_integrity.unresolved_stchar_id",
      `${kernel.path} ${pathPrefix}.stchar_id names ${stcharId}, but no STCHAR record resolves for this story.`,
      { story_slug: kernel.storySlug, stent_id: stentId ?? null, stchar_id: stcharId, reference_path: `${pathPrefix}.stchar_id` },
      `Create or restore ${stcharId}, or update the cast binding entry to the resolving STCHAR id.`
    ));
    return verdicts;
  }

  const stcharSourceCharId = stringValue(asPlainRecord(stchar.parsed).source_char_id);
  if ((sourceCharId ?? null) !== (stcharSourceCharId ?? null)) {
    verdicts.push(kernelFail(
      kernel.path,
      "story_kernel_cast_bind_list_integrity.source_char_id_mismatch",
      `${kernel.path} ${pathPrefix}.source_char_id is ${sourceCharId ?? "<missing>"}, expected ${stcharSourceCharId ?? "<null>"} from ${stcharId}.`,
      {
        story_slug: kernel.storySlug,
        stent_id: stentId ?? null,
        stchar_id: stcharId,
        observed_source_char_id: sourceCharId ?? null,
        expected_source_char_id: stcharSourceCharId ?? null,
        reference_path: `${pathPrefix}.source_char_id`
      },
      `Set ${pathPrefix}.source_char_id to ${stcharSourceCharId ?? "null"} so CHAR provenance stays aligned with ${stcharId}.`
    ));
  }

  return verdicts;
}

function castBindEntries(value: unknown): CastBindEntry[] {
  return Array.isArray(value)
    ? value
      .map((item, index) => ({ index, record: asPlainRecord(item) }))
      .filter((entry) => Object.keys(entry.record).length > 0)
    : [];
}

function parseKernelFrontmatter(kernel: KernelTarget): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const frontmatter = frontmatterFor(kernel.content);
  if (frontmatter === null) {
    return { ok: true, value: {} };
  }
  try {
    return { ok: true, value: asPlainRecord(yaml.load(frontmatter, { schema: yaml.JSON_SCHEMA })) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function kernelTargets(input: unknown, ctx: Context): KernelTarget[] {
  const explicit = fileInputsFrom(input, ctx).flatMap((file) => kernelTargetFromContent(file.path, file.content));
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

  const targets: KernelTarget[] = [];
  for (const storyEntry of readdirSync(storiesRoot, { withFileTypes: true })) {
    if (!storyEntry.isDirectory() || (ctx.story_slug && storyEntry.name !== ctx.story_slug)) {
      continue;
    }
    const kernelPath = path.join(storiesRoot, storyEntry.name, "STORY_KERNEL.md");
    if (!existsSync(kernelPath)) {
      continue;
    }
    const relative = toPosixPath(path.join("stories", storyEntry.name, "STORY_KERNEL.md"));
    targets.push(...kernelTargetFromContent(relative, readFileSync(kernelPath, "utf8")));
  }
  return targets;
}

function kernelTargetFromContent(filePath: string, content: string): KernelTarget[] {
  const normalizedPath = toPosixPath(filePath);
  const storySlug = normalizedPath.match(KERNEL_PATH_PATTERN)?.[1];
  return storySlug ? [{ storySlug, path: normalizedPath, content }] : [];
}

function kernelFail(
  file: string,
  code: string,
  message: string,
  detail: unknown,
  suggested_fix: string
): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: { file },
    detail,
    suggested_fix
  };
}
