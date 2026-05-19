import type { Verdict } from "../framework/types.js";
import { defineStemoValidator, emotionField, fail, idsInValue, pageBranchPathFor, pageNumber } from "./stemo-utils.js";

const VALIDATOR = "stemo_no_future_page_ids";

export const stemoNoFuturePageIds = defineStemoValidator(VALIDATOR, (emotion, _ctx, maps): Verdict[] => {
  const createdAtPage = emotionField(emotion, "created_at_page");
  if (createdAtPage === undefined) {
    return [];
  }
  const branchPath = pageBranchPathFor(emotion, maps);
  const branchSet = new Set(branchPath);
  const createdPageNumber = pageNumber(createdAtPage);
  const verdicts: Verdict[] = [];
  for (const pageId of idsInValue(emotion.parsed).filter((id) => id.startsWith("PG-"))) {
    if (pageId === createdAtPage) {
      continue;
    }
    if (branchPath.length > 0 && !branchSet.has(pageId)) {
      verdicts.push(fail(emotion, VALIDATOR, "stemo_no_future_page_ids.not_on_branch_path", `page reference ${pageId} must be on the branch path for ${createdAtPage}.`));
      continue;
    }
    const referencedNumber = pageNumber(pageId);
    if (createdPageNumber !== null && referencedNumber !== null && referencedNumber > createdPageNumber) {
      verdicts.push(fail(emotion, VALIDATOR, "stemo_no_future_page_ids.future_page", `page reference ${pageId} is later than created_at_page ${createdAtPage}.`));
    }
  }
  return verdicts;
});
