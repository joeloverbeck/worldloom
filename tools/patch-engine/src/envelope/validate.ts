import type { OperationKind, PatchPlanEnvelope } from "./schema.js";

const OPERATION_KINDS = new Set<OperationKind>([
  "create_cf_record",
  "create_ch_record",
  "create_inv_record",
  "create_m_record",
  "create_oq_record",
  "create_ent_record",
  "create_sec_record",
  "update_record_field",
  "append_extension",
  "append_touched_by_cf",
  "append_modification_history_entry",
  "append_adjudication_record",
  "append_character_record",
  "append_diegetic_artifact_record"
]);

export type EnvelopeValidationResult =
  | { ok: true; envelope: PatchPlanEnvelope }
  | { ok: false; errors: string[] };

export function validateEnvelopeShape(envelope: unknown): EnvelopeValidationResult {
  const errors: string[] = [];

  if (!isRecord(envelope)) {
    return { ok: false, errors: ["envelope must be an object"] };
  }

  requireString(envelope, "plan_id", errors);
  requireString(envelope, "target_world", errors);
  requireString(envelope, "approval_token", errors);
  requireString(envelope, "verdict", errors);
  requireString(envelope, "originating_skill", errors);

  if (!isRecord(envelope.expected_id_allocations)) {
    errors.push("expected_id_allocations must be an object");
  }

  if (!Array.isArray(envelope.patches)) {
    errors.push("patches must be an array");
  } else {
    validatePatches(envelope.patches, envelope.target_world, errors);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, envelope: envelope as unknown as PatchPlanEnvelope };
}

function validatePatches(patches: unknown[], targetWorld: unknown, errors: string[]): void {
  patches.forEach((patch, index) => {
    const prefix = `patches[${index}]`;

    if (!isRecord(patch)) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    if (typeof patch.op !== "string" || !OPERATION_KINDS.has(patch.op as OperationKind)) {
      errors.push(`${prefix}.op must be a supported operation kind`);
    }

    if (typeof patch.target_world !== "string") {
      errors.push(`${prefix}.target_world must be a string`);
    } else if (typeof targetWorld === "string" && patch.target_world !== targetWorld) {
      errors.push(`${prefix}.target_world must match envelope target_world`);
    }

    if (!isRecord(patch.payload)) {
      errors.push(`${prefix}.payload must be an object`);
    }

    if (
      patch.failure_mode !== undefined &&
      patch.failure_mode !== "strict" &&
      patch.failure_mode !== "relocate_on_miss"
    ) {
      errors.push(`${prefix}.failure_mode must be strict or relocate_on_miss`);
    }
  });
}

function requireString(record: Record<string, unknown>, key: string, errors: string[]): void {
  if (typeof record[key] !== "string") {
    errors.push(`${key} must be a string`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
