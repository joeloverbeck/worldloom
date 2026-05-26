export interface ChildOutcomeVariant {
  pageId: string;
  branchId: string;
  turnIndex: number;
  resolvedEventId: string | null;
  outcomeRoute: string | null;
  resolutionPreview: string | null;
  selectedStoryletId: string | null;
  hasRenderedProse: boolean;
  stateDeltaCounts: {
    create: number;
    supersede: number;
    close: number;
  };
}
