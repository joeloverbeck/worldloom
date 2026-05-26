import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '../../../../lib/a11y-test-helpers';
import { CurrentStateTab } from '../CurrentStateTab';
import { card, demoPageDetail, recordResponse } from '../../__tests__/a11y-fixtures';

describe('CurrentStateTab a11y', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders fetched X-Ray groups without axe violations', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(recordResponse(card('BEL-1')))));

    const { container } = render(
      <CurrentStateTab
        pageDetail={demoPageDetail({ currentStateRecordIds: ['BEL-1'] })}
        storySlug="red-bunny"
        worldSlug="fixture-world"
      />,
    );

    await waitFor(() => expect(screen.getByRole('article', { name: /BEL-1/ })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Knowledge & Truth · 1 active' })).toHaveAttribute('aria-expanded', 'true');

    await expectNoAxeViolations(container);
  });
});
