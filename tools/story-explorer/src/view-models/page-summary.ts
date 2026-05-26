export type TerminalReason = "no_children" | "paused" | "terminal" | null;

export interface PageSummary {
  pageId: string;
  branchId: string;
  parentPageId: string | null;
  turnIndex: number;
  choiceId: string | null;
  resolvedEventId: string | null;
  hasRenderedProse: boolean;
  hasPlan: boolean;
  hasReceipt: boolean;
  activeRecordCounts: Record<string, number>;
  childCount: number;
  isLeaf: boolean;
  isTerminalOrPaused: boolean;
  terminalReason: TerminalReason;
}
