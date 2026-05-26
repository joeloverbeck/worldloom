import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ChildOutcomeVariant as ChildOutcomeVariantModel, ChoiceNavigation } from '../api/client';
import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { ChoiceCard } from './ChoiceCard';

function variant(overrides: Partial<ChildOutcomeVariantModel> = {}): ChildOutcomeVariantModel {
  return {
    pageId: 'PG-13',
    branchId: 'BR-3',
    turnIndex: 13,
    resolvedEventId: 'SE-13',
    outcomeRoute: 'success',
    resolutionPreview: 'The path opens.',
    selectedStoryletId: null,
    hasRenderedProse: true,
    stateDeltaCounts: { create: 1, supersede: 0, close: 0 },
    ...overrides,
  };
}

function choice(overrides: Partial<ChoiceNavigation> = {}): ChoiceNavigation {
  return {
    choiceId: 'CHC-1',
    surfaceLabel: 'Follow the trail',
    playerVisibleIntent: 'Investigate the woods',
    pressure: ['scarcity'],
    groundedInCount: 2,
    childOutcomeVariants: [variant()],
    isNavigable: true,
    ...overrides,
  };
}

describe('ChoiceCard a11y', () => {
  it('has no violations as a single-variant link', async () => {
    const { container, getByRole } = renderForAxe(
      <ChoiceCard choice={choice()} worldSlug="fixture-world" storySlug="red-bunny" />,
    );

    expect(getByRole('link', { name: /Follow the trail/ })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('has no violations when the multi-variant disclosure is expanded', async () => {
    const { container, getByRole } = renderForAxe(
      <ChoiceCard
        choice={choice({
          childOutcomeVariants: [
            variant({ pageId: 'PG-13', branchId: 'BR-3', outcomeRoute: 'success' }),
            variant({ pageId: 'PG-14', branchId: 'BR-4', outcomeRoute: null, resolutionPreview: 'A harder path opens.' }),
          ],
        })}
        worldSlug="fixture-world"
        storySlug="red-bunny"
      />,
    );

    const trigger = getByRole('button', { name: /Follow the trail/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expectNoAxeViolations(container);
  });
});
