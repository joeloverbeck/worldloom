import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PageDetail } from '../../../api/client';
import { StickyRail } from '../StickyRail';

function pageDetail(overrides: Partial<PageDetail> = {}): PageDetail {
  return {
    page: { id: 'PG-12' },
    prose: null,
    proseStatus: 'present',
    pagePlanSummary: null,
    receiptSummary: { body: {}, path: 'pages-prose-receipts/PG-12.yaml', stateHash: 'ok', verdict: 'accept' },
    choiceNavigation: [],
    currentStateRecordIds: ['STCHAR-1', 'BEL-1', 'THR-1', 'SE-1'],
    eventDelta: {
      eventId: 'SE-12',
      createCount: 2,
      supersedeCount: 1,
      closeCount: 3,
      introducedRecordIds: [],
      relationCount: 0,
    },
    validationIntegrity: {
      validationTrace: {},
      receiptPresence: 'present',
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

describe('StickyRail', () => {
  it('renders page status, grouped active-record counts, delta counts, and group anchors', () => {
    render(<StickyRail pageDetail={pageDetail()} />);

    expect(screen.getByText('PG-12 · BR-3')).toBeInTheDocument();
    expect(screen.getByText('Prose present')).toBeInTheDocument();
    expect(screen.getByText('Receipt present')).toBeInTheDocument();
    expect(screen.getByText('Created 2 · Superseded 1 · Closed 3')).toBeInTheDocument();

    const activeRecords = screen.getByRole('heading', { name: 'Active Records' }).closest('section');
    expect(activeRecords).not.toBeNull();
    expect(within(activeRecords as HTMLElement).getByText('Cast & Status').nextSibling).toHaveTextContent('1');
    expect(within(activeRecords as HTMLElement).getByText('Knowledge & Truth').nextSibling).toHaveTextContent('1');
    expect(within(activeRecords as HTMLElement).getByText('Pressure & Open Loops').nextSibling).toHaveTextContent('1');
    expect(within(activeRecords as HTMLElement).getByText('Event Delta').nextSibling).toHaveTextContent('1');

    expect(screen.getByRole('link', { name: 'Cast & Status' })).toHaveAttribute('href', '#xray-group-cast-status');
    expect(screen.getByRole('link', { name: 'Validation & Integrity' })).toHaveAttribute(
      'href',
      '#xray-group-validation-integrity',
    );
  });
});
