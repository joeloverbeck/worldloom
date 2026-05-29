import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../../../../lib/a11y-test-helpers';
import { XRayPanel } from '../../XRayPanel';
import { demoIndexStatus, demoStateTickXray } from '../../__tests__/a11y-fixtures';

describe('all X-Ray tabs a11y', () => {
  it('cycles across all tabs with resolvable tab-panel relationships', async () => {
    const { container } = renderForAxe(
      <XRayPanel
        tick={demoStateTickXray()}
        storySlug="red-bunny"
        worldIndexStatus={demoIndexStatus()}
        worldSlug="fixture-world"
      />,
    );

    const tabNames = ['Current State', 'What Changed Here', 'Validation & Integrity'] as const;
    for (const tabName of tabNames) {
      const tab = screen.getByRole('tab', { name: tabName });
      const panelId = tab.getAttribute('aria-controls');
      expect(panelId).toBeTruthy();
      expect(document.getElementById(panelId!)).toHaveAttribute('role', 'tabpanel');
    }

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Current State' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'What Changed Here' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'What Changed Here' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Validation & Integrity' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Validation & Integrity' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Current State' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Current State' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Validation & Integrity' })).toHaveAttribute('aria-selected', 'true');

    await expectNoAxeViolations(container);
  });
});
