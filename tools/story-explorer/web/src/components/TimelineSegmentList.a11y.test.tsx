import { describe, it, vi } from 'vitest';

import type { TimelineSegment } from '../api/client';
import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { TimelineSegmentList } from './TimelineSegmentList';

const segments: TimelineSegment[] = [
  {
    kind: 'scene_segment',
    sceneId: 'SCN-1',
    pageIds: ['PG-1', 'PG-2'],
    startPageId: 'PG-1',
    endPageId: 'PG-2',
    publicationState: 'prose-present',
    focused: false,
  },
  { kind: 'unscened_run', pageIds: ['PG-3'], startPageId: 'PG-3', endPageId: 'PG-3', focused: false },
  {
    kind: 'choice_surface',
    pageId: 'PG-3',
    choiceSurface: { pageId: 'PG-3', emittedChoices: [] },
    focused: false,
  },
  { kind: 'branch_split', pageId: 'PG-3', childBranchIds: ['BR-2'], focused: false },
  { kind: 'terminal_marker', pageId: 'PG-4', reason: 'paused', focused: false },
];

describe('TimelineSegmentList a11y', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderForAxe(<TimelineSegmentList segments={segments} onSelectPage={vi.fn()} />);
    await expectNoAxeViolations(container);
  });
});
