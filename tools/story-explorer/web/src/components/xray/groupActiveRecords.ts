import type { RecordCard, RecordGroup } from '../../api/client';

export const CURRENT_STATE_GROUPS: RecordGroup[] = [
  'Cast & Status',
  'Scene & Affordances',
  'Knowledge & Truth',
  'Plans & Emotion',
  'Relationships & Debts',
  'Pressure & Open Loops',
  'Event Delta',
  'Validation & Integrity',
];

export const GROUP_BY_CLASS_PREFIX: Record<string, RecordGroup> = {
  STENT: 'Cast & Status',
  STCHAR: 'Cast & Status',
  STSTAT: 'Cast & Status',
  BR: 'Cast & Status',
  STLOC: 'Scene & Affordances',
  STOBJ: 'Scene & Affordances',
  DA: 'Scene & Affordances',
  BEL: 'Knowledge & Truth',
  SF: 'Knowledge & Truth',
  STSEC: 'Knowledge & Truth',
  STQ: 'Knowledge & Truth',
  STPLAN: 'Plans & Emotion',
  STEMO: 'Plans & Emotion',
  STINT: 'Plans & Emotion',
  SREL: 'Relationships & Debts',
  OBL: 'Relationships & Debts',
  CNSQ: 'Pressure & Open Loops',
  THR: 'Pressure & Open Loops',
  CLK: 'Pressure & Open Loops',
  SLT: 'Pressure & Open Loops',
  SE: 'Event Delta',
  CHC: 'Event Delta',
};

export function groupAnchorId(group: RecordGroup): string {
  return `xray-group-${group.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
}

export function recordClassPrefix(recordId: string): string {
  return recordId.split('-')[0] ?? recordId;
}

export function groupForRecordId(recordId: string): RecordGroup {
  return GROUP_BY_CLASS_PREFIX[recordClassPrefix(recordId)] ?? 'Validation & Integrity';
}

export function emptyGroups<T>(): Record<RecordGroup, T[]> {
  const groups = {} as Record<RecordGroup, T[]>;
  for (const group of CURRENT_STATE_GROUPS) {
    groups[group] = [];
  }

  return groups;
}

export function groupRecordCards(records: RecordCard[]): Record<RecordGroup, RecordCard[]> {
  return records.reduce((groups, recordCard) => {
    groups[groupForRecordId(recordCard.recordId)].push(recordCard);
    return groups;
  }, emptyGroups<RecordCard>());
}

export function countRecordIdsByGroup(recordIds: string[]): Record<RecordGroup, number> {
  const counts = {} as Record<RecordGroup, number>;
  for (const group of CURRENT_STATE_GROUPS) {
    counts[group] = 0;
  }

  for (const recordId of recordIds) {
    counts[groupForRecordId(recordId)] += 1;
  }

  return counts;
}
