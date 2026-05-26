import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '../../../../lib/a11y-test-helpers';
import { WhatChangedHereTab } from '../WhatChangedHereTab';
import { card, demoPageDetail, recordResponse } from '../../__tests__/a11y-fixtures';

describe('WhatChangedHereTab a11y', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the event-delta tab without axe violations', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(recordResponse(card('SE-12', 'Event Delta')))));

    const { container } = render(
      <WhatChangedHereTab
        pageDetail={demoPageDetail({
          page: { id: 'PG-12', input: { resolved_event_id: 'SE-12' } },
          eventDelta: { eventId: 'SE-12', createCount: 1, supersedeCount: 0, closeCount: 0, introducedRecordIds: [], relationCount: 0 },
        })}
        storySlug="red-bunny"
        worldSlug="fixture-world"
      />,
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: 'State Delta' })).toBeInTheDocument());
    expect(screen.getByText('Causal event and state changes for the current page.')).toBeInTheDocument();

    await expectNoAxeViolations(container);
  });
});
