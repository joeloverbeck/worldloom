import type { IndexStatus, RecordCard, RecordGroup, RecordProvenance, StateTickXray } from '../../../api/client';
import { recordCard } from './fixtures';

function recordIdsByClass(recordIds: string[]): Record<string, string[]> {
  const byClass: Record<string, string[]> = {};
  for (const recordId of recordIds) {
    const recordClass = recordId.split('-')[0] ?? recordId;
    (byClass[recordClass] ??= []).push(recordId);
  }
  return byClass;
}

interface DemoTickOverrides extends Partial<StateTickXray> {
  // Convenience: callers historically passed currentStateRecordIds; map it to activeRecordsByClass.
  currentStateRecordIds?: string[];
}

export function demoStateTickXray(overrides: DemoTickOverrides = {}): StateTickXray {
  const { currentStateRecordIds, activeRecordsByClass: activeRecordsByClassOverride, ...rest } = overrides;
  const activeRecordsByClass =
    activeRecordsByClassOverride ?? (currentStateRecordIds ? recordIdsByClass(currentStateRecordIds) : {});

  return {
    pageId: 'PG-12',
    parentPageId: 'PG-7',
    branchId: 'BR-3',
    branchPath: ['BR-1', 'BR-3'],
    turnIndex: 12,
    inputMode: null,
    resolvedEventId: null,
    stateHash: 'sha256-tick',
    parentStateHash: 'sha256-parent',
    stateSnapshotSummary: {
      activeRecordCounts: {},
      continuationStatus: null,
      unresolvedMysteryClaims: [],
    },
    activeRecordsByClass,
    visibleAffordances: ['open cellar door'],
    unresolvedMysteryClaims: [],
    continuationStatus: null,
    emittedChoices: { pageId: 'PG-12', emittedChoices: [] },
    validationTrace: {},
    rawPageYaml: {
      sourcePath: 'worlds/demo/stories/test/_source/pages/PG-12.yaml',
      contentHash: 'sha256-demo',
      body: 'id: PG-12\n',
    },
    resolvedEvent: null,
    eventDelta: {
      eventId: null,
      createCount: 0,
      supersedeCount: 0,
      closeCount: 0,
      introducedRecordIds: [],
      relationCount: 0,
    },
    createdRecordIds: [],
    supersededRecordIds: [],
    closedRecordIds: [],
    container: { kind: 'unknown', sceneId: null, startPg: null, endPg: null, pageIds: [] },
    indexStatus: { kind: 'fresh', version: 1 },
    degradedDirectRead: false,
    ...rest,
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
