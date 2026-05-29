import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { EventDeltaSummary } from '../api/client';
import { StateDeltaPanel } from './StateDeltaPanel';

function delta(overrides: Partial<EventDeltaSummary> = {}): EventDeltaSummary {
  return {
    eventId: 'SE-4',
    createCount: 2,
    supersedeCount: 1,
    closeCount: 0,
    introducedRecordIds: ['STENT-7', 'BEL-3'],
    relationCount: 5,
    ...overrides,
  };
}

describe('StateDeltaPanel', () => {
  it('renders one row per event delta with its counts and introduced records', () => {
    render(<StateDeltaPanel eventDeltas={[delta()]} />);

    expect(screen.getByRole('heading', { level: 3, name: 'SE-4' })).toBeInTheDocument();
    expect(screen.getByTestId('state-delta-create')).toHaveTextContent('2');
    expect(screen.getByTestId('state-delta-supersede')).toHaveTextContent('1');
    expect(screen.getByTestId('state-delta-close')).toHaveTextContent('0');
    expect(screen.getByTestId('state-delta-relations')).toHaveTextContent('5');
    expect(screen.getByText('STENT-7')).toBeInTheDocument();
    expect(screen.getByText('BEL-3')).toBeInTheDocument();
  });

  it('labels a delta with no resolving event', () => {
    render(<StateDeltaPanel eventDeltas={[delta({ eventId: null, introducedRecordIds: [] })]} />);

    expect(screen.getByRole('heading', { level: 3, name: 'no resolving event' })).toBeInTheDocument();
  });

  it('renders an empty state when there are no deltas', () => {
    render(<StateDeltaPanel eventDeltas={[]} />);

    expect(screen.getByText("No event deltas in this scene's page range.")).toBeInTheDocument();
  });
});
