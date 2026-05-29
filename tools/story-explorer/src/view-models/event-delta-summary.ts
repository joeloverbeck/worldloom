export interface EventDeltaSummary {
  eventId: string | null;
  createCount: number;
  supersedeCount: number;
  closeCount: number;
  introducedRecordIds: string[];
  relationCount: number;
}
