import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue
} from "./utils.js";

const ACTION_FAMILIES = new Set([
  "move",
  "evade",
  "pursue",
  "perceive",
  "investigate",
  "communicate",
  "persuade",
  "negotiate",
  "bond",
  "oppose",
  "harm",
  "protect",
  "control",
  "transfer",
  "use",
  "make_change",
  "ritual_protocol",
  "recover",
  "wait",
  "decide"
]);

export const pgAffordanceIntegrity: Validator = {
  name: "pg_affordance_integrity",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_pg_record") === true,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const page of records.filter((record) => record.node_type === "page_record")) {
      const parsed = asPlainRecord(page.parsed);
      if (ctx.run_mode === "pre-apply" && !isCreatedPageInPlan(parsed, ctx)) {
        continue;
      }
      verdicts.push(...validatePageAffordances(page, parsed));
    }

    return verdicts;
  }
};

function validatePageAffordances(page: IndexedRecord, parsed: Record<string, unknown>): Verdict[] {
  const pageLabel = stringValue(parsed.id) ?? page.node_id;
  const snapshot = asPlainRecord(parsed.state_snapshot);
  const activeRecords = asPlainRecord(snapshot.active_records);
  const activeGroundingIds = new Set([
    ...stringArray(activeRecords.STLOC),
    ...stringArray(activeRecords.STOBJ)
  ]);
  const activeEntityIds = new Set(stringArray(activeRecords.STENT));
  const affordances = Array.isArray(snapshot.visible_affordances) ? snapshot.visible_affordances : [];
  const seenOrdinals = new Set<number>();
  const verdicts: Verdict[] = [];

  for (const [index, rawAffordance] of affordances.entries()) {
    const affordance = asPlainRecord(rawAffordance);
    const ordinal = affordance.ordinal;

    if (typeof ordinal === "number" && Number.isInteger(ordinal)) {
      if (seenOrdinals.has(ordinal)) {
        verdicts.push(duplicateOrdinal(page, pageLabel, ordinal, index));
      }
      seenOrdinals.add(ordinal);
    }

    for (const id of stringArray(affordance.grounded_in)) {
      if (!activeGroundingIds.has(id)) {
        verdicts.push(inactiveGrounding(page, pageLabel, id, index));
      }
    }

    for (const id of stringArray(affordance.available_to)) {
      if (!activeEntityIds.has(id)) {
        verdicts.push(inactiveAvailableTo(page, pageLabel, id, index));
      }
    }

    for (const family of stringArray(affordance.action_families)) {
      if (!ACTION_FAMILIES.has(family)) {
        verdicts.push(unknownActionFamily(page, pageLabel, family, index));
      }
    }
  }

  return verdicts;
}

function isCreatedPageInPlan(page: Record<string, unknown>, ctx: Context): boolean {
  const pageId = stringValue(page.id);
  if (pageId === undefined) {
    return false;
  }
  return ctx.patch_plan?.patches.some((patch) => {
    if (patch.op !== "create_pg_record") {
      return false;
    }
    const payload = patch.payload as { record?: unknown };
    return stringValue(asPlainRecord(payload.record).id) === pageId;
  }) === true;
}

function duplicateOrdinal(page: IndexedRecord, pageId: string, ordinal: number, index: number): Verdict {
  return {
    validator: "pg_affordance_integrity",
    severity: "fail",
    code: "page_affordance_duplicate_ordinal",
    message: `${pageId} state_snapshot.visible_affordances[${index}] repeats ordinal ${ordinal}.`,
    location: locationFor(page),
    detail: { page_id: pageId, ordinal, affordance_index: index },
    suggested_fix: "Assign a unique ordinal to each visible affordance in the page snapshot."
  };
}

function inactiveGrounding(page: IndexedRecord, pageId: string, id: string, index: number): Verdict {
  return {
    validator: "pg_affordance_integrity",
    severity: "fail",
    code: "page_affordance_inactive_grounding",
    message: `${pageId} visible_affordances[${index}].grounded_in references ${id}, but it is not active in state_snapshot.active_records.STLOC or STOBJ.`,
    location: locationFor(page),
    detail: { page_id: pageId, reference_id: id, affordance_index: index, field: "grounded_in" },
    suggested_fix: `Add ${id} to the page's active STLOC/STOBJ records, ground the affordance in an active record, or remove the stale grounding.`
  };
}

function inactiveAvailableTo(page: IndexedRecord, pageId: string, id: string, index: number): Verdict {
  return {
    validator: "pg_affordance_integrity",
    severity: "fail",
    code: "page_affordance_inactive_available_to",
    message: `${pageId} visible_affordances[${index}].available_to references ${id}, but it is not active in state_snapshot.active_records.STENT.`,
    location: locationFor(page),
    detail: { page_id: pageId, reference_id: id, affordance_index: index, field: "available_to" },
    suggested_fix: `Add ${id} to the page's active STENT records, limit the affordance to an active entity, or remove the stale available_to reference.`
  };
}

function unknownActionFamily(page: IndexedRecord, pageId: string, family: string, index: number): Verdict {
  return {
    validator: "pg_affordance_integrity",
    severity: "fail",
    code: "page_affordance_unknown_action_family",
    message: `${pageId} visible_affordances[${index}].action_families includes ${family}, which is not in the PageAffordance action-family enum.`,
    location: locationFor(page),
    detail: { page_id: pageId, action_family: family, affordance_index: index },
    suggested_fix: "Use one of the PageAffordance action-family enum values from story-page.schema.json."
  };
}
