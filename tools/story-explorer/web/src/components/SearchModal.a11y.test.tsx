import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../lib/a11y-test-helpers';
import { SearchRoute } from '../routes/search';

function renderSearchRoute(): void {
  render(
    <MemoryRouter initialEntries={['/worlds/fixture-world/stories/red-bunny/search']}>
      <Routes>
        <Route path="/worlds/:slug/stories/:storySlug/search" element={<SearchRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SearchModal a11y', () => {
  it('opens an accessible modal dialog without axe violations', async () => {
    renderSearchRoute();
    fireEvent.click(screen.getByRole('button', { name: 'Open search' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    await expectNoAxeViolations(dialog);
  });

  it('moves focus into the modal on open', async () => {
    renderSearchRoute();
    fireEvent.click(screen.getByRole('button', { name: 'Open search' }));

    await waitFor(() => expect(screen.getByLabelText('Query')).toHaveFocus());
  });

  it('closes on Escape and returns focus to the invoking trigger', async () => {
    renderSearchRoute();
    const trigger = screen.getByRole('button', { name: 'Open search' });
    // jsdom click does not move focus the way a browser does; focus the invoker
    // first so the modal captures it as the return target.
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('traps Tab focus within the dialog', async () => {
    renderSearchRoute();
    fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
    await screen.findByRole('dialog');

    // Focus the last focusable control inside the dialog panel and Tab forward —
    // focus must wrap to the first focusable element (the Close button), not
    // escape the dialog.
    const close = screen.getByRole('button', { name: 'Close' });
    const submit = screen.getByRole('button', { name: 'Search' });
    submit.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(document.activeElement).toBe(close);
  });
});
