import type { RecordLink } from "./record-link.js";

export type RecordGroup =
  | "Cast & Status"
  | "Scene & Affordances"
  | "Knowledge & Truth"
  | "Plans & Emotion"
  | "Relationships & Debts"
  | "Pressure & Open Loops"
  | "Event Delta"
  | "Validation & Integrity";

export interface RecordField {
  name: string;
  value: string;
}

export interface RecordChip {
  label: string;
  value: string;
}

export interface RecordProvenanceSummary {
  createdAtPage: string | null;
  creatingEventId: string | null;
  modifyingEventIds: string[];
  evidenceRecordIds: string[];
}

export interface RecordCard {
  recordId: string;
  recordClass: string;
  group: RecordGroup;
  summaryLine: string;
  chips: RecordChip[];
  primaryFields: RecordField[];
  secondaryFields: RecordField[];
  status: string | null;
  visibility: string | null;
  confidence: string | null;
  urgency: string | null;
  participants: string[];
  provenance: RecordProvenanceSummary;
  links: RecordLink[];
  rawAvailable: boolean;
  sourcePath: string | null;
  contentHash: string | null;
}
