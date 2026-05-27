import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import {
  buildPreApplyFileInputs,
  buildPreApplyExistingFilePaths,
  buildPreApplyReadSurface,
  openWorldIndex
} from "../_helpers/index-access.js";
import { runValidators } from "../framework/run.js";
import { ruleValidators, structuralValidators } from "./registry.js";

export type {
  Context,
  IndexedRecord,
  IndexedRecordValue,
  RunMode,
  Validator,
  ValidatorExecution,
  ValidatorRun,
  Verdict,
  VerdictSeverity,
  WorldIndexReadSurface
} from "./types.js";

export type { PatchPlanEnvelope };

export {
  EPISTEMIC_PROFILE_REQUIRED_TYPES,
  EXCEPTION_GOVERNANCE_REQUIRED_TYPES
} from "../structural/record-schema-compliance.js";

export {
  CANONICAL_SOURCES as PAGE_PLAN_VERBATIM_CANONICAL_SOURCES,
  stripFramingHeader as stripPagePlanVerbatimFramingHeader,
  trimTrailingWhitespace as trimPagePlanVerbatimTrailingWhitespace,
  type VerbatimSectionNumber as PagePlanVerbatimSectionNumber
} from "../structural/page-plan-verbatim-canonical-sources.js";

export async function validatePatchPlan(
  envelope: PatchPlanEnvelope,
  opts: {
    worldRoot?: string;
    pagePlanDrafts?: ReadonlyArray<{ path: string; content: string }>;
  } = {}
): Promise<{
  verdicts: import("./types.js").Verdict[];
  executions: import("./types.js").ValidatorExecution[];
}> {
  const db = openWorldIndex(envelope.target_world, opts.worldRoot);
  try {
    const preApplyFiles = buildPreApplyFileInputs(db, envelope);
    const drafts = (opts.pagePlanDrafts ?? []).map((draft) => ({ path: draft.path, content: draft.content }));
    const draftPaths = new Set(drafts.map((draft) => draft.path));
    const mergedFiles = [
      ...preApplyFiles.filter((file) => !draftPaths.has(file.path)),
      ...drafts
    ];
    const run = await runValidators(
      [...structuralValidators, ...ruleValidators],
      {
        world_slug: envelope.target_world,
        files: mergedFiles
      },
      {
        run_mode: "pre-apply",
        world_slug: envelope.target_world,
        index: buildPreApplyReadSurface(db, envelope),
        touched_files: [],
        patch_plan: envelope,
        pre_apply_existing_files: buildPreApplyExistingFilePaths(db, envelope)
      }
    );
    return { verdicts: run.verdicts, executions: run.summary.executions };
  } finally {
    db.close();
  }
}
