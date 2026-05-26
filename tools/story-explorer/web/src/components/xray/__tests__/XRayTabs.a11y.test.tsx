import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '../../../lib/a11y-test-helpers';
import { XRayTabs } from '../XRayTabs';

describe('XRayTabs a11y', () => {
  it('uses the WAI-ARIA tablist roles and keyboard contract', async () => {
    const onTabChange = vi.fn();
    const { container } = render(
      <>
        <XRayTabs activeTab="current-state" onTabChange={onTabChange} />
        <div aria-labelledby="xray-tab-current-state" id="xray-panel-current-state" role="tabpanel" />
        <div aria-labelledby="xray-tab-what-changed" hidden id="xray-panel-what-changed" role="tabpanel" />
        <div aria-labelledby="xray-tab-plan-prose" hidden id="xray-panel-plan-prose" role="tabpanel" />
        <div aria-labelledby="xray-tab-validation" hidden id="xray-panel-validation" role="tabpanel" />
      </>,
    );

    const tablist = screen.getByRole('tablist', { name: 'State X-Ray tabs' });
    expect(tablist).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Current State' })).toHaveAttribute('tabIndex', '0');
    expect(screen.getByRole('tab', { name: 'What Changed Here' })).toHaveAttribute('tabIndex', '-1');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Current State' }), { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenCalledWith('what-changed');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Current State' }), { key: 'End' });
    expect(onTabChange).toHaveBeenCalledWith('validation');

    await expectNoAxeViolations(container);
  });
});
