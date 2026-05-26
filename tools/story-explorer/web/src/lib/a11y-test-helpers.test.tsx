import { describe, expect, it } from 'vitest';

import { assertHeadingHierarchy, expectNoAxeViolations, renderForAxe, withReducedMotion } from './a11y-test-helpers';

describe('a11y test helpers', () => {
  it('runs axe against routed renders', async () => {
    const { container } = renderForAxe(<button type="button">Continue</button>);

    await expectNoAxeViolations(container);
  });

  it('accepts continuous heading levels and rejects skipped levels', () => {
    const good = document.createElement('main');
    good.innerHTML = '<h1>Story</h1><section><h2>Prose</h2><h3>Records</h3></section>';
    const bad = document.createElement('main');
    bad.innerHTML = '<h1>Story</h1><section><h3>Records</h3></section>';

    expect(() => assertHeadingHierarchy(good)).not.toThrow();
    expect(() => assertHeadingHierarchy(bad)).toThrow();
  });

  it('mocks reduced-motion media queries only inside the callback', async () => {
    await withReducedMotion(() => {
      expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
      expect(window.matchMedia('(prefers-reduced-motion: no-preference)').matches).toBe(false);
    });
  });
});
