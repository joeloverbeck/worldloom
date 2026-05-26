import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PageDetail, RecordCard } from '../../../../api/client';
import { getRecord } from '../../../../api/client';
import { recordCard } from '../../__tests__/fixtures';
import { WhatChangedHereTab } from '../WhatChangedHereTab';

vi.mock('../../../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../api/client')>();
  return {
    ...actual,
    getRecord: vi.fn(),
  };
});

const mockedGetRecord = vi.mocked(getRecord);

beforeEach(() => {
  mockedGetRecord.mockReset();
});

function pageDetail(overrides: Partial<PageDetail> = {}): PageDetail {
  return {
    page: {
      id: 'PG-2',
      input: {
        choice_id: 'CHC-1',
        manual_action_text: null,
        resolved_event_id: 'SE-2',
      },
    },
    prose: null,
    proseStatus: 'present',
    pagePlanSummary: null,
    receiptSummary: null,
    choiceNavigation: [],
    currentStateRecordIds: [],
    eventDelta: {
      eventId: 'SE-2',
      createCount: 2,
      supersedeCount: 1,
      closeCount: 1,
      introducedRecordIds: ['BEL-2'],
      relationCount: 1,
    },
    validationIntegrity: {
      validationTrace: {},
      receiptVerdict: 'accept',
      proseStatus: 'present',
    },
    branchContext: {
      branchId: 'BR-1',
      branchPath: ['BR-1'],
      parentPageId: 'PG-1',
      turnIndex: 2,
    },
    rawSources: [],
    ...overrides,
  };
}

function card(recordId: string, overrides: Partial<RecordCard> = {}): RecordCard {
  return recordCard({
    recordId,
    recordClass: recordId.split('-')[0] ?? recordId,
    group: recordId.startsWith('SE-') ? 'Event Delta' : 'Pressure & Open Loops',
    summaryLine: `${recordId} summary`,
    chips: [],
    links: [],
    rawAvailable: false,
    ...overrides,
  });
}

function storyEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'SE-2',
    event_kind: 'turn_resolution',
    actor: 'STENT-1',
    targets: ['STENT-2', 'STOBJ-1'],
    turn_driver: {
      kind: 'player_action',
      initiator: 'player',
      driver_records: [],
      player_response_mode: 'initiates',
      pov_visibility: 'perceived_directly',
    },
    outcome_route: 'attempt',
    resolution: {
      result: 'partial_success',
      player_visible_feedback: 'The door opens, but the latch snaps.',
    },
    commitment: {
      selected_slt_id: 'SLT-4',
    },
    world_logic_rationale: 'The lock was weakened by prior pressure.',
    state_delta: {
      create: ['BEL-2', 'CNSQ-1'],
      supersede: ['STSTAT-1'],
      close: ['OBL-1'],
    },
    record_introductions: [
      {
        record_id: 'THR-2',
        class: 'THR',
        trigger: 'new_ongoing_causal_concern',
        evidence: ['SE-2', 'BEL-2'],
        distinct_from: [],
      },
    ],
    state_relations: [{ relation: 'advances', target_record: 'THR-2' }],
    non_propagation_facts: [{ reason: 'no_witness', group: 'upper hall', records: ['BEL-3'] }],
    promotion_claims: [{ source_record: 'SF-1', authority: 'canon_candidate' }],
    ...overrides,
  };
}

describe('WhatChangedHereTab', () => {
  it('renders the resolved SE with state delta sections and selected storylet card', async () => {
    mockedGetRecord.mockImplementation(async (_worldSlug, _storySlug, recordId) => {
      if (recordId === 'SE-2') {
        return { envelope: null, payload: { record: storyEvent(), recordCard: card('SE-2') } };
      }

      if (recordId === 'SLT-4') {
        return { envelope: null, payload: { record: {}, recordCard: card('SLT-4') } };
      }

      throw new Error(`Unexpected record ${recordId}`);
    });

    render(<WhatChangedHereTab pageDetail={pageDetail()} storySlug="red-bunny" worldSlug="fixture-world" />);

    await waitFor(() => expect(mockedGetRecord).toHaveBeenCalledTimes(2));

    expect(screen.getByText('SE-2 summary')).toBeInTheDocument();
    expect(screen.getByText('SLT-4 summary')).toBeInTheDocument();
    expect(screen.getByText('SE-2 - turn_resolution')).toBeInTheDocument();
    expect(screen.getByText('STENT-1 -> STENT-2, STOBJ-1')).toBeInTheDocument();
    expect(screen.getByText('player_action - initiator player - POV perceived_directly')).toBeInTheDocument();
    expect(screen.getByText('attempt - resolution: partial_success - The door opens, but the latch snaps.')).toBeInTheDocument();
    expect(screen.getByText('The lock was weakened by prior pressure.')).toBeInTheDocument();

    const stateDelta = screen.getByRole('heading', { name: 'State Delta' }).closest('section');
    expect(stateDelta).not.toBeNull();
    expect(within(stateDelta as HTMLElement).getByRole('heading', { name: 'Created' })).toBeInTheDocument();
    expect(within(stateDelta as HTMLElement).getByRole('button', { name: 'BEL-2 - BEL' })).toBeInTheDocument();
    expect(within(stateDelta as HTMLElement).getByRole('button', { name: 'STSTAT-1 - STSTAT' })).toBeInTheDocument();
    expect(within(stateDelta as HTMLElement).getByRole('button', { name: 'OBL-1 - OBL' })).toBeInTheDocument();

    expect(screen.getByText('THR-2 - THR via new_ongoing_causal_concern; evidence SE-2, BEL-2')).toBeInTheDocument();
    expect(screen.getByText('advances THR-2')).toBeInTheDocument();
    expect(screen.getByText('no_witness - upper hall (BEL-3)')).toBeInTheDocument();
    expect(screen.getByText('SF-1 - canon_candidate')).toBeInTheDocument();
  });

  it('renders the root-page no-event message without fetching', () => {
    render(
      <WhatChangedHereTab
        pageDetail={pageDetail({
          page: { id: 'PG-1', input: { resolved_event_id: null } },
          eventDelta: {
            eventId: null,
            createCount: 0,
            supersedeCount: 0,
            closeCount: 0,
            introducedRecordIds: [],
            relationCount: 0,
          },
        })}
        storySlug="red-bunny"
        worldSlug="fixture-world"
      />,
    );

    expect(mockedGetRecord).not.toHaveBeenCalled();
    expect(screen.getByText(/No causal event for this page/)).toBeInTheDocument();
  });

  it('omits the selected-storylet section when the SE has no selected SLT', async () => {
    mockedGetRecord.mockResolvedValue({
      envelope: null,
      payload: {
        record: storyEvent({ commitment: { selected_slt_id: null } }),
        recordCard: card('SE-2'),
      },
    });

    render(<WhatChangedHereTab pageDetail={pageDetail()} storySlug="red-bunny" worldSlug="fixture-world" />);

    await waitFor(() => expect(mockedGetRecord).toHaveBeenCalledTimes(1));

    expect(screen.queryByRole('heading', { name: 'Selected Storylet' })).not.toBeInTheDocument();
    expect(screen.getByText('SE-2 summary')).toBeInTheDocument();
  });
});
