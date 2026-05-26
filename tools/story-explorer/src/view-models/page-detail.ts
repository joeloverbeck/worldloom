import type { ChoiceNavigation } from "./choice-navigation.js";

export type ProseStatus = "present" | "missing" | "unreadable" | "hash_mismatch";

export interface PagePlanSummary {
  path: string;
  body: string;
}

export interface ReceiptSummary {
  path: string;
  verdict: string | null;
  stateHash: string | null;
  body: Record<string, unknown>;
}

export interface EventDeltaSummary {
  eventId: string | null;
  createCount: number;
  supersedeCount: number;
  closeCount: number;
  introducedRecordIds: string[];
  relationCount: number;
}

export interface ValidationIntegritySummary {
  validationTrace: Record<string, unknown>;
  receiptVerdict: string | null;
  proseStatus: ProseStatus;
}

export interface BranchContext {
  branchId: string;
  branchPath: string[];
  parentPageId: string | null;
  turnIndex: number;
}

export interface RawSourceReference {
  recordId: string;
  sourcePath: string;
  contentHash: string;
}

export interface PageDetail {
  page: Record<string, unknown>;
  prose: string | null;
  proseStatus: ProseStatus;
  pagePlanSummary: PagePlanSummary | null;
  receiptSummary: ReceiptSummary | null;
  choiceNavigation: ChoiceNavigation[];
  currentStateRecordIds: string[];
  eventDelta: EventDeltaSummary;
  validationIntegrity: ValidationIntegritySummary;
  branchContext: BranchContext;
  rawSources: RawSourceReference[];
}
