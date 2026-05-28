import type { IndexedRecord } from "../framework/types.js";
import { asPlainRecord, stringArray, stringValue } from "./utils.js";
import type { StoryMaps } from "./stchar-utils.js";

const HIGH_URGENCY_CLASSES = new Set(["STPLAN", "STEMO", "CLK", "THR", "STSEC", "STQ", "OBL", "CNSQ"]);

export interface HighUrgencyActiveRecord {
  id: string;
  recordClass: string;
  record: IndexedRecord | undefined;
}

export function highUrgencyActiveRecords(page: IndexedRecord, maps: StoryMaps): HighUrgencyActiveRecord[] {
  const activeRecords = asPlainRecord(asPlainRecord(asPlainRecord(page.parsed).state_snapshot).active_records);
  const high: HighUrgencyActiveRecord[] = [];
  for (const [recordClass, rawIds] of Object.entries(activeRecords)) {
    if (!HIGH_URGENCY_CLASSES.has(recordClass)) {
      continue;
    }
    for (const id of stringArray(rawIds)) {
      const record = maps.byId.get(id);
      if (record === undefined || isHighUrgency(recordClass, asPlainRecord(record.parsed))) {
        high.push({ id, recordClass, record });
      }
    }
  }
  return high;
}

function isHighUrgency(recordClass: string, parsed: Record<string, unknown>): boolean {
  if (recordClass === "STPLAN") {
    const status = stringValue(parsed.plan_status);
    return (status === "active" || status === "blocked" || status === "suspended") &&
      Object.keys(asPlainRecord(parsed.current_step)).length > 0;
  }
  if (recordClass === "STEMO") {
    const intensity = stringValue(parsed.intensity);
    return (intensity === "high" || intensity === "extreme") && stringArray(parsed.behavioral_pressure).length > 0;
  }
  if (recordClass === "CLK") {
    const value = numberValue(parsed.value);
    const thresholds = Array.isArray(parsed.thresholds) ? parsed.thresholds : [];
    return stringValue(parsed.status) === "active" &&
      value !== undefined &&
      thresholds.some((threshold) => {
        const at = numberValue(asPlainRecord(threshold).at);
        return at !== undefined && value >= at;
      });
  }
  if (recordClass === "THR") {
    return stringValue(parsed.status) === "active" && stringValue(parsed.urgency) === "high";
  }
  if (recordClass === "STSEC") {
    return stringValue(parsed.status) === "partially_revealed" || stringArray(parsed.reveal_records).length > 0;
  }
  if (recordClass === "STQ") {
    return stringValue(parsed.status) === "complicated" && stringValue(parsed.salience) === "high";
  }
  if (recordClass === "OBL") {
    return (stringValue(parsed.status) === "open" || stringValue(parsed.status) === "escalated") &&
      stringValue(parsed.urgency) === "high";
  }
  if (recordClass === "CNSQ") {
    return (stringValue(parsed.status) === "pending" || stringValue(parsed.status) === "escalated") &&
      stringValue(parsed.urgency) === "high";
  }
  return false;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
