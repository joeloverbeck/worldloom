import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { ChildOutcomeVariant as ChildOutcomeVariantModel } from '../api/client';
import { ChildOutcomeVariant } from './ChildOutcomeVariant';

function variant(overrides: Partial<ChildOutcomeVariantModel> = {}): ChildOutcomeVariantModel {
  return {
    pageId: 'PG-13',
    branchId: 'BR-3',
    turnIndex: 13,
    resolvedEventId: 'SE-13',
    outcomeRoute: 'success',
    resolutionPreview: 'She reaches the orchard.',
    selectedStoryletId: null,
    hasRenderedProse: true,
    stateDeltaCounts: { create: 1, supersede: 0, close: 0 },
    ...overrides,
  };
}

describe('ChildOutcomeVariant', () => {
  it('renders a clickable row for the child page', () => {
    render(
      <MemoryRouter>
        <ChildOutcomeVariant variant={variant()} worldSlug="fixture-world" storySlug="red-bunny" />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /PG-13 BR-3 success/i });
    expect(link).toHaveAttribute('href', '/worlds/fixture-world/stories/red-bunny/pages/PG-13');
  });

  it('falls back to resolution preview when no route label exists', () => {
    render(
      <MemoryRouter>
        <ChildOutcomeVariant
          variant={variant({ outcomeRoute: null, resolutionPreview: 'She chooses the hidden trail.' })}
          worldSlug="fixture-world"
          storySlug="red-bunny"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /She chooses the hidden trail/i })).toBeInTheDocument();
  });
});
