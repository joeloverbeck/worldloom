import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../../../lib/a11y-test-helpers';
import { XRayPanel } from '../XRayPanel';
import { demoIndexStatus, demoStateTickXray } from './a11y-fixtures';

describe('XRayPanel a11y', () => {
  it('renders the composed X-Ray panel without axe violations', async () => {
    const { container } = renderForAxe(
      <XRayPanel
        tick={demoStateTickXray()}
        storySlug="red-bunny"
        worldIndexStatus={demoIndexStatus()}
        worldSlug="fixture-world"
      />,
    );

    const currentTab = screen.getByRole('tab', { name: 'Current State' });
    expect(currentTab).toHaveAttribute('aria-controls', 'xray-panel-current-state');
    expect(screen.getByRole('tabpanel', { name: 'Current State' })).toHaveAttribute(
      'aria-labelledby',
      'xray-tab-current-state',
    );

    await expectNoAxeViolations(container);
  });

  it('keeps tab ARIA state in sync across keyboard navigation', async () => {
    const { container } = renderForAxe(
      <XRayPanel tick={demoStateTickXray()} storySlug="red-bunny" worldSlug="fixture-world" />,
    );

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Current State' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'What Changed Here' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'What Changed Here' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Validation & Integrity' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Validation & Integrity' }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'Current State' })).toHaveAttribute('aria-selected', 'true');

    await expectNoAxeViolations(container);
  });
});
