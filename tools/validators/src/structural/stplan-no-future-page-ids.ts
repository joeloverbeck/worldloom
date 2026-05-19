import type { Verdict } from "../framework/types.js";
import { defineStplanValidator, fail, idsInValue, pageBranchPathFor, pageNumber, planField } from "./stplan-utils.js";

const VALIDATOR = "stplan_no_future_page_ids";

export const stplanNoFuturePageIds = defineStplanValidator(VALIDATOR, (plan, _ctx, maps): Verdict[] => {
  const createdAtPage = planField(plan, "created_at_page");
  if (createdAtPage === undefined) {
    return [];
  }
  const branchPath = pageBranchPathFor(plan, maps);
  const branchSet = new Set(branchPath);
  const createdPageNumber = pageNumber(createdAtPage);
  const verdicts: Verdict[] = [];
  for (const pageId of idsInValue(plan.parsed).filter((id) => id.startsWith("PG-"))) {
    if (pageId === createdAtPage) {
      continue;
    }
    if (branchPath.length > 0 && !branchSet.has(pageId)) {
      verdicts.push(fail(plan, VALIDATOR, "stplan_no_future_page_ids.not_on_branch_path", `page reference ${pageId} must be on the branch path for ${createdAtPage}.`));
      continue;
    }
    const referencedNumber = pageNumber(pageId);
    if (createdPageNumber !== null && referencedNumber !== null && referencedNumber > createdPageNumber) {
      verdicts.push(fail(plan, VALIDATOR, "stplan_no_future_page_ids.future_page", `page reference ${pageId} is later than created_at_page ${createdAtPage}.`));
    }
  }
  return verdicts;
});
