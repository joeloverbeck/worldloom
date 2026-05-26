export interface RecordLink {
  recordId: string;
  recordClass: string;
  label: string;
  relationship: string;
  targetExists: boolean;
  activeOnCurrentPage: boolean;
  targetPageId: string | null;
  brokenReason: string | null;
}
