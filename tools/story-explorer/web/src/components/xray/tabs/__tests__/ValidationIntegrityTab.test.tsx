import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { IndexStatus, StateTickXray } from '../../../../api/client';
import { demoStateTickXray } from '../../__tests__/a11y-fixtures';
import { ValidationIntegrityTab } from '../ValidationIntegrityTab';

function tick(overrides: Partial<StateTickXray> = {}): StateTickXray {
  return demoStateTickXray({
    pageId: 'PG-1',
    branchId: 'BR-1',
    branchPath: ['BR-1'],
    parentPageId: null,
    turnIndex: 1,
    stateHash: 'sha256-a',
    parentStateHash: 'sha256-a',
    validationTrace: {},
    ...overrides,
  });
}

describe('ValidationIntegrityTab', () => {
  it('renders a complete clean integrity picture', () => {
    render(<ValidationIntegrityTab tick={tick()} worldIndexStatus={{ kind: 'fresh', version: 1 }} />);

    expect(screen.getByRole('heading', { name: 'Validation & Integrity' })).toBeInTheDocument();
    expect(screen.getByText('State hash: sha256-a')).toBeInTheDocument();
    expect(screen.getByText('Parent state hash: sha256-a')).toBeInTheDocument();
    expect(screen.getByText('State hash status: match')).toBeInTheDocument();
    expect(screen.getByText('World index: fresh')).toBeInTheDocument();
    expect(screen.getAllByText('All checks passed.')).toHaveLength(5);
  });

  it('renders trace rows, hash mismatch, malformed records, and broken references', () => {
    render(
      <ValidationIntegrityTab
        tick={tick({
          stateHash: 'sha256-b',
          parentStateHash: 'sha256-a',
          validationTrace: {
            checks: [
              { name: 'hash_integrity', verdict: 'FAIL', rationale: 'State hash changed.' },
              { name: 'broken_reference_walk', verdict: 'WARN', notes: 'One cited record is missing.' },
            ],
            malformed_yaml_warnings: ['STENT-9'],
            skipped_records: ['BEL-2'],
            broken_refs: ['OBL-404'],
          },
        })}
        worldIndexStatus={null}
      />,
    );

    const table = screen.getByRole('table');
    expect(within(table).getByRole('row', { name: /hash_integrity FAIL State hash changed/ })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /broken_reference_walk WARN One cited record is missing/ })).toBeInTheDocument();
    expect(screen.getByText('State hash status: mismatch')).toBeInTheDocument();
    expect(screen.getByText('STENT-9')).toBeInTheDocument();
    expect(screen.getByText('BEL-2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unresolved reference OBL-404. Copy record ID.' })).toBeInTheDocument();
    expect(screen.getByText('World index: not available')).toBeInTheDocument();
  });

  it('renders stale index state with the remedy and drifted files', () => {
    const staleIndex: IndexStatus = {
      kind: 'stale',
      driftedFiles: ['stories/red-bunny/_source/pages/PG-1.yaml'],
      remedy: 'Run npm exec --prefix tools/story-explorer -- world-index sync fixture-world --quiet.',
    };

    render(<ValidationIntegrityTab tick={tick()} worldIndexStatus={staleIndex} />);

    expect(screen.getByText('World index: stale')).toBeInTheDocument();
    expect(screen.getByText('Run npm exec --prefix tools/story-explorer -- world-index sync fixture-world --quiet.')).toBeInTheDocument();
    expect(screen.getByText('stories/red-bunny/_source/pages/PG-1.yaml')).toBeInTheDocument();
  });
});
