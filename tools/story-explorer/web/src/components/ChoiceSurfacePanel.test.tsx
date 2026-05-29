import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ChoiceSurface } from '../api/client';
import { ChoiceSurfacePanel } from './ChoiceSurfacePanel';

function buildChoiceSurface(overrides: Partial<ChoiceSurface> = {}): ChoiceSurface {
  return {
    pageId: 'PG-9',
    emittedChoices: [
      {
        choiceId: 'CHC-1',
        surfaceLabel: 'Confront the steward',
        playerVisibleIntent: 'Force the truth into the open',
        pressure: ['debt', 'shame'],
        groundedInCount: 3,
      },
    ],
    ...overrides,
  };
}

describe('ChoiceSurfacePanel', () => {
  it('renders the end-PG tick and each emitted choice with intent, pressure, and grounding', () => {
    render(<ChoiceSurfacePanel choiceSurface={buildChoiceSurface()} onSelectPage={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Inspect state tick PG-9' })).toBeInTheDocument();
    expect(screen.getByText('Confront the steward')).toBeInTheDocument();
    expect(screen.getByText('Force the truth into the open')).toBeInTheDocument();
    expect(screen.getByText('debt')).toBeInTheDocument();
    expect(screen.getByText('shame')).toBeInTheDocument();
    expect(screen.getByText('Grounded in 3 records')).toBeInTheDocument();
  });

  it('singularizes grounding for a single record', () => {
    render(
      <ChoiceSurfacePanel
        choiceSurface={buildChoiceSurface({
          emittedChoices: [
            {
              choiceId: 'CHC-2',
              surfaceLabel: 'Wait',
              playerVisibleIntent: 'Let it pass',
              pressure: [],
              groundedInCount: 1,
            },
          ],
        })}
        onSelectPage={vi.fn()}
      />,
    );
    expect(screen.getByText('Grounded in 1 record')).toBeInTheDocument();
  });

  it('shows an empty state when no choices are emitted', () => {
    render(<ChoiceSurfacePanel choiceSurface={buildChoiceSurface({ emittedChoices: [] })} onSelectPage={vi.fn()} />);
    expect(screen.getByText('No choices emitted at this page.')).toBeInTheDocument();
  });

  it('invokes onSelectPage with the end-PG when its tick is clicked', () => {
    const onSelectPage = vi.fn();
    render(<ChoiceSurfacePanel choiceSurface={buildChoiceSurface()} onSelectPage={onSelectPage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Inspect state tick PG-9' }));
    expect(onSelectPage).toHaveBeenCalledWith('PG-9');
  });
});
