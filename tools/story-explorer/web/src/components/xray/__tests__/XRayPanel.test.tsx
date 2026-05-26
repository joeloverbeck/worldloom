import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PageDetail } from '../../../api/client';
import { XRayPanel } from '../XRayPanel';

function pageDetail(overrides: Partial<PageDetail> = {}): PageDetail {
  return {
    page: { id: 'PG-12' },
    prose: null,
    proseStatus: 'missing',
    pagePlanSummary: null,
    receiptSummary: null,
    choiceNavigation: [],
    currentStateRecordIds: ['STENT-1', 'BEL-1'],
    eventDelta: {
      eventId: 'SE-12',
      createCount: 1,
      supersedeCount: 0,
      closeCount: 0,
      introducedRecordIds: ['BEL-1'],
      relationCount: 2,
    },
    validationIntegrity: {
      validationTrace: {},
      receiptVerdict: 'PASS',
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

describe('XRayPanel', () => {
  it('renders the four X-Ray tabs with Current State selected by default', () => {
    render(<XRayPanel pageDetail={pageDetail()} />);

    const tablist = screen.getByRole('tablist', { name: 'State X-Ray tabs' });
    const tabs = within(tablist).getAllByRole('tab');

    expect(tabs).toHaveLength(4);
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Current State',
      'What Changed Here',
      'Plan & Prose',
      'Validation & Integrity',
    ]);
    expect(screen.getByRole('tab', { name: 'Current State' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Current State' })).toHaveTextContent(
      'Tab content to be filled by SPEC89STOEXPSTA-004',
    );
  });

  it('cycles keyboard focus and selection through the tabs', () => {
    render(<XRayPanel pageDetail={pageDetail()} />);

    const currentState = screen.getByRole('tab', { name: 'Current State' });
    fireEvent.keyDown(currentState, { key: 'ArrowRight' });

    expect(screen.getByRole('tab', { name: 'What Changed Here' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'What Changed Here' })).toHaveTextContent(
      'Tab content to be filled by SPEC89STOEXPSTA-005',
    );

    fireEvent.keyDown(screen.getByRole('tab', { name: 'What Changed Here' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Validation & Integrity' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Validation & Integrity' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Plan & Prose' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Plan & Prose' }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'Current State' })).toHaveAttribute('aria-selected', 'true');
  });
});
