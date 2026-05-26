import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, type PageDetail } from '../../../../api/client';
import { getPagePlan, getProseReceipt } from '../../../../api/client';
import { PlanProseTab } from '../PlanProseTab';

vi.mock('../../../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../api/client')>();
  return {
    ...actual,
    getPagePlan: vi.fn(),
    getProseReceipt: vi.fn(),
  };
});

const mockedGetPagePlan = vi.mocked(getPagePlan);
const mockedGetProseReceipt = vi.mocked(getProseReceipt);

beforeEach(() => {
  mockedGetPagePlan.mockReset();
  mockedGetProseReceipt.mockReset();
});

function pageDetail(overrides: Partial<PageDetail> = {}): PageDetail {
  return {
    page: { id: 'PG-1' },
    prose: null,
    proseStatus: 'present',
    pagePlanSummary: { path: 'pages-prose-plans/PG-1.md', body: 'Summary plan' },
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
      branchId: 'BR-1',
      branchPath: ['BR-1'],
      parentPageId: null,
      turnIndex: 1,
    },
    rawSources: [],
    ...overrides,
  };
}

function receiptBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    verdict: 'PASS',
    plan_hash: 'abc123',
    state_hash_at_plan_time: 'state123',
    checks: {
      hash_integrity: 'PASS',
      engine_jargon_leak: 'WARN',
      forbidden_mystery_resolution: 'PASS',
      required_event_rendered: 'PASS',
      choice_consequence_visibility: 'PASS',
      entity_status_consistency: 'PASS',
      invented_structural_fact: 'PASS',
      canon_claim_without_authority: 'PASS',
      char_authority_leak: 'PASS',
    },
    profile_fidelity: [
      {
        stchar_id: 'STCHAR-1',
        voice_fidelity: 'pass',
        appraisal_fidelity: 'minor_drift',
        pressure_behavior_fidelity: 'pass',
        relationship_conduct_fidelity: 'pass',
      },
    ],
    ...overrides,
  };
}

describe('PlanProseTab', () => {
  it('fetches on mount and renders the plan, receipt summary, and validation surfaces', async () => {
    mockedGetPagePlan.mockResolvedValue({
      envelope: null,
      payload: { body: '## Beat\nRender **this** page plan.', sourcePath: 'pages-prose-plans/PG-1.md' },
    });
    mockedGetProseReceipt.mockResolvedValue({
      envelope: null,
      payload: { body: receiptBody(), sourcePath: 'pages-prose-receipts/PG-1.yaml' },
    });

    render(<PlanProseTab pageDetail={pageDetail()} storySlug="red-bunny" worldSlug="fixture-world" />);

    await waitFor(() => {
      expect(mockedGetPagePlan).toHaveBeenCalledWith('fixture-world', 'red-bunny', 'PG-1');
      expect(mockedGetProseReceipt).toHaveBeenCalledWith('fixture-world', 'red-bunny', 'PG-1');
    });

    expect(screen.getByText('Plan, prose, and receipt are distinct artifacts. PG is the authoritative page snapshot.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Page Plan (rendering instructions, not reader prose)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beat' })).toBeInTheDocument();
    expect(screen.getByText('Receipt verdict: PASS')).toBeInTheDocument();
    expect(screen.getByText('State hash: PASS')).toBeInTheDocument();
    expect(screen.getByText('Plan hash: present')).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByRole('row', { name: /Hash integrity PASS/ })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /Engine-jargon leak WARN/ })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /Character authority leak PASS/ })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /STCHAR fidelity STCHAR-1/ })).toBeInTheDocument();
  });

  it('renders missing receipt and plan-hash missing states without fabricating verdicts', async () => {
    mockedGetPagePlan.mockResolvedValue({
      envelope: null,
      payload: { body: 'Plan body', sourcePath: 'pages-prose-plans/PG-1.md' },
    });
    mockedGetProseReceipt.mockResolvedValue({
      envelope: null,
      payload: { body: receiptBody({ plan_hash: undefined, checks: {} }), sourcePath: 'pages-prose-receipts/PG-1.yaml' },
    });

    render(<PlanProseTab pageDetail={pageDetail()} storySlug="red-bunny" worldSlug="fixture-world" />);

    expect(await screen.findByText('Plan hash: missing')).toBeInTheDocument();
    expect(screen.getAllByText('not-checked').length).toBeGreaterThan(0);
  });

  it('renders missing receipt responses as an explicit empty state', async () => {
    mockedGetPagePlan.mockResolvedValue({
      envelope: null,
      payload: { body: 'Plan body', sourcePath: 'pages-prose-plans/PG-1.md' },
    });
    mockedGetProseReceipt.mockRejectedValue(new ApiError(404, { error: 'not_found' }));

    render(<PlanProseTab pageDetail={pageDetail()} storySlug="red-bunny" worldSlug="fixture-world" />);

    expect(await screen.findByText('No receipt for this page.')).toBeInTheDocument();
  });
});
