import type { IndexStatus, PageDetail, RecordCard, RecordGroup, RecordProvenance } from '../../../api/client';
import { recordCard } from './fixtures';

export function demoPageDetail(overrides: Partial<PageDetail> = {}): PageDetail {
  return {
    page: {
      id: 'PG-12',
      input: { resolved_event_id: null },
      state_snapshot: { visible_affordances: ['open cellar door'] },
    },
    prose: null,
    proseStatus: 'missing',
    pagePlanSummary: null,
    receiptSummary: null,
    choiceNavigation: [],
    currentStateRecordIds: [],
    eventDelta: {
      eventId: null,
      createCount: 0,
      supersedeCount: 0,
      closeCount: 0,
      introducedRecordIds: [],
      relationCount: 0,
    },
    validationIntegrity: {
      validationTrace: {},
      receiptVerdict: 'PASS',
      proseStatus: 'present',
      receiptPresence: 'present',
      stateHashStatus: 'match',
      planHashStatus: 'present',
      malformedYamlWarnings: [],
      skippedRecords: [],
      brokenRefs: [],
    },
    branchContext: {
      branchId: 'BR-3',
      branchPath: ['BR-1', 'BR-3'],
      parentPageId: 'PG-7',
      turnIndex: 12,
    },
    rawSources: [],
    ...overrides,
  };
}

export function demoIndexStatus(): IndexStatus {
  return { kind: 'fresh', version: 1 };
}

export function card(recordId = 'BEL-1', group: RecordGroup = 'Knowledge & Truth', overrides: Partial<RecordCard> = {}): RecordCard {
  const recordClass = recordId.split('-')[0] ?? recordId;
  return recordCard({
    recordId,
    recordClass,
    group,
    status: 'active',
    visibility: null,
    confidence: null,
    links: [],
    rawAvailable: false,
    ...overrides,
  });
}

export function envelope<T>(payload: T): Response {
  return new Response(JSON.stringify({ data: payload }), { status: 200 });
}

export function rawRecordResponse(body = 'id: BEL-1\nclaim: The gate is watched\n'): Response {
  return envelope({
    body,
    sourcePath: 'worlds/demo/stories/test/_source/beliefs/BEL-1.yaml',
    contentHash: 'sha256-demo',
  });
}

export function recordResponse(recordCard: RecordCard = card()): Response {
  return envelope({
    record: { id: recordCard.recordId, created_at_page: 'PG-12' },
    recordCard,
  });
}

export function provenanceResponse(overrides: Partial<RecordProvenance> = {}): Response {
  return envelope({
    creatingSeId: null,
    modifyingSeIds: [],
    evidenceRecords: [],
    ...overrides,
  });
}
