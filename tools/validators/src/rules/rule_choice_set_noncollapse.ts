import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, fileInputsFrom, stringArray } from "../structural/utils.js";

const VALIDATOR = "choice_set_noncollapse";
const COLLAPSE_CODE = "choice_set_collapse";
const RHETORICAL_UNMARKED_CODE = "choice_set_rhetorical_unmarked";

interface PatchInfo {
  op: string;
}

interface ChoiceInfo {
  id: string;
  record: IndexedRecord;
  signature: string;
  rhetorical: boolean;
}

export const ruleChoiceSetNoncollapse: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    patchList(ctx.patch_plan).some((patch) => patch.op === "create_pg_record"),
  skip_reason: "create_pg_record-only",
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const storyScope = ctx.story_slug === undefined ? {} : { story_slug: ctx.story_slug };
    const pages = await ctx.index.query({
      record_type: "page_record",
      world_slug: ctx.world_slug,
      ...storyScope
    });
    const choices = await ctx.index.query({
      record_type: "choice_record",
      world_slug: ctx.world_slug,
      ...storyScope
    });
    const choicesByAuthoredId = new Map<string, IndexedRecord>();
    for (const choice of choices) {
      const authoredId = authoredRecordId(choice);
      if (authoredId) {
        choicesByAuthoredId.set(authoredId, choice);
      }
    }

    const planTexts = planTextsByPageId(input, ctx);
    const verdicts: Verdict[] = [];

    for (const page of pages) {
      const parsed = asPlainRecord(page.parsed);
      if (isTerminalPage(parsed)) {
        continue;
      }

      const emittedChoiceIds = stringArray(parsed.emitted_choices);
      if (emittedChoiceIds.length <= 1) {
        continue;
      }

      const pagePlanText = planTexts.get(authoredRecordId(page)) ?? "";
      const emittedChoices = emittedChoiceIds
        .map((id) => choiceInfo(id, choicesByAuthoredId.get(id), pagePlanText))
        .filter((choice): choice is ChoiceInfo => choice !== null);

      if (emittedChoices.length <= 1) {
        continue;
      }

      const signatures = new Set(emittedChoices.map((choice) => choice.signature));
      const rhetoricalCount = emittedChoices.filter((choice) => choice.rhetorical).length;
      const hasUnmarkedDuplicate = hasIdenticalUnmarkedPair(emittedChoices);

      if (signatures.size === 1 && rhetoricalCount < 2) {
        verdicts.push(collapseVerdict(page, emittedChoices));
      }
      if (hasUnmarkedDuplicate) {
        verdicts.push(rhetoricalUnmarkedVerdict(page, emittedChoices));
      }
    }

    return verdicts;
  }
};

function patchList(plan: unknown): PatchInfo[] {
  const patches = asPlainRecord(plan).patches;
  if (!Array.isArray(patches)) {
    return [];
  }
  return patches
    .filter((patch): patch is Record<string, unknown> => typeof patch === "object" && patch !== null && !Array.isArray(patch))
    .map((patch) => ({ op: String(patch.op ?? "") }));
}

function authoredRecordId(record: IndexedRecord): string {
  const parsedId = asPlainRecord(record.parsed).id;
  if (typeof parsedId === "string") {
    return parsedId;
  }
  const lastSegment = record.node_id.split(":").pop();
  return lastSegment ?? record.node_id;
}

function choiceInfo(id: string, record: IndexedRecord | undefined, pagePlanText: string): ChoiceInfo | null {
  if (!record) {
    return null;
  }
  return {
    id,
    record,
    signature: materialSignature(asPlainRecord(record.parsed)),
    rhetorical: isRhetoricallyMarked(id, pagePlanText)
  };
}

function materialSignature(choice: Record<string, unknown>): string {
  const groundedIn = asPlainRecord(choice.grounded_in);
  return stableStringify({
    target_or_action_families: sortedStrings(choice.target_or_action_families),
    grounded_in_records: sortedStrings(groundedIn.records),
    likely_state_pressure:
      typeof choice.likely_state_pressure === "string"
        ? choice.likely_state_pressure.trim()
        : ""
  });
}

function sortedStrings(value: unknown): string[] {
  return stringArray(value).slice().sort((left, right) => left.localeCompare(right, "en-US"));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort((left, right) => left.localeCompare(right, "en-US"))
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isTerminalPage(page: Record<string, unknown>): boolean {
  const stateSnapshot = asPlainRecord(page.state_snapshot);
  const continuation = asPlainRecord(stateSnapshot.continuation);
  return continuation.terminal_status === "terminal_closed";
}

function planTextsByPageId(input: unknown, ctx: Context): Map<string, string> {
  const byPage = new Map<string, string>();
  for (const file of fileInputsFrom(input, ctx)) {
    const match = /(?:^|\/)pages-prose-plans\/(PG-\d+)\.md$/.exec(file.path);
    if (match) {
      byPage.set(match[1]!, file.content);
    }
  }
  return byPage;
}

function isRhetoricallyMarked(choiceId: string, pagePlanText: string): boolean {
  if (!pagePlanText) {
    return false;
  }
  const choicePattern = new RegExp(`\\b${escapeRegExp(choiceId)}\\b`);
  return pagePlanText
    .split(/\r?\n/)
    .some((line) => choicePattern.test(line) && /\b(?:rhetorical|expressive)\b/i.test(line));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasIdenticalUnmarkedPair(choices: ChoiceInfo[]): boolean {
  for (let left = 0; left < choices.length; left += 1) {
    for (let right = left + 1; right < choices.length; right += 1) {
      const leftChoice = choices[left]!;
      const rightChoice = choices[right]!;
      if (
        leftChoice.signature === rightChoice.signature &&
        !leftChoice.rhetorical &&
        !rightChoice.rhetorical
      ) {
        return true;
      }
    }
  }
  return false;
}

function collapseVerdict(page: IndexedRecord, choices: ChoiceInfo[]): Verdict {
  const pageId = authoredRecordId(page);
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: COLLAPSE_CODE,
    message: `${pageId} emits ${choices.length} choices with no material difference across target_or_action_families, grounded_in.records, or likely_state_pressure.`,
    location: {
      file: page.file_path,
      node_id: page.node_id
    },
    detail: {
      page_id: pageId,
      choice_ids: choices.map((choice) => choice.id)
    },
    suggested_fix:
      "Differentiate at least two choices on a material axis, or explicitly mark the rhetorical variants in the page plan before validation."
  };
}

function rhetoricalUnmarkedVerdict(page: IndexedRecord, choices: ChoiceInfo[]): Verdict {
  const pageId = authoredRecordId(page);
  return {
    validator: VALIDATOR,
    severity: "warn",
    code: RHETORICAL_UNMARKED_CODE,
    message: `${pageId} has at least two emitted choices with identical material axes and no page-plan rhetorical or expressive mark.`,
    location: {
      file: page.file_path,
      node_id: page.node_id
    },
    detail: {
      page_id: pageId,
      duplicate_choice_ids: duplicateUnmarkedChoiceIds(choices)
    },
    suggested_fix:
      "If the duplicated choices are intentionally rhetorical, mark each rhetorical CHC in the page plan; otherwise make one material axis differ."
  };
}

function duplicateUnmarkedChoiceIds(choices: ChoiceInfo[]): string[] {
  const duplicateIds = new Set<string>();
  for (let left = 0; left < choices.length; left += 1) {
    for (let right = left + 1; right < choices.length; right += 1) {
      const leftChoice = choices[left]!;
      const rightChoice = choices[right]!;
      if (
        leftChoice.signature === rightChoice.signature &&
        !leftChoice.rhetorical &&
        !rightChoice.rhetorical
      ) {
        duplicateIds.add(leftChoice.id);
        duplicateIds.add(rightChoice.id);
      }
    }
  }
  return [...duplicateIds].sort((left, right) => left.localeCompare(right, "en-US"));
}
