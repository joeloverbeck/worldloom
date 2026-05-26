import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getRecord } from '../../../api/client';
import { LinkedRecordPeek } from '../LinkedRecordPeek';
import { recordCard } from './fixtures';

vi.mock('../../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/client')>();
  return {
    ...actual,
    getRecord: vi.fn(),
  };
});

const mockedGetRecord = vi.mocked(getRecord);

beforeEach(() => {
  mockedGetRecord.mockReset();
});

describe('LinkedRecordPeek', () => {
  it('fetches and renders a not-active record compact card', async () => {
    mockedGetRecord.mockResolvedValue({
      envelope: null,
      payload: { record: {}, recordCard: recordCard({ recordId: 'SF-9', summaryLine: 'Hidden fact' }) },
    });

    render(<LinkedRecordPeek onClose={vi.fn()} recordId="SF-9" storySlug="red-bunny" worldSlug="fixture-world" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading SF-9.');
    await waitFor(() => expect(mockedGetRecord).toHaveBeenCalledWith('fixture-world', 'red-bunny', 'SF-9'));
    expect(screen.getByText('Not active on this page')).toBeInTheDocument();
    expect(screen.getByText('Hidden fact')).toBeInTheDocument();
  });

  it('dismisses with Escape', async () => {
    const onClose = vi.fn();
    mockedGetRecord.mockResolvedValue({
      envelope: null,
      payload: { record: {}, recordCard: recordCard({ recordId: 'SF-9', summaryLine: 'SF-9 summary' }) },
    });

    render(<LinkedRecordPeek onClose={onClose} recordId="SF-9" storySlug="red-bunny" worldSlug="fixture-world" />);

    await screen.findByText('SF-9 summary');

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });
});
