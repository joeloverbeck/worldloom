import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActiveRecordsPanel } from './ActiveRecordsPanel';

describe('ActiveRecordsPanel', () => {
  it('groups active-record class counts by the shared x-ray taxonomy', () => {
    render(
      <ActiveRecordsPanel activeRecordCounts={{ STENT: 2, BEL: 1, SREL: 3 }} pageId="PG-5" />,
    );

    expect(screen.getByText('Active at PG-5 · 6 records')).toBeInTheDocument();

    const groups = screen.getAllByTestId('active-records-group');
    expect(groups.length).toBe(3);
    expect(screen.getByText('STENT · 2')).toBeInTheDocument();
    expect(screen.getByText('BEL · 1')).toBeInTheDocument();
    expect(screen.getByText('SREL · 3')).toBeInTheDocument();

    // STENT is in Cast & Status; BEL in Knowledge & Truth; SREL in Relationships & Debts.
    expect(screen.getByText('Cast & Status')).toBeInTheDocument();
    expect(screen.getByText('Knowledge & Truth')).toBeInTheDocument();
    expect(screen.getByText('Relationships & Debts')).toBeInTheDocument();
  });

  it('ignores zero counts and renders an empty state when nothing is active', () => {
    render(<ActiveRecordsPanel activeRecordCounts={{ STENT: 0 }} pageId="PG-5" />);

    expect(screen.getByText('No active records at this page.')).toBeInTheDocument();
    expect(screen.queryByTestId('active-records-group')).not.toBeInTheDocument();
  });

  it('labels the caption generically when no page is focused', () => {
    render(<ActiveRecordsPanel activeRecordCounts={{}} pageId={null} />);

    expect(screen.getByText('Active state · 0 records')).toBeInTheDocument();
  });
});
