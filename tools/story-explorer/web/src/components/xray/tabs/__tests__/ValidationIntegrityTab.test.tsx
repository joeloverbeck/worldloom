import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { IndexStatus, PageDetail } from '../../../../api/client';
import { ValidationIntegrityTab } from '../ValidationIntegrityTab';

function pageDetail(overrides: Partial<PageDetail> = {}): PageDetail {
  return {
    page: { id: 'PG-1' },
    prose: null,
    proseStatus: 'present',
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
      receiptPresence: 'present',
      stateHashStatus: 'match',
      planHashStatus: 'present',
      malformedYamlWarnings: [],
      skippedRecords: [],
      brokenRefs: [],
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

describe('ValidationIntegrityTab', () => {
  it('renders a complete clean integrity picture', () => {
    render(<ValidationIntegrityTab pageDetail={pageDetail()} worldIndexStatus={{ kind: 'fresh', version: 1 }} />);

    expect(screen.getByRole('heading', { name: 'Validation & Integrity' })).toBeInTheDocument();
    expect(screen.getByText('Receipt presence: present')).toBeInTheDocument();
    expect(screen.getByText('Receipt verdict: PASS')).toBeInTheDocument();
    expect(screen.getByText('State hash: match')).toBeInTheDocument();
    expect(screen.getByText('Plan hash: present')).toBeInTheDocument();
    expect(screen.getByText('World index: fresh')).toBeInTheDocument();
    expect(screen.getAllByText('All checks passed.')).toHaveLength(5);
  });

  it('renders trace rows, hash mismatch, malformed records, and broken references', () => {
    render(
      <ValidationIntegrityTab
        pageDetail={pageDetail({
          validationIntegrity: {
            validationTrace: {
              checks: [
                { name: 'hash_integrity', verdict: 'FAIL', rationale: 'State hash changed.' },
                { name: 'broken_reference_walk', verdict: 'WARN', notes: 'One cited record is missing.' },
              ],
            },
            receiptVerdict: 'reject',
            proseStatus: 'hash_mismatch',
            receiptPresence: 'present',
            stateHashStatus: 'mismatch',
            planHashStatus: 'missing',
            malformedYamlWarnings: ['STENT-9'],
            skippedRecords: ['BEL-2'],
            brokenRefs: ['OBL-404'],
          },
        })}
        worldIndexStatus={null}
      />,
    );

    const table = screen.getByRole('table');
    expect(within(table).getByRole('row', { name: /hash_integrity FAIL State hash changed/ })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /broken_reference_walk WARN One cited record is missing/ })).toBeInTheDocument();
    expect(screen.getByText('Receipt verdict: reject')).toBeInTheDocument();
    expect(screen.getByText('State hash: mismatch')).toBeInTheDocument();
    expect(screen.getByText('Plan hash: missing')).toBeInTheDocument();
    expect(screen.getByText('STENT-9')).toBeInTheDocument();
    expect(screen.getByText('BEL-2')).toBeInTheDocument();
    expect(screen.getByText('OBL-404')).toBeInTheDocument();
    expect(screen.getByText('World index: not available')).toBeInTheDocument();
  });

  it('renders stale index state with the remedy and drifted files', () => {
    const staleIndex: IndexStatus = {
      kind: 'stale',
      driftedFiles: ['stories/red-bunny/_source/pages/PG-1.yaml'],
      remedy: 'Run world-index sync fixture-world.',
    };

    render(<ValidationIntegrityTab pageDetail={pageDetail()} worldIndexStatus={staleIndex} />);

    expect(screen.getByText('World index: stale')).toBeInTheDocument();
    expect(screen.getByText('Run world-index sync fixture-world.')).toBeInTheDocument();
    expect(screen.getByText('stories/red-bunny/_source/pages/PG-1.yaml')).toBeInTheDocument();
  });
});
