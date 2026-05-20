import type { IndexedRecord } from "../framework/types.js";
import {
  asPlainRecord,
  stringValue
} from "./utils.js";

export interface BranchRecordMaps {
  byId: ReadonlyMap<string, IndexedRecord>;
  byType: ReadonlyMap<string, readonly IndexedRecord[]>;
}

export interface BranchLocalityContext {
  branchId: string;
  maps: BranchRecordMaps;
  rootPageIds: ReadonlySet<string>;
}

export function isBranchLocal(recordId: string, context: BranchLocalityContext): boolean {
  const target = context.maps.byId.get(recordId);
  if (target === undefined) {
    return false;
  }

  const targetBranchId = owningBranchId(target, context.maps);
  return (
    targetBranchId === undefined ||
    branchPath(context.branchId, context.maps).has(targetBranchId) ||
    isBundleGenesisRecord(target, context.rootPageIds)
  );
}

export function branchPath(branchId: string, maps: BranchRecordMaps): Set<string> {
  const path = new Set<string>();
  let current: string | undefined = branchId;

  while (current !== undefined && !path.has(current)) {
    const branch = maps.byId.get(current);
    if (branch === undefined || branch.node_type !== "branch_record") {
      break;
    }
    path.add(current);
    current = stringValue(asPlainRecord(branch.parsed).parent_branch_id);
  }

  return path;
}

export function owningBranchId(record: IndexedRecord, maps: BranchRecordMaps): string | undefined {
  if (record.node_type === "branch_record") {
    return stringValue(asPlainRecord(record.parsed).id);
  }
  if (record.node_type === "page_record") {
    return stringValue(asPlainRecord(record.parsed).branch_id);
  }
  const createdAtPage = stringValue(asPlainRecord(record.parsed).created_at_page);
  if (createdAtPage === undefined) {
    return undefined;
  }
  return stringValue(asPlainRecord(maps.byId.get(createdAtPage)?.parsed).branch_id);
}

export function rootPageIdsForStory(maps: BranchRecordMaps): Set<string> {
  const roots = new Set<string>();

  for (const branch of maps.byType.get("branch_record") ?? []) {
    const parsed = asPlainRecord(branch.parsed);
    const parent = stringValue(parsed.parent_branch_id);
    const rootPage = stringValue(parsed.root_page_id);
    if ((parent === undefined || parent === "null") && rootPage !== undefined) {
      roots.add(rootPage);
    }
  }

  for (const page of maps.byType.get("page_record") ?? []) {
    const parsed = asPlainRecord(page.parsed);
    const id = stringValue(parsed.id);
    if (parsed.parent_page_id === null && parsed.turn_index === 0 && id !== undefined) {
      roots.add(id);
    }
  }

  return roots;
}

export function isBundleGenesisRecord(record: IndexedRecord, rootPageIds: ReadonlySet<string>): boolean {
  const created = stringValue(asPlainRecord(record.parsed).created_at_page);
  return created !== undefined && rootPageIds.has(created);
}
