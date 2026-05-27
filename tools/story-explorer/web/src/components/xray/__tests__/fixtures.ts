import type { RecordCard } from '../../../api/client';

export function recordCard(overrides: Partial<RecordCard> = {}): RecordCard {
  return {
    recordId: 'BEL-1',
    recordClass: 'BEL',
    group: 'Knowledge & Truth',
    summaryLine: 'Lyra believes the gate is watched',
    primaryFields: [
      { name: 'Holder', value: 'STCHAR-1' },
      { name: 'Claim', value: 'The gate is watched' },
    ],
    secondaryFields: [{ name: 'Basis', value: 'SE-2' }],
    status: 'active',
    visibility: 'hidden',
    confidence: 'low',
    urgency: null,
    participants: ['STCHAR-1'],
    provenance: {
      createdAtPage: 'PG-1',
      creatingEventId: 'SE-1',
      modifyingEventIds: [],
      evidenceRecordIds: ['SF-1'],
    },
    links: [
      {
        recordId: 'SF-1',
        recordClass: 'SF',
        label: 'Gate watch fact',
        relationship: 'evidence',
        targetExists: true,
        activeOnCurrentPage: true,
        targetPageId: 'PG-1',
        brokenReason: null,
      },
    ],
    rawAvailable: true,
    sourcePath: 'worlds/demo/stories/test/_source/beliefs/BEL-1.yaml',
    contentHash: 'sha256-demo',
    ...overrides,
  };
}
