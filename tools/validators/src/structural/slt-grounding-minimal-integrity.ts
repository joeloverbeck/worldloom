import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, touchedFilesInclude } from "./utils.js";
import { reasonContainsBannedPhrase } from "./slt-grounding-utils.js";

const VALIDATOR = "slt_grounding_minimal_integrity";
const COVERED_NODE_TYPES = new Set(["storylet_record"]);
const KNOWN_DRIVER_KINDS = new Set([
  "player_action",
  "player_write_in",
  "npc_action",
  "offstage_action",
  "world_pressure",
  "clock_fire",
  "secret_reveal",
  "multi_actor_collision"
]);

export const sltGroundingMinimalIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some((patch) => patch.op === "create_slt_record")) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/_source\/storylets\/SLT-\d+\.yaml$|(?:^|\/)_source\/storylets\/SLT-\d+\.yaml$/)),
  skip_reason: "SLT grounding records only",
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    return records.flatMap((record) => groundingVerdicts(record));
  }
};

function groundingVerdicts(record: IndexedRecord): Verdict[] {
  if (!COVERED_NODE_TYPES.has(record.node_type)) {
    return [];
  }

  const parsed = asPlainRecord(record.parsed);
  const grounding = parsed.grounding;
  if (!isObject(grounding)) {
    return [
      makeVerdict(
        record,
        "slt_grounding_missing",
        `${record.node_id} has no grounding object.`,
        { node_type: record.node_type },
        "Add grounding.compatible_turn_drivers[] and grounding.reason_to_exist to the SLT record."
      )
    ];
  }

  const verdicts: Verdict[] = [];
  const drivers = grounding.compatible_turn_drivers;
  if (!Array.isArray(drivers) || drivers.length === 0) {
    verdicts.push(
      makeVerdict(
        record,
        "slt_grounding_compatible_turn_drivers_empty",
        `${record.node_id} has no compatible turn drivers.`,
        { node_type: record.node_type },
        "Set grounding.compatible_turn_drivers to at least one SPEC-76 turn_driver.kind value."
      )
    );
  } else {
    for (const driver of drivers) {
      if (typeof driver !== "string" || !KNOWN_DRIVER_KINDS.has(driver)) {
        verdicts.push(
          makeVerdict(
            record,
            "slt_grounding_compatible_turn_drivers_unknown",
            `${record.node_id} has unknown compatible_turn_drivers value '${String(driver)}'.`,
            { driver, node_type: record.node_type },
            "Use one of the closed SPEC-76 turn_driver.kind values."
          )
        );
      }
    }
  }

  const reason = grounding.reason_to_exist;
  if (typeof reason !== "string" || reason.length < 16) {
    verdicts.push(
      makeVerdict(
        record,
        "slt_grounding_reason_too_short",
        `${record.node_id} grounding.reason_to_exist is shorter than 16 characters.`,
        { length: typeof reason === "string" ? reason.length : 0, node_type: record.node_type },
        "State the active or reusable pressure logic this SLT captures in at least 16 characters."
      )
    );
  } else {
    const bannedPhrase = reasonContainsBannedPhrase(reason);
    if (bannedPhrase !== null) {
      verdicts.push(
        makeVerdict(
          record,
          "slt_grounding_reason_generic",
          `${record.node_id} grounding.reason_to_exist uses generic phrase '${bannedPhrase}'.`,
          { phrase: bannedPhrase, node_type: record.node_type },
          "Replace generic narrative-shape phrasing with the causal pressure or reusable pressure class that makes this SLT eligible."
        )
      );
    }
  }

  const provenance = asPlainRecord(parsed.provenance);
  if (provenance.origin === "runtime_jit" && Array.isArray(drivers) && drivers.length > 1) {
    verdicts.push(
      makeVerdict(
        record,
        "slt_grounding_runtime_jit_driver_kind_singleton",
        `${record.node_id} is runtime_jit but declares ${drivers.length} compatible turn drivers.`,
        { count: drivers.length, node_type: record.node_type },
        "Runtime-jit SLTs must declare exactly one compatible driver kind matching the current turn driver."
      )
    );
  }

  return verdicts;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function makeVerdict(
  record: IndexedRecord,
  code: string,
  message: string,
  detail: Record<string, unknown>,
  suggestedFix: string
): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: locationFor(record),
    detail,
    suggested_fix: suggestedFix
  };
}
