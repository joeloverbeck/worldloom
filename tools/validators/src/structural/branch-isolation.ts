import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  branchPath,
  isBranchLocal,
  isBundleGenesisRecord,
  owningBranchId,
  rootPageIdsForStory,
  type BranchRecordMaps
} from "./branch-locality-utils.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringValue,
  touchedFilesInclude
} from "./utils.js";

const STORY_LOCAL_ID = /^(?:STENT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STINT|STLOC|STOBJ|DA|STSTAT|CLK|STSEC|STQ|SLT|CHC|BR|PG)-\d+$/;
const WORLD_SCOPE_ID = /^(?:CF|CHAR|ENT)-\d+$/;
const STATIC_RECORD_ID = /^(?:STENT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STINT|STLOC|STOBJ|DA|STSTAT|CLK|STSEC|STQ|SLT|CHC|BR|PG|CF|CHAR|ENT)-\d+$/;

export const branchIsolation: Validator = {
  name: "branch_isolation",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_pg_record" || patch.op === "create_slt_record") === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/(?:pages|storylets)\/(?:PG|SLT)-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];
    const storySlugs = new Set(records.map((record) => record.story_slug).filter((slug): slug is string => typeof slug === "string"));

    for (const storySlug of storySlugs) {
      const maps = recordMapsForStory(records, storySlug);
      const rootPageIds = rootPageIdsForStory(maps);

      for (const page of maps.byType.get("page_record") ?? []) {
        const parsed = asPlainRecord(page.parsed);
        const pageBranchId = stringValue(parsed.branch_id);
        if (pageBranchId === undefined) {
          continue;
        }
        const pageBranchPath = branchPath(pageBranchId, maps);
        if (pageBranchPath.size === 0) {
          continue;
        }

        for (const reference of activeRecordReferences(parsed)) {
          const target = maps.byId.get(reference.id);
          if (target === undefined) {
            continue;
          }
          const targetBranchId = owningBranchId(target, maps);
          if (targetBranchId === undefined) {
            continue;
          }
          if (isBranchLocal(reference.id, { branchId: pageBranchId, maps, rootPageIds })) {
            continue;
          }
          verdicts.push(branchIsolationViolation(page, parsed, reference, targetBranchId));
        }
      }

      for (const storylet of maps.byType.get("storylet_record") ?? []) {
        const parsed = asPlainRecord(storylet.parsed);
        const scope = asPlainRecord(parsed.scope);
        if (stringValue(scope.visibility) !== "global_author_pool") {
          continue;
        }

        for (const reference of globalStoryletStaticReferences(parsed)) {
          if (WORLD_SCOPE_ID.test(reference.id)) {
            continue;
          }
          const target = maps.byId.get(reference.id);
          if (target !== undefined && isBundleGenesisRecord(target, rootPageIds)) {
            continue;
          }
          if (target !== undefined && STORY_LOCAL_ID.test(reference.id)) {
            verdicts.push(globalStoryletReferencesBranchLocal(storylet, parsed, reference, owningBranchId(target, maps)));
          }
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

interface RecordMaps extends BranchRecordMaps {
  byId: Map<string, IndexedRecord>;
  byType: Map<string, IndexedRecord[]>;
}

function recordMapsForStory(records: readonly IndexedRecord[], storySlug: string): RecordMaps {
  const byId = new Map<string, IndexedRecord>();
  const byType = new Map<string, IndexedRecord[]>();

  for (const record of records) {
    if (record.story_slug !== storySlug) {
      continue;
    }
    const parsed = asPlainRecord(record.parsed);
    const id = stringValue(parsed.id);
    byId.set(record.node_id, record);
    if (id !== undefined) {
      byId.set(id, record);
    }
    const typed = byType.get(record.node_type) ?? [];
    typed.push(record);
    byType.set(record.node_type, typed);
  }

  return { byId, byType };
}

function activeRecordReferences(page: Record<string, unknown>): StoryReference[] {
  const activeRecords = asPlainRecord(asPlainRecord(page.state_snapshot).active_records);
  const references: StoryReference[] = [];

  for (const [recordClass, ids] of Object.entries(activeRecords)) {
    if (!Array.isArray(ids)) {
      continue;
    }
    ids.forEach((id, index) => {
      if (typeof id === "string" && STORY_LOCAL_ID.test(id)) {
        references.push({ id, path: `state_snapshot.active_records.${recordClass}[${index}]` });
      }
    });
  }

  return references;
}

function globalStoryletStaticReferences(storylet: Record<string, unknown>): StoryReference[] {
  const references: StoryReference[] = [];
  const preconditions = asPlainRecord(storylet.preconditions);
  collectStaticRecordReferences(preconditions.hard, "preconditions.hard", references);
  collectStaticRecordReferences(preconditions.soft, "preconditions.soft", references);

  const effects = asPlainRecord(storylet.effects);
  collectStaticRecordReferences(effects.create, "effects.create", references);
  collectStaticRecordReferences(effects.supersede, "effects.supersede", references);
  collectStaticRecordReferences(effects.close, "effects.close", references);

  const exitOptions = storylet.exit_options;
  if (Array.isArray(exitOptions)) {
    exitOptions.forEach((option, optionIndex) => {
      collectStaticRecordReferences(
        asPlainRecord(option).likely_effects,
        `exit_options[${optionIndex}].likely_effects`,
        references
      );
    });
  }

  return references;
}

function collectStaticRecordReferences(value: unknown, path: string, references: StoryReference[]): void {
  if (typeof value === "string") {
    if (value.startsWith("bound:")) {
      return;
    }
    if (STATIC_RECORD_ID.test(value)) {
      references.push({ id: value, path });
      return;
    }
    for (const match of value.matchAll(/\b(?:STENT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STINT|STLOC|STOBJ|DA|STSTAT|CLK|STSEC|STQ|SLT|CHC|BR|PG|CF|CHAR|ENT)-\d+\b/g)) {
      references.push({ id: match[0], path });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStaticRecordReferences(item, `${path}[${index}]`, references));
    return;
  }

  const record = asPlainRecord(value);
  for (const [key, nested] of Object.entries(record)) {
    if (key === "alias" || key === "bind" || key === "bound_alias") {
      continue;
    }
    collectStaticRecordReferences(nested, `${path}.${key}`, references);
  }
}

function pageId(page: Record<string, unknown>): string {
  return stringValue(page.id) ?? "<unknown-page>";
}

function recordId(record: Record<string, unknown>): string {
  return stringValue(record.id) ?? "<unknown-record>";
}

function branchIsolationViolation(
  page: IndexedRecord,
  parsed: Record<string, unknown>,
  reference: StoryReference,
  targetBranchId: string
): Verdict {
  const pageLabel = pageId(parsed);
  return {
    validator: "branch_isolation",
    severity: "fail",
    code: "branch_isolation_violation",
    message: `${pageLabel} state snapshot references ${reference.id} from sibling branch ${targetBranchId}.`,
    location: locationFor(page),
    detail: {
      page_id: pageLabel,
      reference_id: reference.id,
      reference_path: reference.path,
      sibling_branch_id: targetBranchId
    }
  };
}

function globalStoryletReferencesBranchLocal(
  storylet: IndexedRecord,
  parsed: Record<string, unknown>,
  reference: StoryReference,
  owningBranchIdValue: string | undefined
): Verdict {
  const storyletLabel = recordId(parsed);
  return {
    validator: "branch_isolation",
    severity: "fail",
    code: "global_storylet_references_branch_local",
    message: `${storyletLabel} is global_author_pool but statically references branch-local record ${reference.id}.`,
    location: locationFor(storylet),
    detail: {
      storylet_id: storyletLabel,
      reference_id: reference.id,
      reference_path: reference.path,
      owning_branch_id: owningBranchIdValue ?? "<unknown>"
    }
  };
}
