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
  CANONICAL_SOURCES as SCENE_PLAN_VERBATIM_CANONICAL_SOURCES,
  stripFramingHeader as stripScenePlanVerbatimFramingHeader,
  trimTrailingWhitespace as trimScenePlanVerbatimTrailingWhitespace,
  type VerbatimSectionNumber as ScenePlanVerbatimSectionNumber
} from "../structural/scene-plan-verbatim-canonical-sources.js";

export async function validatePatchPlan(
  envelope: PatchPlanEnvelope,
  opts: {
    worldRoot?: string;
  } = {}
): Promise<{
  verdicts: import("./types.js").Verdict[];
  executions: import("./types.js").ValidatorExecution[];
}> {
  const db = openWorldIndex(envelope.target_world, opts.worldRoot);
  try {
    const preApplyFiles = buildPreApplyFileInputs(db, envelope);
    const run = await runValidators(
      [...structuralValidators, ...ruleValidators],
      {
        world_slug: envelope.target_world,
        files: preApplyFiles
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
