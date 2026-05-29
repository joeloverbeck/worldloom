import { describe, it, vi } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { ChoiceSurfacePanel } from './ChoiceSurfacePanel';

describe('ChoiceSurfacePanel a11y', () => {
  it('has no accessibility violations with emitted choices', async () => {
    const { container } = renderForAxe(
      <ChoiceSurfacePanel
        choiceSurface={{
          pageId: 'PG-9',
          emittedChoices: [
            {
              choiceId: 'CHC-1',
              surfaceLabel: 'Confront the steward',
              playerVisibleIntent: 'Force the truth into the open',
              pressure: ['debt'],
              groundedInCount: 3,
            },
          ],
        }}
        onSelectPage={vi.fn()}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it('has no accessibility violations when empty', async () => {
    const { container } = renderForAxe(
      <ChoiceSurfacePanel choiceSurface={{ pageId: 'PG-9', emittedChoices: [] }} onSelectPage={vi.fn()} />,
    );
    await expectNoAxeViolations(container);
  });
});
