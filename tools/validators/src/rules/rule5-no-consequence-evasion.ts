import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { FILE_CLASS_TO_SUBDIR, asPlainRecord, stringArray } from "../structural/utils.js";
import { queryCanonFacts } from "./_shared/rule-utils.js";

const VALIDATOR = "rule5_no_consequence_evasion";

export const rule5NoConsequenceEvasion: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) => ctx.run_mode === "pre-apply",
  skip_reason: "pre-apply-only",
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const patches = patchList(ctx.patch_plan);
    const cfById = new Map((await queryCanonFacts(ctx)).map((record) => [record.node_id, record]));
    const verdicts: Verdict[] = [];

    for (const patch of patches) {
      const cf = cfRecordForPatch(patch, cfById);
      if (!cf) {
        continue;
      }

      const requiredUpdates = cf.requiredUpdates;
      for (const fileClass of requiredUpdates) {
        if (!hasMatchingPatchForFileClass(patches, fileClass)) {
          verdicts.push({
            validator: VALIDATOR,
            severity: "fail",
            code: "rule5.required_update_not_patched",
            message: `${cf.id} requires ${fileClass}, but the patch plan has no matching SEC operation`,
            location: { file: patchTargetFile(patch, cf.id), node_id: cf.id }
          });
        }
      }
    }

    return verdicts;
  }
};

interface PatchInfo {
  op: string;
  target_file?: string;
  target_record_id?: string;
  target_node_id?: string;
  payload: Record<string, unknown>;
}

interface CfPatchInfo {
  id: string;
  requiredUpdates: string[];
}

function patchList(plan: unknown): PatchInfo[] {
  const record = asPlainRecord(plan);
  const patches = record.patches;
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
      if (typeof patch.target_file === "string") {
        normalized.target_file = patch.target_file;
      }
      if (typeof patch.target_record_id === "string") {
        normalized.target_record_id = patch.target_record_id;
      }
      if (typeof patch.target_node_id === "string") {
        normalized.target_node_id = patch.target_node_id;
      }
      return normalized;
    });
}

function cfRecordForPatch(patch: PatchInfo, cfById: Map<string, IndexedRecord>): CfPatchInfo | null {
  if (patch.op === "create_cf_record") {
    const cf = asPlainRecord(patch.payload.cf_record);
    const id = typeof cf.id === "string" ? cf.id : patch.target_record_id ?? patch.target_node_id;
    return id ? { id, requiredUpdates: stringArray(cf.required_world_updates) } : null;
  }

  if (patch.op !== "update_record_field") {
    return null;
  }

  const targetId = patch.payload.target_record_id;
  const id = typeof targetId === "string" ? targetId : patch.target_record_id ?? patch.target_node_id;
  if (!id?.startsWith("CF-")) {
    return null;
  }

  const fieldPath = stringArray(patch.payload.field_path);
  if (fieldPath[0] === "required_world_updates") {
    return { id, requiredUpdates: requiredUpdatesAfterPatch(patch) };
  }

  const current = cfById.get(id);
  return current ? { id, requiredUpdates: stringArray(asPlainRecord(current.parsed).required_world_updates) } : null;
}

function requiredUpdatesAfterPatch(patch: PatchInfo): string[] {
  const operation = patch.payload.operation;
  if (operation === "append_list") {
    return [String(patch.payload.new_value ?? "")].filter((value) => value.length > 0);
  }
  return stringArray(patch.payload.new_value);
}

function hasMatchingPatchForFileClass(patches: PatchInfo[], fileClass: string): boolean {
  const subdir = FILE_CLASS_TO_SUBDIR[fileClass];
  if (subdir === undefined || subdir.length === 0) {
    return false;
  }

  return patches.some((patch) => {
    if (patch.op === "create_sec_record") {
      return asPlainRecord(patch.payload.sec_record).file_class === fileClass;
    }

    if (patch.op !== "update_record_field") {
      return false;
    }

    const targetId = typeof patch.payload.target_record_id === "string" ? patch.payload.target_record_id : patch.target_record_id ?? patch.target_node_id;
    return typeof targetId === "string" && sectionIdMatchesFileClass(targetId, fileClass);
  });
}

function sectionIdMatchesFileClass(recordId: string, fileClass: string): boolean {
  const prefixes: Readonly<Record<string, string>> = {
    EVERYDAY_LIFE: "SEC-ELF-",
    INSTITUTIONS: "SEC-INS-",
    MAGIC_OR_TECH_SYSTEMS: "SEC-MTS-",
    GEOGRAPHY: "SEC-GEO-",
    ECONOMY_AND_RESOURCES: "SEC-ECR-",
    PEOPLES_AND_SPECIES: "SEC-PAS-",
    TIMELINE: "SEC-TML-"
  };
  return recordId.startsWith(prefixes[fileClass] ?? "\u0000");
}

function patchTargetFile(patch: PatchInfo, fallbackId: string): string {
  return patch.target_file ?? patch.target_record_id ?? patch.target_node_id ?? fallbackId;
}
