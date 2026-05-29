import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SceneCoverageCounts, UnscenedRunCounts } from '../api/client';
import { CoveragePanel } from './CoveragePanel';

function availableScenes(overrides: Partial<SceneCoverageCounts> = {}): SceneCoverageCounts {
  return {
    status: 'available',
    activeSceneCount: 4,
    supersededSceneCount: 1,
    totalSceneCount: 5,
    ...overrides,
  };
}

function availableUnscened(overrides: Partial<UnscenedRunCounts> = {}): UnscenedRunCounts {
  return {
    status: 'available',
    runCount: 2,
    pageCount: 7,
    ...overrides,
  };
}

describe('CoveragePanel', () => {
  it('renders the backend-supplied active/superseded/total scene counts and unscened run counts', () => {
    render(
      <CoveragePanel sceneCoverageCounts={availableScenes()} unscenedRunCounts={availableUnscened()} />,
    );

    expect(screen.getByTestId('coverage-active-scenes')).toHaveTextContent('4');
    expect(screen.getByTestId('coverage-superseded-scenes')).toHaveTextContent('1');
    expect(screen.getByTestId('coverage-total-scenes')).toHaveTextContent('5');
    expect(screen.getByTestId('coverage-unscened-runs')).toHaveTextContent('2');
    expect(screen.getByTestId('coverage-unscened-pages')).toHaveTextContent('7');
  });

  it('does not render any automatic scene-boundary recommender control', () => {
    render(
      <CoveragePanel sceneCoverageCounts={availableScenes()} unscenedRunCounts={availableUnscened()} />,
    );

    // No "suggest boundary" affordance of any kind.
    expect(screen.queryByRole('button', { name: /suggest/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /boundary/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/suggest boundary/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recommend/i)).not.toBeInTheDocument();
    // The panel surfaces only counts — no actionable controls at all.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a degraded indicator and does not fabricate scene counts when scene status is degraded', () => {
    render(
      <CoveragePanel
        sceneCoverageCounts={{
          status: 'degraded',
          activeSceneCount: null,
          supersededSceneCount: null,
          totalSceneCount: null,
        }}
        unscenedRunCounts={availableUnscened()}
      />,
    );

    expect(screen.getByText(/Scene coverage unavailable/i)).toBeInTheDocument();
    expect(screen.queryByTestId('coverage-active-scenes')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coverage-total-scenes')).not.toBeInTheDocument();
    // Unscened side still renders its real counts.
    expect(screen.getByTestId('coverage-unscened-runs')).toHaveTextContent('2');
  });

  it('shows a degraded indicator for unscened runs without inventing counts', () => {
    render(
      <CoveragePanel
        sceneCoverageCounts={availableScenes()}
        unscenedRunCounts={{ status: 'degraded', runCount: null, pageCount: null }}
      />,
    );

    expect(screen.getByText(/Unscened-run coverage unavailable/i)).toBeInTheDocument();
    expect(screen.queryByTestId('coverage-unscened-runs')).not.toBeInTheDocument();
    expect(screen.getByTestId('coverage-active-scenes')).toHaveTextContent('4');
  });
});
