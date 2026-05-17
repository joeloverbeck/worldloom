import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "story_da_duplicate_heuristic";
const DA_ID = /^DA-\d+$/;

export const storyDaDuplicateHeuristic: Validator = {
  name: VALIDATOR,
  severity_mode: "warn",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some(isStoryDaOrPagePatch)) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/_source\/(?:artifacts\/DA-\d+|pages\/PG-\d+)\.yaml$/)),
  skip_reason: "story DA or page active-record changes only",
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const storySlugs = new Set(records.map((record) => record.story_slug).filter((slug): slug is string => typeof slug === "string"));
    const verdicts: Verdict[] = [];

    for (const storySlug of storySlugs) {
      verdicts.push(...validateStory(records, storySlug));
    }

    return verdicts;
  }
};

function isStoryDaOrPagePatch(patch: { op: string }): boolean {
  return patch.op === "append_story_diegetic_artifact_record" || patch.op === "create_pg_record";
}

function validateStory(records: readonly IndexedRecord[], storySlug: string): Verdict[] {
  const storyRecords = records.filter((record) => record.story_slug === storySlug);
  const latestPage = latestPageForStory(storyRecords);
  if (latestPage === undefined) {
    return [];
  }

  const artifactsById = new Map<string, IndexedRecord>();
  for (const artifact of storyRecords.filter((record) => record.node_type === "story_diegetic_artifact_record")) {
    artifactsById.set(recordId(artifact), artifact);
  }

  const activeArtifacts = activeRecordIds(latestPage, "DA")
    .map((id) => artifactsById.get(id))
    .filter((record): record is IndexedRecord => record !== undefined);
  const clusters = clustersByTitleAndAuthor(activeArtifacts);
  const verdicts: Verdict[] = [];

  for (const cluster of clusters) {
    const unlinked = unlinkedComponents(cluster);
    if (unlinked.length <= 1) {
      continue;
    }
    verdicts.push(duplicateVerdict(latestPage, cluster, unlinked));
  }

  return verdicts;
}

function latestPageForStory(records: readonly IndexedRecord[]): IndexedRecord | undefined {
  const pages = records.filter((record) => record.node_type === "page_record");
  return pages.sort((left, right) => pageSortKey(right) - pageSortKey(left))[0];
}

function pageSortKey(page: IndexedRecord): number {
  const parsed = asPlainRecord(page.parsed);
  const turnIndex = parsed.turn_index;
  if (typeof turnIndex === "number") {
    return turnIndex;
  }
  const id = recordId(page);
  const match = /-(\d+)$/.exec(id);
  return match ? Number(match[1]) : 0;
}

function activeRecordIds(page: IndexedRecord, recordClass: string): string[] {
  const activeRecords = asPlainRecord(asPlainRecord(page.parsed).state_snapshot).active_records;
  const byClass = asPlainRecord(activeRecords)[recordClass];
  if (Array.isArray(byClass)) {
    return stringArray(byClass).filter((id) => recordClass !== "DA" || DA_ID.test(id));
  }
  if (Array.isArray(activeRecords)) {
    return stringArray(activeRecords).filter((id) => recordClass === "DA" && DA_ID.test(id));
  }
  return [];
}

function clustersByTitleAndAuthor(artifacts: readonly IndexedRecord[]): IndexedRecord[][] {
  const bySignature = new Map<string, IndexedRecord[]>();
  for (const artifact of artifacts) {
    const parsed = asPlainRecord(artifact.parsed);
    const title = stringValue(parsed.title);
    const author = stringValue(parsed.author);
    if (title === undefined || author === undefined) {
      continue;
    }
    const signature = `${title}\u0000${author}`;
    const cluster = bySignature.get(signature) ?? [];
    cluster.push(artifact);
    bySignature.set(signature, cluster);
  }
  return [...bySignature.values()].filter((cluster) => cluster.length > 1);
}

function unlinkedComponents(cluster: readonly IndexedRecord[]): string[][] {
  const clusterIds = new Set(cluster.map(recordId));
  const neighbors = new Map<string, Set<string>>();
  for (const artifact of cluster) {
    const id = recordId(artifact);
    neighbors.set(id, neighbors.get(id) ?? new Set());
  }
  for (const artifact of cluster) {
    const id = recordId(artifact);
    for (const linkedId of linkedIds(artifact, clusterIds)) {
      neighbors.get(id)?.add(linkedId);
      neighbors.get(linkedId)?.add(id);
    }
  }

  const seen = new Set<string>();
  const components: string[][] = [];
  for (const id of clusterIds) {
    if (seen.has(id)) {
      continue;
    }
    const component: string[] = [];
    const stack = [id];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined || seen.has(current)) {
        continue;
      }
      seen.add(current);
      component.push(current);
      for (const next of neighbors.get(current) ?? []) {
        if (!seen.has(next)) {
          stack.push(next);
        }
      }
    }
    components.push(component.sort(compareRecordIds));
  }
  return components.sort((left, right) => compareRecordIds(left[0] ?? "", right[0] ?? ""));
}

function linkedIds(artifact: IndexedRecord, clusterIds: ReadonlySet<string>): Set<string> {
  const parsed = asPlainRecord(artifact.parsed);
  const links = new Set<string>();
  const supersedes = stringValue(parsed.supersedes);
  if (supersedes !== undefined && clusterIds.has(supersedes)) {
    links.add(supersedes);
  }
  for (const id of stringArray(parsed.derived_from)) {
    if (clusterIds.has(id)) {
      links.add(id);
    }
  }

  return links;
}

function recordId(record: IndexedRecord): string {
  return stringValue(asPlainRecord(record.parsed).id) ?? record.node_id.split(":").pop() ?? record.node_id;
}

function compareRecordIds(left: string, right: string): number {
  const leftNumber = Number(/-(\d+)$/.exec(left)?.[1] ?? "0");
  const rightNumber = Number(/-(\d+)$/.exec(right)?.[1] ?? "0");
  return leftNumber - rightNumber || left.localeCompare(right);
}

function duplicateVerdict(page: IndexedRecord, cluster: readonly IndexedRecord[], unlinked: readonly string[][]): Verdict {
  const first = asPlainRecord(cluster[0]?.parsed);
  const ids = cluster.map(recordId).sort(compareRecordIds);
  return {
    validator: VALIDATOR,
    severity: "warn",
    code: VALIDATOR,
    message: `Active story-local DAs ${ids.join(", ")} share title "${stringValue(first.title) ?? "<unknown>"}" and author "${stringValue(first.author) ?? "<unknown>"}" without a supersedes/derived_from chain linking the full cluster.`,
    location: locationFor(page),
    detail: {
      page_id: recordId(page),
      title: stringValue(first.title),
      author: stringValue(first.author),
      artifact_ids: ids,
      unlinked_components: unlinked
    },
    suggested_fix: "If these are versions or copies of the same logical artifact, connect them with supersedes or derived_from; otherwise vary title or author metadata enough to show they are distinct artifacts."
  };
}
