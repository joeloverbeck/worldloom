import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getScenePlan } from '../api/client';
import { ScenePlanPanel } from './ScenePlanPanel';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    getScenePlan: vi.fn(),
  };
});

const mockedGetScenePlan = vi.mocked(getScenePlan);

beforeEach(() => {
  mockedGetScenePlan.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ScenePlanPanel', () => {
  it('shows the empty state and never fetches when hasPlan is false', () => {
    render(<ScenePlanPanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasPlan={false} />);

    expect(screen.getByTestId('scene-plan-empty')).toBeInTheDocument();
    expect(mockedGetScenePlan).not.toHaveBeenCalled();
  });

  it('fetches and renders the plan body with its source path', async () => {
    mockedGetScenePlan.mockResolvedValue({
      envelope: null,
      payload: {
        sceneId: 'SCN-3',
        kind: 'plan',
        sourcePath: 'scene-prose-plans/SCN-3.md',
        body: '## Beats\n\nRising tension across the bridge.',
      },
    });

    render(<ScenePlanPanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasPlan />);

    expect(mockedGetScenePlan).toHaveBeenCalledWith('aurelia', 'the-gathering', 'SCN-3');
    expect(await screen.findByText('Rising tension across the bridge.')).toBeInTheDocument();
    expect(screen.getByText('scene-prose-plans/SCN-3.md')).toBeInTheDocument();
  });

  it('renders an error message when the plan fetch fails', async () => {
    mockedGetScenePlan.mockRejectedValue(new Error('boom'));

    render(<ScenePlanPanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasPlan />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load scene plan for SCN-3.');
  });
});
