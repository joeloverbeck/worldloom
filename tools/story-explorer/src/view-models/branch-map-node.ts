export interface BranchMapNode {
  pageId: string;
  branchId: string;
  turnIndex: number;
  label: string;
  hasProse: boolean;
  isCurrent: boolean;
  isLeaf: boolean;
  isTerminal: boolean;
  eventKind: string | null;
  outcomeRoute: string | null;
}
