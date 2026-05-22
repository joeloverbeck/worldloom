import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  fileInputsFrom,
  queryStructuralRecords,
  toPosixPath,
  worldRootFrom
} from "./utils.js";
import {
  appliesToStcharStoryState,
  CHAR_ID,
  collectStringReferences,
  fail,
  recordId,
  shouldCheckRecordInPreApply
} from "./stchar-utils.js";

const VALIDATOR = "no_char_authority_in_story_runtime";
const STORY_RUNTIME_TYPES = new Set([
  "story_entity_record",
  "story_status_record",
  "story_fact_record",
  "story_event_record",
  "obligation_record",
  "consequence_record",
  "thread_record",
  "relationship_record_story",
  "intention_record",
  "story_location_record",
  "story_object_record",
  "branch_record",
  "page_record",
  "choice_record",
  "storylet_record",
  "belief_record",
  "story_emotion_record",
  "pressure_clock_record",
  "story_secret_record",
  "story_question_record",
  "story_plan_record",
  "story_diegetic_artifact_record",
  "story_character_authority_record"
]);
const TEXT_SURFACE_PATTERN = /^stories\/[^/]+\/(?:pages-prose-plans\/PG-(0|[1-9][0-9]*)\.md|pages-prose-receipts\/PG-(0|[1-9][0-9]*)\.yaml)$/;

export const noCharAuthorityInStoryRuntime: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const record of records.filter((candidate) => STORY_RUNTIME_TYPES.has(candidate.node_type))) {
      if (!shouldCheckRecordInPreApply(record, ctx)) {
        continue;
      }
      verdicts.push(...recordCharLeaks(record));
    }
    verdicts.push(...textSurfaceCharLeaks(input, ctx));

    return verdicts;
  }
};

function recordCharLeaks(record: IndexedRecord): Verdict[] {
  const references = collectStringReferences(record.parsed, recordId(record), CHAR_ID);
  return references
    .filter((reference) => !isAllowedCharReference(record, reference.path))
    .map((reference) => fail(
      VALIDATOR,
      record,
      "no_char_authority_in_story_runtime.char_authority_leak",
      `${recordId(record)} cites world CHAR ${reference.id} at ${reference.path}; story runtime must use STCHAR authority.`,
      { reference_id: reference.id, reference_path: reference.path },
      `Replace ${reference.id} with a story-local STCHAR reference, except on STCHAR provenance or explicit promotion/adjudication surfaces.`
    ));
}

function isAllowedCharReference(record: IndexedRecord, referencePath: string): boolean {
  if (record.node_type === "story_character_authority_record" && referencePath.endsWith(".source_char_id")) {
    return true;
  }
  if (record.node_type === "story_event_record" && referencePath.includes(".promotion_claims[")) {
    return true;
  }
  if (record.node_type === "adjudication_record") {
    return true;
  }
  return false;
}

function textSurfaceCharLeaks(input: unknown, ctx: Context): Verdict[] {
  return textTargets(input, ctx).flatMap((target) => {
    const matches = [...target.content.matchAll(new RegExp(CHAR_ID.source, "g"))];
    return matches.map((match) => ({
      validator: VALIDATOR,
      severity: "fail" as const,
      code: "no_char_authority_in_story_runtime.char_authority_text_leak",
      message: `${target.path} cites world CHAR ${match[0]}; page plans and prose receipts must use STCHAR authority.`,
      location: { file: target.path },
      detail: { reference_id: match[0], offset: match.index ?? null },
      suggested_fix: `Replace ${match[0]} with the corresponding STCHAR packet/profile reference.`
    }));
  });
}

interface TextTarget {
  path: string;
  content: string;
}

function textTargets(input: unknown, ctx: Context): TextTarget[] {
  const explicit = fileInputsFrom(input, ctx)
    .filter((file) => TEXT_SURFACE_PATTERN.test(file.path))
    .map((file) => ({ path: toPosixPath(file.path), content: file.content }));
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

  const targets: TextTarget[] = [];
  for (const storyEntry of readdirSync(storiesRoot, { withFileTypes: true })) {
    if (!storyEntry.isDirectory() || (ctx.story_slug && storyEntry.name !== ctx.story_slug)) {
      continue;
    }
    for (const dir of ["pages-prose-plans", "pages-prose-receipts"]) {
      const absoluteDir = path.join(storiesRoot, storyEntry.name, dir);
      if (!existsSync(absoluteDir)) {
        continue;
      }
      for (const file of readdirSync(absoluteDir, { withFileTypes: true })) {
        if (!file.isFile()) {
          continue;
        }
        const relative = toPosixPath(path.join("stories", storyEntry.name, dir, file.name));
        if (!TEXT_SURFACE_PATTERN.test(relative)) {
          continue;
        }
        targets.push({ path: relative, content: readFileSync(path.join(absoluteDir, file.name), "utf8") });
      }
    }
  }

  return targets.sort((left, right) => left.path.localeCompare(right.path, "en-US"));
}
