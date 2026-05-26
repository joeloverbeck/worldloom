import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { PageDetail } from '../api/client';
import { PageHeader } from './PageHeader';

function pageDetail(overrides: Partial<PageDetail> = {}): PageDetail {
  return {
    page: { id: 'PG-12' },
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

describe('PageHeader', () => {
  it('renders story title, page identity, branch chip, turn index, parent link, tools, and integrity chip', () => {
    render(
      <MemoryRouter>
        <PageHeader
          pageDetail={pageDetail()}
          storyTitle="Red Bunny"
          worldSlug="fixture-world"
          storySlug="red-bunny"
          pageId="PG-12"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Red Bunny' })).toBeInTheDocument();
    expect(screen.getByText('PG-12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Branch BR-3' })).toBeInTheDocument();
    expect(screen.getByText('Turn 12')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Parent PG-7' })).toHaveAttribute(
      'href',
      '/worlds/fixture-world/stories/red-bunny/pages/PG-7',
    );
    expect(screen.getByRole('button', { name: 'Branch map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page jump' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Integrity clean/ })).toBeInTheDocument();
  });

  it('omits the parent link for root pages', () => {
    render(
      <MemoryRouter>
        <PageHeader
          pageDetail={pageDetail({ branchContext: { branchId: 'BR-1', branchPath: ['BR-1'], parentPageId: null, turnIndex: 1 } })}
          storyTitle="Red Bunny"
          worldSlug="fixture-world"
          storySlug="red-bunny"
          pageId="PG-1"
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /Parent PG-/ })).not.toBeInTheDocument();
  });
});
