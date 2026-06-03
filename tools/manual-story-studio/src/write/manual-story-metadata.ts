import YAML from "yaml";

import type { ManualStoryMetadata } from "../schema/manual-story.js";
import {
  validateManualStoryMetadata,
  type ValidationError,
} from "../validate/schema.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
  type ManualStoryRoot,
} from "./sandbox.js";

export type UpdateMetadataResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] };

export interface UpdateMetadataOptions {
  now?: () => string;
}

export function updateManualStoryMetadata(
  manualStoryRoot: ManualStoryRoot,
  metadata: ManualStoryMetadata,
  opts: UpdateMetadataOptions = {},
): UpdateMetadataResult {
  const now = opts.now ? opts.now() : new Date().toISOString();
  const stamped: ManualStoryMetadata = { ...metadata, updated_at: now };
  const result = validateManualStoryMetadata(stamped);
  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }
  const yamlText = YAML.stringify(stamped);
  safeWriteFile(manualStoryRoot, "manual-story.yaml", yamlText);
  return { ok: true };
}

export function rootFromRepo(
  repoRoot: string,
  worldSlug: string,
  manualStorySlug: string,
): ManualStoryRoot {
  return resolveManualStoryRoot(repoRoot, worldSlug, manualStorySlug);
}

export function makeDefaultManualStoryMetadata(
  worldSlug: string,
  manualStorySlug: string,
  title: string,
  now: string,
): ManualStoryMetadata {
  return {
    schema_version: "manual-story.v1",
    world_slug: worldSlug,
    manual_story_slug: manualStorySlug,
    title,
    created_at: now,
    updated_at: now,
    source: { world_commit: null, notes: "" },
    story_contract: {
      premise: "",
      tone: "",
      pov: "close third",
      tense: "past",
      content_intensity: "general",
      explicitness: "",
      language_register: "mixed",
      prose_preferences: {
        psychic_distance: "variable",
        dialogue_density: "mixed",
        interiority: "mixed",
        paragraphing: "mixed",
      },
    },
    cast_order: [],
    segment_order: [],
    prompt_policy: {
      save_prompts: true,
      require_moment_directive: true,
      default_beat_count: "3-5",
      include_recent_segments: 0,
      recent_template_advisory_window: 2,
    },
    manuscript: {
      compile_on_segment_save: true,
      include_segment_titles: false,
      allow_reorder: false,
    },
  };
}
