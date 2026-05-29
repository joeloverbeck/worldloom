import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TimelineSegment } from '../api/client';
import { TimelineSegmentList } from './TimelineSegmentList';

function allKindsFixture(): TimelineSegment[] {
  return [
    {
      kind: 'scene_segment',
      sceneId: 'SCN-1',
      pageIds: ['PG-1', 'PG-2'],
      startPageId: 'PG-1',
      endPageId: 'PG-2',
      publicationState: 'attached:PASS',
      focused: false,
    },
    {
      kind: 'unscened_run',
      pageIds: ['PG-3', 'PG-4'],
      startPageId: 'PG-3',
      endPageId: 'PG-4',
      focused: false,
    },
    {
      kind: 'choice_surface',
      pageId: 'PG-4',
      choiceSurface: {
        pageId: 'PG-4',
        emittedChoices: [
          {
            choiceId: 'CHC-1',
            surfaceLabel: 'Press on',
            playerVisibleIntent: 'Keep moving',
            pressure: ['urgency'],
            groundedInCount: 2,
          },
        ],
      },
      focused: false,
    },
    {
      kind: 'branch_split',
      pageId: 'PG-4',
      childBranchIds: ['BR-2', 'BR-3'],
      focused: false,
    },
    {
      kind: 'terminal_marker',
      pageId: 'PG-5',
      reason: 'terminal',
      focused: false,
    },
  ];
}

describe('TimelineSegmentList', () => {
  it('renders all five segment kinds in order', () => {
    render(<TimelineSegmentList segments={allKindsFixture()} onSelectPage={vi.fn()} />);

    // scene_segment
    expect(screen.getByRole('heading', { level: 3, name: 'SCN-1' })).toBeInTheDocument();
    // unscened_run
    expect(screen.getByLabelText('Unscened run PG-3–PG-4')).toBeInTheDocument();
    // choice_surface
    expect(screen.getByText('Press on')).toBeInTheDocument();
    // branch_split
    expect(screen.getByLabelText('Branch split at PG-4')).toBeInTheDocument();
    expect(screen.getByText('BR-2')).toBeInTheDocument();
    expect(screen.getByText('BR-3')).toBeInTheDocument();
    // terminal_marker
    expect(screen.getByLabelText('Terminal marker at PG-5')).toBeInTheDocument();
    expect(screen.getByText('Terminal page per PG metadata.')).toBeInTheDocument();
  });

  it('renders an empty state when there are no segments', () => {
    render(<TimelineSegmentList segments={[]} onSelectPage={vi.fn()} />);
    expect(screen.getByText('No timeline segments for this branch.')).toBeInTheDocument();
  });

  it('forwards PG-tick clicks from any segment kind to onSelectPage', () => {
    const onSelectPage = vi.fn();
    render(<TimelineSegmentList segments={allKindsFixture()} onSelectPage={onSelectPage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Inspect state tick PG-1' }));
    expect(onSelectPage).toHaveBeenCalledWith('PG-1');

    fireEvent.click(screen.getByRole('button', { name: 'Inspect state tick PG-5' }));
    expect(onSelectPage).toHaveBeenCalledWith('PG-5');
  });
});
