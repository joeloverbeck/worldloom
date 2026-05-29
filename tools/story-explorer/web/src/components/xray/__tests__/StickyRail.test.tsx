import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { StateTickXray } from '../../../api/client';
import { StickyRail } from '../StickyRail';
import { demoStateTickXray } from './a11y-fixtures';

function tick(overrides: Partial<StateTickXray> = {}): StateTickXray {
  return demoStateTickXray({
    currentStateRecordIds: ['STCHAR-1', 'BEL-1', 'THR-1', 'SE-1'],
    eventDelta: {
      eventId: 'SE-12',
      createCount: 2,
      supersedeCount: 1,
      closeCount: 3,
      introducedRecordIds: [],
      relationCount: 0,
    },
    ...overrides,
  });
}

describe('StickyRail', () => {
  it('renders page status, grouped active-record counts, delta counts, and group anchors', () => {
    render(<StickyRail tick={tick()} />);

    expect(screen.getByText('PG-12 · BR-3')).toBeInTheDocument();
    expect(screen.getByText('Created 2 · Superseded 1 · Closed 3')).toBeInTheDocument();

    const activeRecords = screen.getByRole('heading', { name: 'Active Records' }).closest('section');
    expect(activeRecords).not.toBeNull();
    expect(within(activeRecords as HTMLElement).getByText('Cast & Status').nextSibling).toHaveTextContent('1');
    expect(within(activeRecords as HTMLElement).getByText('Knowledge & Truth').nextSibling).toHaveTextContent('1');
    expect(within(activeRecords as HTMLElement).getByText('Pressure & Open Loops').nextSibling).toHaveTextContent('1');
    expect(within(activeRecords as HTMLElement).getByText('Event Delta').nextSibling).toHaveTextContent('1');

    expect(screen.getByRole('link', { name: 'Cast & Status' })).toHaveAttribute('href', '#xray-group-cast-status');
    expect(screen.getByRole('link', { name: 'Validation & Integrity' })).toHaveAttribute(
      'href',
      '#xray-group-validation-integrity',
    );
  });
});
