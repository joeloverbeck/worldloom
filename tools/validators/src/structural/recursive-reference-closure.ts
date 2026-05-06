import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  isPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringArray,
  stringValue
} from "./utils.js";

const STORY_LOCAL_ID = /^(?:STENT|SF|SE|OBL|CNSQ|THR|SREL|STINT|STLOC|STOBJ|DA|SLT|CHC|BR|PG)-\d+$/;
const NON_EDGE_FIELDS = new Set(["id", "story_id", "branch_id", "created_at_page", "branch_path"]);

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

      const branchPath = new Set(stringArray(parsed.branch_path));
      const maps = recordMapForStory(records, page.story_slug ?? null);
      const roots = storyLocalReferences(asPlainRecord(parsed.state_snapshot), "state_snapshot");
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
        if (!isAllowedReference(target, parsedTarget, createdAtPage, branchPath)) {
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
  if (target.node_type === "obligation_record") {
    return stringValue(record.introduced_at_page);
  }
  return undefined;
}

function isAllowedReference(
  target: IndexedRecord,
  parsed: Record<string, unknown>,
  createdAtPage: string | null | undefined,
  branchPath: ReadonlySet<string>
): boolean {
  if (target.node_type === "page_record") {
    const pageIdValue = stringValue(parsed.id);
    return pageIdValue !== undefined && branchPath.has(pageIdValue);
  }
  if (createdAtPage === null) {
    return target.node_type === "storylet_record" && asPlainRecord(parsed.visibility).scope === "global_author_pool";
  }
  return createdAtPage !== undefined && branchPath.has(createdAtPage);
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

function pageId(page: IndexedRecord): string {
  return stringValue(asPlainRecord(page.parsed).id) ?? page.node_id;
}

function formatCreatedAtPage(value: string | null | undefined): string {
  if (value === null) {
    return "null";
  }
  return value ?? "<missing>";
}
