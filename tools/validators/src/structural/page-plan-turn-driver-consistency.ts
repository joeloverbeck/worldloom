import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringValue,
  touchedFilesInclude
} from "./utils.js";
import { allStorySlugs, recordId, storyMaps } from "./stchar-utils.js";

const VALIDATOR = "page_plan_turn_driver_consistency";

export const pagePlanTurnDriverConsistency: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some(isStoryEventOrPagePatch)) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/_source\/(?:events\/SE-\d+|pages\/PG-\d+)\.yaml$/)),
  skip_reason: "turn-driver record consistency story surfaces only",
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const storySlug of allStorySlugs(records)) {
      const maps = storyMaps(records, storySlug);

      for (const page of maps.byType.get("page_record") ?? []) {
        verdicts.push(...validatePage(page, maps));
      }
    }

    return verdicts;
  }
};

function isStoryEventOrPagePatch(patch: { op: string }): boolean {
  return patch.op === "create_se_record" || patch.op === "create_pg_record";
}

function validatePage(
  page: IndexedRecord,
  maps: ReturnType<typeof storyMaps>
): Verdict[] {
  const input = asPlainRecord(asPlainRecord(page.parsed).input);
  const eventId = stringValue(input.resolved_event_id);
  if (eventId === undefined) {
    return [];
  }
  const event = maps.byId.get(eventId);
  if (event === undefined) {
    return [recordVerdict(
      page,
      "turn_driver_resolved_event_missing",
      `${recordId(page)} resolves ${eventId}, but no matching story event record exists.`,
      { page_id: recordId(page), event_id: eventId },
      `Create or correct the SE record referenced by ${recordId(page)}.input.resolved_event_id.`
    )];
  }
  const eventParsed = asPlainRecord(event?.parsed);
  if (event === undefined || stringValue(eventParsed.event_kind) !== "turn_resolution") {
    return [];
  }
  const turnDriver = asPlainRecord(eventParsed.turn_driver);
  if (Object.keys(turnDriver).length === 0) {
    return [];
  }

  const eventPageId = stringValue(eventParsed.created_at_page);
  if (eventPageId !== recordId(page)) {
    return [recordVerdict(
      page,
      "turn_driver_created_at_page_mismatch",
      `${recordId(page)} resolves ${recordId(event)}, but ${recordId(event)}.created_at_page is ${eventPageId ?? "<missing>"}.`,
      { page_id: recordId(page), event_id: recordId(event), event_created_at_page: eventPageId },
      `Set ${recordId(event)}.created_at_page to ${recordId(page)} or update ${recordId(page)}.input.resolved_event_id to the event created at this page.`
    )];
  }

  return [];
}

function recordVerdict(
  page: IndexedRecord,
  code: string,
  message: string,
  detail: unknown,
  suggested_fix: string
): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: { ...locationFor(page), node_id: recordId(page) },
    detail,
    suggested_fix
  };
}
