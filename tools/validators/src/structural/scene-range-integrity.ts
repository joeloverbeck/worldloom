import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryRecordsByType, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "scene_range_integrity";

export const sceneRangeIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_scn_record" || patch.op === "supersede_scn_record") === true ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/_source\/scenes\/SCN-\d+\.yaml$/)),
  skip_reason: "SCN range surfaces only",
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const [scenes, pages] = await Promise.all([
      queryRecordsByType(ctx, "scene_record"),
      queryRecordsByType(ctx, "page_record")
    ]);
    const pagesByStoryAndId = pageMap(pages);
    return scenes.flatMap((scene) => validateScene(scene, pagesByStoryAndId));
  }
};

function validateScene(scene: IndexedRecord, pagesByStoryAndId: Map<string, IndexedRecord>): Verdict[] {
  const parsed = asPlainRecord(scene.parsed);
  const sceneId = stringValue(parsed.id) ?? scene.node_id;
  const storySlug = scene.story_slug ?? storySlugFromPath(scene.file_path);
  const pgIds = stringArray(parsed.pg_ids);
  const startPageId = stringValue(parsed.start_page_id);
  const endPageId = stringValue(parsed.end_page_id);
  const branchId = stringValue(parsed.branch_id);
  const choiceSurfacePageId = stringValue(parsed.choice_surface_page_id);
  const emittedChoiceIds = stringArray(parsed.emitted_choice_ids);
  const verdicts: Verdict[] = [];

  if (pgIds.length === 0) {
    verdicts.push(sceneVerdict(scene, sceneId, "empty_range", `${sceneId} has no pg_ids; a scene must cover at least one PG.`, { pg_ids: pgIds }));
    return verdicts;
  }
  if (startPageId !== pgIds[0]) {
    verdicts.push(sceneVerdict(scene, sceneId, "start_mismatch", `${sceneId} start_page_id must equal the first pg_ids entry.`, { start_page_id: startPageId, first_pg_id: pgIds[0] }));
  }
  if (endPageId !== pgIds[pgIds.length - 1]) {
    verdicts.push(sceneVerdict(scene, sceneId, "end_mismatch", `${sceneId} end_page_id must equal the last pg_ids entry.`, { end_page_id: endPageId, last_pg_id: pgIds[pgIds.length - 1] }));
  }
  if (choiceSurfacePageId !== endPageId) {
    verdicts.push(sceneVerdict(scene, sceneId, "choice_surface_not_end_page", `${sceneId} choice_surface_page_id must be the end PG.`, { choice_surface_page_id: choiceSurfacePageId, end_page_id: endPageId }));
  }

  const pageRecords = pgIds.map((pgId) => pagesByStoryAndId.get(`${storySlug}:${pgId}`));
  const missing = pgIds.filter((_pgId, index) => pageRecords[index] === undefined);
  if (missing.length > 0) {
    verdicts.push(sceneVerdict(scene, sceneId, "missing_page", `${sceneId} references PGs that do not resolve in story ${storySlug}: ${missing.join(", ")}.`, { missing_pg_ids: missing }));
    return verdicts;
  }

  const parsedPages = pageRecords.map((page) => asPlainRecord(page?.parsed));
  const branchIds = [...new Set(parsedPages.map((page) => stringValue(page.branch_id)).filter((id): id is string => id !== undefined))];
  if (branchId !== undefined && branchIds.some((id) => id !== branchId)) {
    verdicts.push(sceneVerdict(scene, sceneId, "cross_branch", `${sceneId} includes PGs outside its branch_id ${branchId}.`, { scene_branch_id: branchId, page_branch_ids: branchIds }));
  }
  if (branchIds.length > 1) {
    verdicts.push(sceneVerdict(scene, sceneId, "single_branch", `${sceneId} includes PGs from multiple branches: ${branchIds.join(", ")}.`, { page_branch_ids: branchIds }));
  }

  const endPage = parsedPages[parsedPages.length - 1];
  if (endPage === undefined) {
    return verdicts;
  }
  const endBranchPath = stringArray(endPage.branch_path);
  const startIndex = endBranchPath.indexOf(pgIds[0] ?? "");
  const expected = startIndex >= 0 ? endBranchPath.slice(startIndex, startIndex + pgIds.length) : [];
  if (expected.length !== pgIds.length || !sameStringArray(expected, pgIds)) {
    verdicts.push(sceneVerdict(scene, sceneId, "non_contiguous", `${sceneId} pg_ids must be an ordered contiguous slice of the end PG branch_path.`, { pg_ids: pgIds, end_page_branch_path: endBranchPath }));
  }

  parsedPages.forEach((page, index) => {
    const pgId = pgIds[index];
    const branchPath = stringArray(page.branch_path);
    if (branchPath[branchPath.length - 1] !== pgId) {
      verdicts.push(sceneVerdict(scene, sceneId, "page_branch_path_mismatch", `${pgId} branch_path must end with its own page id.`, { pg_id: pgId, branch_path: branchPath }));
    }
    if (!isPrefix(branchPath, endBranchPath)) {
      verdicts.push(sceneVerdict(scene, sceneId, "sibling_in_range", `${sceneId} includes ${pgId}, which is not on the end PG branch path.`, { pg_id: pgId, pg_branch_path: branchPath, end_page_branch_path: endBranchPath }));
    }
  });

  const endChoices = stringArray(endPage.emitted_choices);
  if (!sameStringArray(emittedChoiceIds, endChoices)) {
    verdicts.push(sceneVerdict(scene, sceneId, "choice_surface_mismatch", `${sceneId} emitted_choice_ids must match the end PG emitted_choices.`, { emitted_choice_ids: emittedChoiceIds, end_page_emitted_choices: endChoices }));
  }

  return verdicts;
}

function pageMap(pages: IndexedRecord[]): Map<string, IndexedRecord> {
  const map = new Map<string, IndexedRecord>();
  for (const page of pages) {
    const parsed = asPlainRecord(page.parsed);
    const id = stringValue(parsed.id) ?? page.node_id.split(":").at(-1) ?? page.node_id;
    const storySlug = page.story_slug ?? storySlugFromPath(page.file_path);
    map.set(`${storySlug}:${id}`, page);
  }
  return map;
}

function storySlugFromPath(filePath: string): string {
  return filePath.match(/^stories\/([^/]+)\//)?.[1] ?? "";
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isPrefix(prefix: readonly string[], full: readonly string[]): boolean {
  return prefix.length <= full.length && prefix.every((value, index) => value === full[index]);
}

function sceneVerdict(
  scene: IndexedRecord,
  sceneId: string,
  code: string,
  message: string,
  detail: Record<string, unknown>
): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: `${VALIDATOR}.${code}`,
    message,
    location: locationFor(scene),
    detail: {
      scene_id: sceneId,
      ...detail
    }
  };
}
