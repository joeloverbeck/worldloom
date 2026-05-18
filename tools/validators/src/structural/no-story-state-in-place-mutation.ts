import { createHash } from "node:crypto";

import type { PatchOperation } from "@worldloom/patch-engine";

import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, toPosixPath } from "./utils.js";

const STORY_CREATE_OPS: Readonly<Record<string, { sourceDir: string; prefix: string }>> = {
  create_stent_record: { sourceDir: "entities", prefix: "STENT" },
  create_ststat_record: { sourceDir: "status", prefix: "STSTAT" },
  create_sf_record: { sourceDir: "facts", prefix: "SF" },
  create_se_record: { sourceDir: "events", prefix: "SE" },
  create_obl_record: { sourceDir: "obligations", prefix: "OBL" },
  create_cnsq_record: { sourceDir: "consequences", prefix: "CNSQ" },
  create_thr_record: { sourceDir: "threads", prefix: "THR" },
  create_srel_record: { sourceDir: "relationships", prefix: "SREL" },
  create_stint_record: { sourceDir: "intentions", prefix: "STINT" },
  create_stloc_record: { sourceDir: "locations", prefix: "STLOC" },
  create_stobj_record: { sourceDir: "objects", prefix: "STOBJ" },
  create_br_record: { sourceDir: "branches", prefix: "BR" },
  create_pg_record: { sourceDir: "pages", prefix: "PG" },
  create_chc_record: { sourceDir: "choices", prefix: "CHC" },
  create_slt_record: { sourceDir: "storylets", prefix: "SLT" },
  create_bel_record: { sourceDir: "beliefs", prefix: "BEL" },
  create_clk_record: { sourceDir: "clocks", prefix: "CLK" },
  supersede_clk_record: { sourceDir: "clocks", prefix: "CLK" },
  create_stsec_record: { sourceDir: "secrets", prefix: "STSEC" },
  supersede_stsec_record: { sourceDir: "secrets", prefix: "STSEC" },
  create_stq_record: { sourceDir: "story-questions", prefix: "STQ" },
  supersede_stq_record: { sourceDir: "story-questions", prefix: "STQ" },
  append_story_diegetic_artifact_record: { sourceDir: "artifacts", prefix: "DA" }
};

interface StoryWrite {
  op: string;
  storySlug: string;
  recordId: string;
  filePath: string;
  contentHash: string;
}

export const noStoryStateInPlaceMutation: Validator = {
  name: "no_story_state_in_place_mutation",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "pre-apply" &&
    ctx.patch_plan?.patches.some((patch) => storyWriteForPatch(patch) !== null) === true,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    if (!ctx.patch_plan) {
      return [];
    }

    const existingFiles = new Set((ctx.pre_apply_existing_files ?? []).map(toPosixPath));
    const seenByRecordKey = new Map<string, StoryWrite>();
    const verdicts: Verdict[] = [];

    for (const patch of ctx.patch_plan.patches) {
      const write = storyWriteForPatch(patch);
      if (write === null) {
        continue;
      }

      if (existingFiles.has(write.filePath)) {
        verdicts.push(existingFileVerdict(write));
      }

      const recordKey = `${write.storySlug}:${write.recordId}`;
      const previous = seenByRecordKey.get(recordKey);
      if (previous !== undefined && previous.contentHash !== write.contentHash) {
        verdicts.push(intraPlanCollisionVerdict(previous, write));
      }
      seenByRecordKey.set(recordKey, write);
    }

    return verdicts;
  }
};

function storyWriteForPatch(patch: PatchOperation): StoryWrite | null {
  const spec = STORY_CREATE_OPS[patch.op];
  if (spec === undefined) {
    return null;
  }

  const payload = patch.payload as { story_slug?: unknown; record?: unknown };
  const storySlug = typeof payload.story_slug === "string" ? payload.story_slug : "";
  const record = asPlainRecord(payload.record);
  const recordId = typeof record.id === "string" ? record.id : "";
  if (storySlug.length === 0 || recordId.length === 0) {
    return null;
  }

  return {
    op: patch.op,
    storySlug,
    recordId,
    filePath: targetFileFor(patch, storySlug, spec.sourceDir, recordId),
    contentHash: stableHash(record)
  };
}

function targetFileFor(patch: PatchOperation, storySlug: string, sourceDir: string, recordId: string): string {
  const targetFile = typeof patch.target_file === "string" ? patch.target_file : "";
  if (targetFile.length > 0) {
    return toPosixPath(targetFile);
  }
  return `stories/${storySlug}/_source/${sourceDir}/${recordId}.yaml`;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right, "en-US")
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function existingFileVerdict(write: StoryWrite): Verdict {
  return {
    validator: "no_story_state_in_place_mutation",
    severity: "fail",
    code: "story_state_in_place_mutation",
    message: `${write.op} targets existing story-state record ${write.recordId} at ${write.filePath}; story-state records are append-only.`,
    location: { file: write.filePath, node_id: write.recordId },
    detail: { op: write.op, story_slug: write.storySlug, record_id: write.recordId },
    suggested_fix: "Create a new story-state record with supersedes pointing at the prior record."
  };
}

function intraPlanCollisionVerdict(previous: StoryWrite, current: StoryWrite): Verdict {
  return {
    validator: "no_story_state_in_place_mutation",
    severity: "fail",
    code: "story_state_in_place_mutation",
    message: `${current.recordId} is staged more than once in the same patch plan with different content; story-state records are append-only.`,
    location: { file: current.filePath, node_id: current.recordId },
    detail: {
      story_slug: current.storySlug,
      record_id: current.recordId,
      first_target: previous.filePath,
      second_target: current.filePath
    },
    suggested_fix: "Allocate one fresh record id per staged story-state record."
  };
}
