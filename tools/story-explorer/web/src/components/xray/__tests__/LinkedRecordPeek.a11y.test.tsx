import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '../../../lib/a11y-test-helpers';
import { LinkedRecordPeek } from '../LinkedRecordPeek';
import { recordResponse } from './a11y-fixtures';

describe('LinkedRecordPeek a11y', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('focuses a labelled peek panel and closes on Escape', async () => {
    const onClose = vi.fn();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(recordResponse())));

    const { container } = render(
      <LinkedRecordPeek onClose={onClose} recordId="BEL-1" storySlug="red-bunny" worldSlug="fixture-world" />,
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Linked Record' })).toBeInTheDocument());
    expect(screen.getByText('Not active on this page')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    await expectNoAxeViolations(container);
  });
});
