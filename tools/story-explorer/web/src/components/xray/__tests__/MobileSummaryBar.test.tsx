import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { StateTickXray } from '../../../api/client';
import { MobileSummaryBar } from '../MobileSummaryBar';
import { demoStateTickXray } from './a11y-fixtures';

function tick(overrides: Partial<StateTickXray> = {}): StateTickXray {
  return demoStateTickXray({
    currentStateRecordIds: ['STCHAR-1', 'BEL-1', 'THR-1'],
    eventDelta: {
      eventId: 'SE-12',
      createCount: 2,
      supersedeCount: 1,
      closeCount: 0,
      introducedRecordIds: [],
      relationCount: 0,
    },
    ...overrides,
  });
}

describe('MobileSummaryBar', () => {
  it('renders compressed active and delta counts with grouped jump options', () => {
    render(<MobileSummaryBar tick={tick()} />);

    const summary = screen.getByLabelText('State X-Ray summary');
    expect(within(summary).getByText('3 active')).toBeInTheDocument();
    expect(within(summary).getByText('Created 2')).toBeInTheDocument();
    expect(within(summary).getByText('Superseded 1')).toBeInTheDocument();
    expect(within(summary).getByText('Closed 0')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cast & Status (1)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Knowledge & Truth (1)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Validation & Integrity (0)' })).toBeInTheDocument();
  });

  it('scrolls to the selected group anchor', () => {
    const target = document.createElement('button');
    target.id = 'xray-group-knowledge-truth';
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    render(<MobileSummaryBar tick={tick()} />);
    fireEvent.change(screen.getByLabelText('Jump to group'), { target: { value: 'xray-group-knowledge-truth' } });

    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(document.activeElement).toBe(target);
    target.remove();
  });
});
