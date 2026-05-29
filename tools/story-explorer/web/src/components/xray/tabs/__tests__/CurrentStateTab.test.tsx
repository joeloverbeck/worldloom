import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecordCard, RecordGroup, StateTickXray } from '../../../../api/client';
import { getRecord } from '../../../../api/client';
import { recordCard } from '../../__tests__/fixtures';
import { demoStateTickXray } from '../../__tests__/a11y-fixtures';
import { CURRENT_STATE_GROUPS, CurrentStateTab, VIRTUALIZATION_THRESHOLD } from '../CurrentStateTab';

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

function tick(currentStateRecordIds: string[] = []): StateTickXray {
  return demoStateTickXray({
    currentStateRecordIds,
    visibleAffordances: ['open cellar door', 'loose floorboard'],
  });
}

function card(recordId: string, group: RecordGroup, overrides: Partial<RecordCard> = {}): RecordCard {
  const recordClass = recordId.split('-')[0] ?? recordId;
  return recordCard({
    recordId,
    recordClass,
    group,
    summaryLine: `${recordId} summary`,
    status: 'active',
    visibility: null,
    confidence: null,
    links: [],
    rawAvailable: false,
    ...overrides,
  });
}

function mockRecords(cards: RecordCard[]): void {
  mockedGetRecord.mockImplementation(async (_worldSlug, _storySlug, recordId) => {
    const found = cards.find((candidate) => candidate.recordId === recordId);
    if (!found) {
      throw new Error(`Missing fixture for ${recordId}`);
    }

    return { envelope: null, payload: { record: {}, recordCard: found } };
  });
}

describe('CurrentStateTab', () => {
  it('renders the eight groups in SPEC-89 order with fetched compact cards and visible affordances', async () => {
    const cards = [
      card('STENT-1', 'Cast & Status', { visibility: 'hidden' }),
      card('STLOC-1', 'Scene & Affordances'),
      card('BEL-1', 'Knowledge & Truth', { confidence: 'low' }),
      card('STPLAN-1', 'Plans & Emotion'),
      card('SREL-1', 'Relationships & Debts'),
      card('THR-1', 'Pressure & Open Loops'),
      card('SE-1', 'Event Delta'),
      card('SAU-1', 'Validation & Integrity'),
    ];
    mockRecords(cards);

    render(
      <CurrentStateTab
        tick={tick(cards.map((candidate) => candidate.recordId))}
        storySlug="red-bunny"
        worldSlug="fixture-world"
      />,
    );

    await waitFor(() => expect(mockedGetRecord).toHaveBeenCalledTimes(cards.length));

    const groupTriggers = screen.getAllByRole('button').filter((button) => button.textContent?.includes(' active'));
    expect(groupTriggers.map((button) => button.textContent?.split(' · ')[0])).toEqual(CURRENT_STATE_GROUPS);
    expect(screen.getByRole('button', { name: 'Cast & Status · 1 active · 1 hidden' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Knowledge & Truth · 1 active · 1 low-confidence' })).toBeInTheDocument();

    const affordances = screen.getByLabelText('Visible affordances');
    expect(within(affordances).getByText('open cellar door')).toBeInTheDocument();
    expect(within(affordances).getByText('loose floorboard')).toBeInTheDocument();
    expect(screen.getByText('BEL-1 summary')).toBeInTheDocument();
  });

  it('mounts only a virtualized window when a group reaches the threshold', async () => {
    const cards = Array.from({ length: VIRTUALIZATION_THRESHOLD + 10 }, (_, index) =>
      card(`BEL-${index + 1}`, 'Knowledge & Truth'),
    );
    mockRecords(cards);

    render(
      <CurrentStateTab
        tick={tick(cards.map((candidate) => candidate.recordId))}
        storySlug="red-bunny"
        worldSlug="fixture-world"
      />,
    );

    await waitFor(() => expect(mockedGetRecord).toHaveBeenCalledTimes(cards.length));

    expect(screen.getByLabelText(`Virtualized record list with ${cards.length} records`)).toBeInTheDocument();
    expect(screen.getByText('BEL-1 summary')).toBeInTheDocument();
    expect(screen.queryByText(`BEL-${cards.length} summary`)).not.toBeInTheDocument();
  });
});
