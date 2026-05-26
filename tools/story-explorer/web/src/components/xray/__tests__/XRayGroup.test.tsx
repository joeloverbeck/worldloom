import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { XRayGroup } from '../XRayGroup';
import { recordCard } from './fixtures';

describe('XRayGroup', () => {
  it('renders deterministic group chips and toggles content with disclosure ARIA', () => {
    render(
      <XRayGroup group="Knowledge & Truth" records={[recordCard(), recordCard({ recordId: 'SF-1', confidence: 'high' })]}>
        <p>Knowledge record content</p>
      </XRayGroup>,
    );

    const trigger = screen.getByRole('button', { name: 'Knowledge & Truth · 2 active · 2 hidden · 1 low-confidence' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Knowledge record content')).toBeVisible();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Knowledge record content')).not.toBeVisible();
  });
});
