import { describe, it, vi } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { SceneSegmentCard } from './SceneSegmentCard';

describe('SceneSegmentCard a11y', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderForAxe(
      <SceneSegmentCard
        segment={{
          kind: 'scene_segment',
          sceneId: 'SCN-3',
          pageIds: ['PG-4', 'PG-5'],
          startPageId: 'PG-4',
          endPageId: 'PG-5',
          publicationState: 'attached:WARN',
          focused: true,
        }}
        onSelectPage={vi.fn()}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
