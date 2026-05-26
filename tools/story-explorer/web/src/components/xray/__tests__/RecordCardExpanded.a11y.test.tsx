import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, withReducedMotion } from '../../../lib/a11y-test-helpers';
import { RecordCardExpanded } from '../RecordCardExpanded';
import { card } from './a11y-fixtures';

describe('RecordCardExpanded a11y', () => {
  it('uses disclosure ARIA for expanded fields and hybrid body sections', async () => {
    const { container } = render(
      <RecordCardExpanded
        provenanceSlot={<p>Bootstrap provenance</p>}
        recordBody="## Voice\nQuiet and precise."
        recordCard={card('STCHAR-1', 'Cast & Status', { rawAvailable: true, recordClass: 'STCHAR' })}
        storyContext={{ worldSlug: 'fixture-world', storySlug: 'red-bunny' }}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Expand record' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'View raw record' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(/Voice/)).toBeInTheDocument();

    await expectNoAxeViolations(container);
  });

  it('stays axe-clean when reduced motion is requested', async () => {
    await withReducedMotion(async () => {
      const { container } = render(
        <RecordCardExpanded
          provenanceSlot={<p>Bootstrap provenance</p>}
          recordCard={card()}
          storyContext={{ worldSlug: 'fixture-world', storySlug: 'red-bunny' }}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Expand record' }));
      await expectNoAxeViolations(container);
    });
  });
});
