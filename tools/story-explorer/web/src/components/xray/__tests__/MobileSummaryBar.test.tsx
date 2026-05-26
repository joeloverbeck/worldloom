import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PageDetail } from '../../../api/client';
import { MobileSummaryBar } from '../MobileSummaryBar';

function pageDetail(overrides: Partial<PageDetail> = {}): PageDetail {
  return {
    page: { id: 'PG-12' },
    prose: null,
    proseStatus: 'present',
    pagePlanSummary: null,
    receiptSummary: null,
    choiceNavigation: [],
    currentStateRecordIds: ['STCHAR-1', 'BEL-1', 'THR-1'],
    eventDelta: {
      eventId: 'SE-12',
      createCount: 2,
      supersedeCount: 1,
      closeCount: 0,
      introducedRecordIds: [],
      relationCount: 0,
    },
    validationIntegrity: {
      validationTrace: {},
      receiptVerdict: 'accept',
      proseStatus: 'present',
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

describe('MobileSummaryBar', () => {
  it('renders compressed active and delta counts with grouped jump options', () => {
    render(<MobileSummaryBar pageDetail={pageDetail()} />);

    const summary = screen.getByLabelText('State X-Ray summary');
    expect(within(summary).getByText('3 active')).toBeInTheDocument();
    expect(within(summary).getByText('Created 2')).toBeInTheDocument();
    expect(within(summary).getByText('Superseded 1')).toBeInTheDocument();
    expect(within(summary).getByText('Closed 0')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cast & Status (1)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Knowledge & Truth (1)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Validation & Integrity (0)' })).toBeInTheDocument();
  });

  it('scrolls to the selected group anchor', () => {
    const target = document.createElement('button');
    target.id = 'xray-group-knowledge-truth';
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    render(<MobileSummaryBar pageDetail={pageDetail()} />);
    fireEvent.change(screen.getByLabelText('Jump to group'), { target: { value: 'xray-group-knowledge-truth' } });

    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(document.activeElement).toBe(target);
    target.remove();
  });
});
