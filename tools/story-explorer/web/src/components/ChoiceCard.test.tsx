import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { ChildOutcomeVariant as ChildOutcomeVariantModel, ChoiceNavigation } from '../api/client';
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
    pressure: ['scarcity', 'rivalry'],
    groundedInCount: 2,
    childOutcomeVariants: [variant()],
    isNavigable: true,
    ...overrides,
  };
}

function renderChoice(choiceModel: ChoiceNavigation): void {
  render(
    <MemoryRouter>
      <ChoiceCard choice={choiceModel} worldSlug="fixture-world" storySlug="red-bunny" />
    </MemoryRouter>,
  );
}

describe('ChoiceCard', () => {
  it('renders a single-variant choice as a page link', () => {
    renderChoice(choice());

    const link = screen.getByRole('link', { name: /Follow the trail/i });
    expect(link).toHaveAttribute('href', '/worlds/fixture-world/stories/red-bunny/pages/PG-13');
    expect(screen.getByText('Investigate the woods')).toBeInTheDocument();
    expect(screen.getByText('scarcity')).toBeInTheDocument();
    expect(screen.getByText('rivalry')).toBeInTheDocument();
    expect(screen.getByText('Grounded in 2 records')).toBeInTheDocument();
  });

  it('expands multi-variant choices with one link per child outcome', () => {
    renderChoice(
      choice({
        childOutcomeVariants: [
          variant({ pageId: 'PG-13', branchId: 'BR-3', outcomeRoute: 'success' }),
          variant({ pageId: 'PG-14', branchId: 'BR-4', outcomeRoute: null, resolutionPreview: 'A harder path opens.' }),
        ],
      }),
    );

    const button = screen.getByRole('button', { name: /Follow the trail/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /PG-13/i })).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /PG-13 BR-3 success/i })).toHaveAttribute(
      'href',
      '/worlds/fixture-world/stories/red-bunny/pages/PG-13',
    );
    expect(screen.getByRole('link', { name: /PG-14 BR-4 A harder path opens/i })).toHaveAttribute(
      'href',
      '/worlds/fixture-world/stories/red-bunny/pages/PG-14',
    );
  });

  it('does not expose creation or continuation actions', () => {
    renderChoice(choice());

    const card = screen.getByRole('link', { name: /Follow the trail/i });
    expect(within(card).queryByText(/continue story|generate next|create page/i)).not.toBeInTheDocument();
  });
});
