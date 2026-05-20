import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  isPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue
} from "./utils.js";

// Includes STSTAT and SREL because SE.promotion_claims[].source_record can cite them.
const STORY_LOCAL_ID = /^(?:STENT|STCHAR|STSTAT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STINT|STLOC|STOBJ|DA|SLT|CHC|BR|PG|STPLAN|STEMO)-\d+$/;
const PAGE_ID = /^PG-(0|[1-9][0-9]*)$/;
const NON_EDGE_FIELDS = new Set([
  "id",
  "story_id",
  "branch_id",
  "created_at_page",
  "branch_path",
  "visible_branch_path_prefix"
]);

export const recursiveReferenceClosure: Validator = {
  name: "recursive_reference_closure",
  severity_mode: "fail",
  applies_to: (ctx: Context) => ctx.patch_plan?.patches.some((patch) => patch.op === "create_pg_record") === true,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];

    for (const page of records.filter((record) => record.node_type === "page_record")) {
      const parsed = asPlainRecord(page.parsed);
      if (!isCreatedPageInPlan(parsed, ctx)) {
        continue;
      }

      const branchPath = stringArray(parsed.branch_path);
      const branchPathSet = new Set(branchPath);
      const maps = recordMapForStory(records, page.story_slug ?? null);
      const activeRecordIds = activeRecordSet(parsed);
      const visibleAffordanceOrdinals = visibleAffordanceOrdinalSet(parsed);
      const roots = pageClosureRoots(parsed);
      const visited = new Set<string>();
      const stack = roots.map((reference) => ({ ...reference, via: reference.path }));

      while (stack.length > 0) {
        const current = stack.pop();
        if (current === undefined) {
          continue;
        }

        const target = maps.byId.get(current.id);
        if (target === undefined) {
          if (maps.worldLevelIds.has(current.id)) {
            continue;
          }
          verdicts.push(missingReference(page, current));
          continue;
        }

        const parsedTarget = asPlainRecord(target.parsed);
        const createdAtPage = referenceBranchPageFor(target, parsedTarget);
        if (!isAllowedReference(target, parsedTarget, createdAtPage, branchPath, branchPathSet)) {
          verdicts.push(branchLeak(page, current, target, createdAtPage));
        }

        const visitKey = `${target.node_type}:${target.node_id}`;
        if (visited.has(visitKey)) {
          continue;
        }
        visited.add(visitKey);

        for (const nested of storyLocalReferences(parsedTarget, current.via)) {
          stack.push({
            id: nested.id,
            path: nested.path,
            via: nested.path
          });
        }
      }

      for (const choiceRef of stringArray(parsed.emitted_choices).map((id, index) => ({ id, index }))) {
        const choice = maps.byId.get(choiceRef.id);
        if (choice === undefined) {
          continue;
        }
        for (const verdict of choiceGroundingVerdicts(page, choice, choiceRef.index, activeRecordIds, visibleAffordanceOrdinals)) {
          verdicts.push(verdict);
        }
      }
    }

    return verdicts;
  }
};

interface StoryReference {
  id: string;
  path: string;
}

interface RecordMaps {
  byId: Map<string, IndexedRecord>;
  worldLevelIds: Set<string>;
}

function recordMapForStory(records: readonly IndexedRecord[], storySlug: string | null): RecordMaps {
  const byId = new Map<string, IndexedRecord>();
  const worldLevelIds = new Set<string>();

  for (const record of records) {
    const parsed = asPlainRecord(record.parsed);
    const id = stringValue(parsed.id);
    if ((record.story_slug ?? null) !== storySlug) {
      if ((record.story_slug ?? null) === null && id !== undefined) {
        worldLevelIds.add(id);
      }
      continue;
    }
    byId.set(record.node_id, record);
    if (id !== undefined) {
      byId.set(id, record);
    }
  }

  return { byId, worldLevelIds };
}

function isCreatedPageInPlan(page: Record<string, unknown>, ctx: Context): boolean {
  const pageIdValue = stringValue(page.id);
  if (pageIdValue === undefined) {
    return false;
  }
  return ctx.patch_plan?.patches.some((patch) => {
    if (patch.op !== "create_pg_record") {
      return false;
    }
    const payload = patch.payload as { record?: unknown };
    return stringValue(asPlainRecord(payload.record).id) === pageIdValue;
  }) === true;
}

function storyLocalReferences(value: unknown, basePath: string): StoryReference[] {
  const references: StoryReference[] = [];
  collectStoryLocalReferences(value, basePath, references);
  return references;
}

function pageClosureRoots(page: Record<string, unknown>): StoryReference[] {
  const input = asPlainRecord(page.input);
  return [
    ...storyLocalReferences(asPlainRecord(page.state_snapshot), "state_snapshot"),
    ...storyLocalReferences(input.choice_id, "input.choice_id"),
    ...storyLocalReferences(input.resolved_event_id, "input.resolved_event_id"),
    ...storyLocalReferences(page.applied_event_ops, "applied_event_ops"),
    ...storyLocalReferences(page.emitted_choices, "emitted_choices")
  ];
}

function activeRecordSet(page: Record<string, unknown>): Set<string> {
  const activeRecords = asPlainRecord(asPlainRecord(page.state_snapshot).active_records);
  const ids = new Set<string>();
  for (const value of Object.values(activeRecords)) {
    for (const id of stringArray(value)) {
      ids.add(id);
    }
  }
  return ids;
}

function visibleAffordanceOrdinalSet(page: Record<string, unknown>): Set<number> {
  const affordances = asPlainRecord(page.state_snapshot).visible_affordances;
  if (!Array.isArray(affordances)) {
    return new Set();
  }
  const ordinals = new Set<number>();
  for (const affordance of affordances) {
    const ordinal = asPlainRecord(affordance).ordinal;
    if (typeof ordinal === "number" && Number.isInteger(ordinal)) {
      ordinals.add(ordinal);
    }
  }
  return ordinals;
}

function choiceGroundingVerdicts(
  page: IndexedRecord,
  choice: IndexedRecord,
  choiceIndex: number,
  activeRecordIds: ReadonlySet<string>,
  visibleAffordanceOrdinals: ReadonlySet<number>
): Verdict[] {
  const choiceRecord = asPlainRecord(choice.parsed);
  const groundedIn = asPlainRecord(choiceRecord.grounded_in);
  const records = stringArray(groundedIn.records);
  const ordinals = Array.isArray(groundedIn.affordance_ordinals)
    ? groundedIn.affordance_ordinals.filter((value): value is number => typeof value === "number" && Number.isInteger(value))
    : [];
  const choicePath = `emitted_choices[${choiceIndex}].grounded_in`;
  const verdicts: Verdict[] = [];

  for (const [index, id] of records.entries()) {
    if (!activeRecordIds.has(id)) {
      verdicts.push(ungroundedRecord(page, choice, id, `${choicePath}.records[${index}]`));
    }
  }

  for (const [index, ordinal] of ordinals.entries()) {
    if (!visibleAffordanceOrdinals.has(ordinal)) {
      verdicts.push(ungroundedAffordanceOrdinal(page, choice, ordinal, `${choicePath}.affordance_ordinals[${index}]`));
    }
  }

  return verdicts;
}

function collectStoryLocalReferences(value: unknown, path: string, references: StoryReference[]): void {
  if (typeof value === "string") {
    if (STORY_LOCAL_ID.test(value)) {
      references.push({ id: value, path });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStoryLocalReferences(item, `${path}[${index}]`, references));
    return;
  }

  if (!isPlainRecord(value)) {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (NON_EDGE_FIELDS.has(key)) {
      continue;
    }
    // Structured SREL.direction.from/to are ordinary nested values and must remain closure roots.
    if (STORY_LOCAL_ID.test(key)) {
      references.push({ id: key, path: `${path}.${key}` });
    }
    collectStoryLocalReferences(nested, `${path}.${key}`, references);
  }
}

function createdAtPageFor(record: Record<string, unknown>): string | null | undefined {
  if ("created_at_page" in record) {
    const value = record.created_at_page;
    return value === null ? null : stringValue(value);
  }
  if ("generated_at_page" in record) {
    const value = record.generated_at_page;
    if (value === "story_bootstrap") {
      return null;
    }
    return value === null ? null : stringValue(value);
  }
  const provenance = asPlainRecord(record.provenance);
  if ("created_at_page" in provenance) {
    const value = provenance.created_at_page;
    return value === null ? null : stringValue(value);
  }
  return undefined;
}

function referenceBranchPageFor(target: IndexedRecord, record: Record<string, unknown>): string | null | undefined {
  const createdAtPage = createdAtPageFor(record);
  if (createdAtPage !== undefined) {
    return createdAtPage;
  }
  return undefined;
}

function isAllowedReference(
  target: IndexedRecord,
  parsed: Record<string, unknown>,
  createdAtPage: string | null | undefined,
  branchPath: readonly string[],
  branchPathSet: ReadonlySet<string>
): boolean {
  if (target.node_type === "page_record") {
    const pageIdValue = stringValue(parsed.id);
    return pageIdValue !== undefined && branchPathSet.has(pageIdValue);
  }
  if (createdAtPage === null) {
    if (target.node_type === "story_character_authority_record") {
      return true;
    }
    if (target.node_type !== "storylet_record") {
      return false;
    }
    // VALENH-012/014: SLT visibility and branch-prefix proof are schema-canonical under scope.
    const scope = asPlainRecord(parsed.scope);
    const visibility = stringValue(scope.visibility);
    if (visibility === "global_author_pool") {
      return true;
    }
    if (visibility === "branch_prefix_scoped") {
      return isVisibleBranchPathPrefix(scope.visible_branch_path_prefix, branchPath);
    }
    return false;
  }
  return createdAtPage !== undefined && branchPathSet.has(createdAtPage);
}

function isVisibleBranchPathPrefix(value: unknown, branchPath: readonly string[]): boolean {
  if (!Array.isArray(value) || value.length === 0 || value.length > branchPath.length) {
    return false;
  }
  return value.every((item, index) => typeof item === "string" && PAGE_ID.test(item) && item === branchPath[index]);
}

function missingReference(page: IndexedRecord, reference: StoryReference): Verdict {
  return {
    validator: "recursive_reference_closure",
    severity: "fail",
    code: "recursive_reference_closure.missing_record",
    message: `${pageId(page)} reaches missing story-local record ${reference.id} via ${reference.path}`,
    location: locationFor(page),
    detail: {
      reference_id: reference.id,
      reference_path: reference.path
    },
    suggested_fix: `Create ${reference.id} in the same story scope or remove the dangling reference from ${reference.path}.`
  };
}

function branchLeak(
  page: IndexedRecord,
  reference: StoryReference,
  target: IndexedRecord,
  createdAtPage: string | null | undefined
): Verdict {
  const isPageTarget = target.node_type === "page_record";
  const reportedCreatedAtPage = isPageTarget
    ? (stringValue(asPlainRecord(target.parsed).id) ?? createdAtPage)
    : createdAtPage;

  return {
    validator: "recursive_reference_closure",
    severity: "fail",
    code: "recursive_reference_closure.branch_leak",
    message: `${pageId(page)} reaches ${reference.id} via ${reference.path} whose created_at_page ${formatCreatedAtPage(reportedCreatedAtPage)} is outside this page's branch_path`,
    location: locationFor(page),
    detail: {
      reference_id: reference.id,
      reference_path: reference.path,
      referenced_file: target.file_path,
      referenced_node_id: target.node_id,
      created_at_page: reportedCreatedAtPage ?? null
    },
    suggested_fix: isPageTarget
      ? `Replace ${reference.id} with a page in this branch's branch_path.`
      : `Replace ${reference.id} with a record created on this branch, remove the sibling-branch dependency, or scope the storylet as a valid global author-pool record.`
  };
}

function ungroundedRecord(page: IndexedRecord, choice: IndexedRecord, referenceId: string, referencePath: string): Verdict {
  return {
    validator: "recursive_reference_closure",
    severity: "fail",
    code: "recursive_reference_closure.choice_grounding_missing_active_record",
    message: `${pageId(page)} emits ${choiceId(choice)} grounded in ${referenceId}, but that record is not active on the emitting page`,
    location: locationFor(choice),
    detail: {
      page_id: pageId(page),
      choice_id: choiceId(choice),
      reference_id: referenceId,
      reference_path: referencePath
    },
    suggested_fix: `Ground ${choiceId(choice)} in records present in ${pageId(page)}.state_snapshot.active_records or remove the stale grounding reference.`
  };
}

function ungroundedAffordanceOrdinal(page: IndexedRecord, choice: IndexedRecord, ordinal: number, referencePath: string): Verdict {
  return {
    validator: "recursive_reference_closure",
    severity: "fail",
    code: "recursive_reference_closure.choice_grounding_missing_affordance",
    message: `${pageId(page)} emits ${choiceId(choice)} grounded in affordance ordinal ${ordinal}, but that ordinal is not visible on the emitting page`,
    location: locationFor(choice),
    detail: {
      page_id: pageId(page),
      choice_id: choiceId(choice),
      affordance_ordinal: ordinal,
      reference_path: referencePath
    },
    suggested_fix: `Ground ${choiceId(choice)} in ordinals present in ${pageId(page)}.state_snapshot.visible_affordances or remove the stale affordance grounding reference.`
  };
}

function pageId(page: IndexedRecord): string {
  return stringValue(asPlainRecord(page.parsed).id) ?? page.node_id;
}

function choiceId(choice: IndexedRecord): string {
  return stringValue(asPlainRecord(choice.parsed).id) ?? choice.node_id;
}

function formatCreatedAtPage(value: string | null | undefined): string {
  if (value === null) {
    return "null";
  }
  return value ?? "<missing>";
}
