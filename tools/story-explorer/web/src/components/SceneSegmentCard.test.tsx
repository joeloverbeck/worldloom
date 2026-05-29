import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SceneTimelineSegment } from '../api/client';
import { SceneSegmentCard } from './SceneSegmentCard';

function buildSegment(overrides: Partial<SceneTimelineSegment> = {}): SceneTimelineSegment {
  return {
    kind: 'scene_segment',
    sceneId: 'SCN-3',
    pageIds: ['PG-4', 'PG-5', 'PG-6'],
    startPageId: 'PG-4',
    endPageId: 'PG-6',
    publicationState: 'attached:PASS',
    focused: false,
    ...overrides,
  };
}

describe('SceneSegmentCard', () => {
  it('renders the scene id, publication chip, range, and a tick per page', () => {
    render(<SceneSegmentCard segment={buildSegment()} onSelectPage={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 3, name: 'SCN-3' })).toBeInTheDocument();
    expect(screen.getByTestId('publication-chip')).toHaveTextContent('attached:PASS');
    expect(screen.getByText('PG-4 → PG-6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inspect state tick PG-4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inspect state tick PG-5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inspect state tick PG-6' })).toBeInTheDocument();
  });

  it('invokes onSelectPage with the clicked tick page id', () => {
    const onSelectPage = vi.fn();
    render(<SceneSegmentCard segment={buildSegment()} onSelectPage={onSelectPage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Inspect state tick PG-5' }));
    expect(onSelectPage).toHaveBeenCalledWith('PG-5');
  });

  it('renders each publication state', () => {
    const { rerender } = render(
      <SceneSegmentCard segment={buildSegment({ publicationState: 'superseded' })} onSelectPage={vi.fn()} />,
    );
    expect(screen.getByTestId('publication-chip')).toHaveTextContent('superseded');

    rerender(<SceneSegmentCard segment={buildSegment({ publicationState: 'planned' })} onSelectPage={vi.fn()} />);
    expect(screen.getByTestId('publication-chip')).toHaveTextContent('planned');
  });
});
