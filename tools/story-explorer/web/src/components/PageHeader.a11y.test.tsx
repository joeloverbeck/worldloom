import { describe, expect, it } from 'vitest';

import type { PageDetail } from '../api/client';
import { assertHeadingHierarchy, expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { PageHeader } from './PageHeader';

function pageDetail(): PageDetail {
  return {
    page: { id: 'PG-12', isLeaf: false, terminalReason: null },
    prose: null,
    proseStatus: 'missing',
    pagePlanSummary: null,
    receiptSummary: null,
    choiceNavigation: [],
    currentStateRecordIds: ['CAST-1'],
    eventDelta: {
      eventId: null,
      createCount: 0,
      supersedeCount: 0,
      closeCount: 0,
      introducedRecordIds: [],
      relationCount: 0,
    },
    validationIntegrity: { validationTrace: {}, receiptVerdict: 'PASS', proseStatus: 'present' },
    branchContext: { branchId: 'BR-3', branchPath: ['BR-1', 'BR-3'], parentPageId: 'PG-7', turnIndex: 12 },
    rawSources: [],
  };
}

describe('PageHeader a11y', () => {
  it('exposes the page title and page tools in visual order', async () => {
    const { container, getByRole } = renderForAxe(
      <PageHeader
        pageDetail={pageDetail()}
        storyTitle="Red Bunny"
        worldSlug="fixture-world"
        storySlug="red-bunny"
        pageId="PG-12"
      />,
    );

    expect(getByRole('heading', { level: 1, name: 'Red Bunny' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Parent PG-7' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Branch map' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Page jump' })).toBeInTheDocument();
    assertHeadingHierarchy(container);
    await expectNoAxeViolations(container);
  });
});
