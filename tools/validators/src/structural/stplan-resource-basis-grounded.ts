import type { Verdict } from "../framework/types.js";
import { defineStplanValidator, fail, isActiveAtPlanPage, isRecordAccessibleToHolder, planField, planStringArray, resolveRecord, resourceBasisIds } from "./stplan-utils.js";

const VALIDATOR = "stplan_resource_basis_grounded";

export const stplanResourceBasisGrounded = defineStplanValidator(VALIDATOR, (plan, _ctx, maps): Verdict[] => {
  const holder = planField(plan, "holder");
  const blockers = new Set(planStringArray(plan, "blockers"));
  const verdicts: Verdict[] = [];
  for (const { field, id } of resourceBasisIds(plan)) {
    const resource = resolveRecord(plan, id, maps);
    if (resource === undefined) {
      verdicts.push(fail(plan, VALIDATOR, "stplan_resource_basis_grounded.missing_resource", `${field} entry ${id} must resolve to a record.`));
      continue;
    }
    if (!isActiveAtPlanPage(plan, id, maps) && !blockers.has(id)) {
      verdicts.push(fail(plan, VALIDATOR, "stplan_resource_basis_grounded.inactive_resource", `${field} entry ${id} must be active at created_at_page or listed in blockers.`));
    }
    if (holder !== undefined && !blockers.has(id) && !isRecordAccessibleToHolder(resource, holder)) {
      verdicts.push(fail(plan, VALIDATOR, "stplan_resource_basis_grounded.inaccessible_resource", `${field} entry ${id} must be accessible to holder ${holder} or listed in blockers.`));
    }
  }
  return verdicts;
});
