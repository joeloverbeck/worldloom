export interface BranchMapEdge {
  fromPageId: string;
  toPageId: string;
  choiceId: string | null;
  choiceLabel: string | null;
  variantLabel: string | null;
  branchId: string;
}
