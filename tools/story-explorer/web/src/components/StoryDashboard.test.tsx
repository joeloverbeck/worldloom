import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { StoryOverview } from '../api/client';
import { StoryDashboard } from './StoryDashboard';

function buildOverview(overrides: Partial<StoryOverview> = {}): StoryOverview {
  return {
    worldSlug: 'aurelia',
    storySlug: 'the-gathering',
    storyId: 'STORY-1',
    title: 'The Gathering',
    rootPageId: 'PG-1',
    latestPageId: 'PG-12',
    branchCount: 2,
    pageCount: 12,
    choiceCount: 8,
    branches: [
      {
        branchId: 'BR-1',
        rootPageId: 'PG-1',
        latestPageId: 'PG-9',
        latestScene: { sceneId: 'SCN-3', publicationState: 'attached:PASS' },
      },
      {
        branchId: 'BR-2',
        rootPageId: 'PG-5',
        latestPageId: 'PG-12',
        latestScene: null,
      },
    ],
    sceneCoverageCounts: {
      status: 'available',
      activeSceneCount: 4,
      supersededSceneCount: 1,
      totalSceneCount: 5,
    },
    unscenedRunCounts: { status: 'available', runCount: 2, pageCount: 7 },
    indexStatus: { kind: 'fresh', version: 1 },
    degradedDirectRead: false,
    ...overrides,
  };
}

describe('StoryDashboard', () => {
  it('renders the story header with branch/page/choice counts', () => {
    render(<StoryDashboard overview={buildOverview()} indexStatusBanner={null} />);

    expect(screen.getByRole('heading', { level: 1, name: 'The Gathering' })).toBeInTheDocument();
    const counts = screen.getByLabelText('Story counts');
    expect(within(counts).getByText('2 branches')).toBeInTheDocument();
    expect(within(counts).getByText('12 pages')).toBeInTheDocument();
    expect(within(counts).getByText('8 choices')).toBeInTheDocument();
  });

  it('renders per-branch summary cards including the latest scene publication chip', () => {
    render(<StoryDashboard overview={buildOverview()} indexStatusBanner={null} />);

    const grid = screen.getByLabelText('Branch summaries');
    const cards = within(grid).getAllByRole('listitem');
    expect(cards).toHaveLength(2);

    const br1 = screen.getByLabelText('Branch BR-1');
    expect(within(br1).getByText('SCN-3')).toBeInTheDocument();
    expect(within(br1).getByTestId('publication-chip')).toHaveTextContent('attached:PASS');

    const br2 = screen.getByLabelText('Branch BR-2');
    expect(within(br2).getByText('none')).toBeInTheDocument();
  });

  it('renders coverage counts from the overview fixture', () => {
    render(<StoryDashboard overview={buildOverview()} indexStatusBanner={null} />);

    expect(screen.getByTestId('coverage-active-scenes')).toHaveTextContent('4');
    expect(screen.getByTestId('coverage-superseded-scenes')).toHaveTextContent('1');
    expect(screen.getByTestId('coverage-total-scenes')).toHaveTextContent('5');
    expect(screen.getByTestId('coverage-unscened-runs')).toHaveTextContent('2');
    expect(screen.getByTestId('coverage-unscened-pages')).toHaveTextContent('7');
  });

  it('links each branch card to its timeline and scenes surfaces', () => {
    render(<StoryDashboard overview={buildOverview()} indexStatusBanner={null} />);

    const br1 = screen.getByLabelText('Branch BR-1');
    expect(within(br1).getByRole('link', { name: 'Timeline' })).toHaveAttribute(
      'href',
      '/worlds/aurelia/stories/the-gathering/timeline?branch=BR-1',
    );
    expect(within(br1).getByRole('link', { name: 'Scenes' })).toHaveAttribute(
      'href',
      '/worlds/aurelia/stories/the-gathering/scenes?branch=BR-1',
    );
  });

  it('degrades orientation without fabricating coverage when counts and index are degraded', () => {
    render(
      <StoryDashboard
        overview={buildOverview({
          indexStatus: { kind: 'stale', driftedFiles: ['PG-1.yaml'], remedy: 'Rebuild the index.' },
          sceneCoverageCounts: {
            status: 'degraded',
            activeSceneCount: null,
            supersededSceneCount: null,
            totalSceneCount: null,
          },
          unscenedRunCounts: { status: 'degraded', runCount: null, pageCount: null },
        })}
        indexStatusBanner={null}
      />,
    );

    // The reused index-status banner surfaces the degraded index.
    expect(screen.getByText(/file\(s\) drifted/i)).toBeInTheDocument();
    // Coverage shows degraded indicators and invents no numbers.
    expect(screen.getByText(/Scene coverage unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Unscened-run coverage unavailable/i)).toBeInTheDocument();
    expect(screen.queryByTestId('coverage-active-scenes')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coverage-unscened-runs')).not.toBeInTheDocument();
  });

  it('marks the first branch active by default and moves the highlight when the selector changes', () => {
    render(<StoryDashboard overview={buildOverview()} indexStatusBanner={null} />);

    expect(screen.getByLabelText('Branch BR-1')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByLabelText('Branch BR-2')).not.toHaveAttribute('aria-current');

    fireEvent.change(screen.getByLabelText('Active branch'), { target: { value: 'BR-2' } });

    expect(screen.getByLabelText('Branch BR-2')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByLabelText('Branch BR-1')).not.toHaveAttribute('aria-current');
  });

  it('does not render an automatic scene-boundary recommender control', () => {
    render(<StoryDashboard overview={buildOverview()} indexStatusBanner={null} />);

    expect(screen.queryByRole('button', { name: /suggest/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/suggest boundary/i)).not.toBeInTheDocument();
  });
});
