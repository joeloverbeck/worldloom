import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RecordCardCompact } from '../RecordCardCompact';
import { RecordCardExpanded } from '../RecordCardExpanded';
import { recordCard } from './fixtures';

describe('RecordCard primitives', () => {
  it('renders compact fallback summary, chips, provenance, and related-record count', () => {
    render(<RecordCardCompact recordCard={recordCard()} />);

    expect(screen.getByRole('article', { name: 'BEL-1 · BEL' })).toBeInTheDocument();
    expect(screen.getByText('Lyra believes the gate is watched')).toBeInTheDocument();
    expect(screen.getByText('Status: active')).toBeInTheDocument();
    expect(screen.getByText('Visibility: hidden')).toBeInTheDocument();
    expect(screen.getByText('Confidence: low')).toBeInTheDocument();
    expect(screen.getByText('Created at PG-1')).toBeInTheDocument();
    expect(screen.getByText('1 related')).toBeInTheDocument();
  });

  it('expands deterministic fields, related links, provenance slot, and raw disclosure lazily', () => {
    render(
      <RecordCardExpanded
        provenanceSlot={<p>Created by SE-1 at PG-1</p>}
        recordCard={recordCard()}
        storyContext={{ worldSlug: 'demo-world', storySlug: 'demo-story' }}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Expand record' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Holder')).toBeInTheDocument();
    expect(screen.getByText('STCHAR-1')).toBeInTheDocument();
    expect(screen.getByText('Created by SE-1 at PG-1')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Related records')).getByText('Gate watch fact')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View raw record' })).toBeInTheDocument();
  });
});
