import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import {
  buildPreApplyFileInputs,
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
  ValidatorRun,
  Verdict,
  VerdictSeverity,
  WorldIndexReadSurface
} from "./types.js";

export type { PatchPlanEnvelope };

export async function validatePatchPlan(
  envelope: PatchPlanEnvelope
): Promise<{ verdicts: import("./types.js").Verdict[] }> {
  const db = openWorldIndex(envelope.target_world);
  try {
    const run = await runValidators(
      [...structuralValidators, ...ruleValidators],
      {
        world_slug: envelope.target_world,
        files: buildPreApplyFileInputs(db, envelope)
      },
      {
        run_mode: "pre-apply",
        world_slug: envelope.target_world,
        index: buildPreApplyReadSurface(db, envelope),
        touched_files: [],
        patch_plan: envelope
      }
    );
    return { verdicts: run.verdicts };
  } finally {
    db.close();
  }
}
