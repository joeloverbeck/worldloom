import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { ProsePanel } from './ProsePanel';

describe('ProsePanel a11y', () => {
  it('renders sanitized prose without axe violations', async () => {
    const { container, getByText } = renderForAxe(
      <ProsePanel
        proseStatus="present"
        eagerProseBody="The path opens toward **moonlit trees**."
        pageId="PG-12"
        branchId="BR-3"
        turnIndex={12}
        worldSlug="fixture-world"
        storySlug="red-bunny"
      />,
    );

    expect(getByText('moonlit trees')).toBeInTheDocument();
    expect(getByText('PG-12 · Branch BR-3 · Turn 12')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
