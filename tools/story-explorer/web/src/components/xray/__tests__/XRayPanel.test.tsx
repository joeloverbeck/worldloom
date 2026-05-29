import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { StateTickXray } from '../../../api/client';
import { XRayPanel } from '../XRayPanel';
import { demoStateTickXray } from './a11y-fixtures';

function tick(overrides: Partial<StateTickXray> = {}): StateTickXray {
  return demoStateTickXray({
    eventDelta: {
      eventId: 'SE-12',
      createCount: 1,
      supersedeCount: 0,
      closeCount: 0,
      introducedRecordIds: ['BEL-1'],
      relationCount: 2,
    },
    ...overrides,
  });
}

describe('XRayPanel', () => {
  function renderPanel(detail: StateTickXray): void {
    render(
      <MemoryRouter>
        <XRayPanel tick={detail} storySlug="red-bunny" worldSlug="fixture-world" />
      </MemoryRouter>,
    );
  }

  it('renders the three X-Ray tabs with Current State selected by default', () => {
    renderPanel(tick());

    const tablist = screen.getByRole('tablist', { name: 'State X-Ray tabs' });
    const tabs = within(tablist).getAllByRole('tab');

    expect(tabs).toHaveLength(3);
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Current State',
      'What Changed Here',
      'Validation & Integrity',
    ]);
    expect(screen.getByRole('tab', { name: 'Current State' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Current State' })).toHaveTextContent('0 active records.');
  });

  it('cycles keyboard focus and selection through the tabs', () => {
    renderPanel(
      tick({
        resolvedEventId: null,
        eventDelta: {
          eventId: null,
          createCount: 0,
          supersedeCount: 0,
          closeCount: 0,
          introducedRecordIds: [],
          relationCount: 0,
        },
      }),
    );

    const currentState = screen.getByRole('tab', { name: 'Current State' });
    fireEvent.keyDown(currentState, { key: 'ArrowRight' });

    expect(screen.getByRole('tab', { name: 'What Changed Here' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'What Changed Here' })).toHaveTextContent('No causal event for this page');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'What Changed Here' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Validation & Integrity' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Validation & Integrity' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'What Changed Here' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'What Changed Here' }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'Current State' })).toHaveAttribute('aria-selected', 'true');
  });
});
