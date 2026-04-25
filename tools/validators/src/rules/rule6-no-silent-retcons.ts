import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, nestedRecords, stringArray, stringValue } from "../structural/utils.js";
import {
  appliesToCanonFactsOrChangeLogs,
  fail,
  queryCanonFacts,
  queryChangeLogs,
  recordIdFrom
} from "./_shared/rule-utils.js";

const VALIDATOR = "rule6_no_silent_retcons";

export const rule6NoSilentRetcons: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToCanonFactsOrChangeLogs,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    if (ctx.run_mode === "pre-apply") {
      return validatePatchPlan(ctx);
    }
    return validateWorldState(ctx);
  }
};

async function validateWorldState(ctx: Context): Promise<Verdict[]> {
  const changeLogs = new Map((await queryChangeLogs(ctx)).map((record) => [changeIdFrom(record), record]));
  const verdicts: Verdict[] = [];

  for (const cf of await queryCanonFacts(ctx)) {
    const cfId = recordIdFrom(cf);
    for (const entry of nestedRecords(asPlainRecord(cf.parsed), "modification_history")) {
      const changeId = stringValue(entry.change_id);
      if (!changeId) {
        continue;
      }
      const ch = changeLogs.get(changeId);
      const affected = ch ? stringArray(asPlainRecord(ch.parsed).affected_fact_ids) : [];
      if (!ch || !affected.includes(cfId)) {
        verdicts.push(
          fail(
            VALIDATOR,
            "rule6.dangling_modification_history",
            `${cfId} modification_history references ${changeId}, but no CH record affects that CF`,
            cf
          )
        );
      }
    }
  }

  return verdicts;
}

async function validatePatchPlan(ctx: Context): Promise<Verdict[]> {
  const patches = patchList(ctx.patch_plan);
  const cfRecords = new Map((await queryCanonFacts(ctx)).map((record) => [record.node_id, record]));
  const verdicts: Verdict[] = [];

  for (const cfId of modifiedCfIds(patches)) {
    const chId = findChangeIdForCf(patches, cfId);
    if (!chId) {
      verdicts.push({
        validator: VALIDATOR,
        severity: "fail",
        code: "rule6.missing_ch_entry",
        message: `${cfId} is modified without a CH record whose affected_fact_ids includes that CF`,
        location: { file: cfRecords.get(cfId)?.file_path ?? cfId, node_id: cfId }
      });
      continue;
    }

    if (!hasModificationHistoryPatch(patches, cfId, chId)) {
      verdicts.push({
        validator: VALIDATOR,
        severity: "fail",
        code: "rule6.missing_modification_history_entry",
        message: `${cfId} is modified with ${chId}, but the patch plan does not append a matching modification_history entry`,
        location: { file: cfRecords.get(cfId)?.file_path ?? cfId, node_id: cfId }
      });
    }
  }

  return verdicts;
}

interface PatchInfo {
  op: string;
  target_record_id?: string;
  target_node_id?: string;
  payload: Record<string, unknown>;
}

function patchList(plan: unknown): PatchInfo[] {
  const patches = asPlainRecord(plan).patches;
  if (!Array.isArray(patches)) {
    return [];
  }
  return patches
    .filter((patch): patch is Record<string, unknown> => typeof patch === "object" && patch !== null && !Array.isArray(patch))
    .map((patch) => {
      const normalized: PatchInfo = {
        op: String(patch.op ?? ""),
        payload: asPlainRecord(patch.payload)
      };
      if (typeof patch.target_record_id === "string") {
        normalized.target_record_id = patch.target_record_id;
      }
      if (typeof patch.target_node_id === "string") {
        normalized.target_node_id = patch.target_node_id;
      }
      return normalized;
    });
}

function modifiedCfIds(patches: PatchInfo[]): string[] {
  const ids = new Set<string>();
  for (const patch of patches) {
    if (patch.op === "update_record_field" || patch.op === "append_extension") {
      const targetId =
        (typeof patch.payload.target_record_id === "string" ? patch.payload.target_record_id : undefined) ??
        patch.target_record_id ??
        patch.target_node_id;
      if (targetId?.startsWith("CF-")) {
        ids.add(targetId);
      }
    }
    if (patch.op === "append_modification_history_entry" && typeof patch.payload.target_cf_id === "string") {
      ids.add(patch.payload.target_cf_id);
    }
  }
  return [...ids].sort((left, right) => left.localeCompare(right));
}

function findChangeIdForCf(patches: PatchInfo[], cfId: string): string | undefined {
  for (const patch of patches) {
    if (patch.op !== "create_ch_record") {
      continue;
    }
    const ch = asPlainRecord(patch.payload.ch_record);
    if (stringArray(ch.affected_fact_ids).includes(cfId)) {
      return typeof ch.change_id === "string" ? ch.change_id : undefined;
    }
  }
  return undefined;
}

function hasModificationHistoryPatch(patches: PatchInfo[], cfId: string, changeId: string): boolean {
  return patches.some(
    (patch) =>
      patch.op === "append_modification_history_entry" &&
      patch.payload.target_cf_id === cfId &&
      patch.payload.change_id === changeId
  );
}

function changeIdFrom(record: IndexedRecord): string {
  const parsed = asPlainRecord(record.parsed);
  return typeof parsed.change_id === "string" ? parsed.change_id : record.node_id;
}
