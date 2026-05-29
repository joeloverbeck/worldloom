import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSceneProse } from '../api/client';
import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { SceneProsePanel } from './SceneProsePanel';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    getSceneProse: vi.fn(),
  };
});

const mockedGetSceneProse = vi.mocked(getSceneProse);

beforeEach(() => {
  mockedGetSceneProse.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SceneProsePanel a11y', () => {
  it('renders attached prose without axe violations', async () => {
    mockedGetSceneProse.mockResolvedValue({
      envelope: null,
      payload: {
        sceneId: 'SCN-3',
        kind: 'prose',
        sourcePath: 'scene-prose/SCN-3.md',
        body: 'The path opens toward **moonlit trees**.',
      },
    });

    const { container } = renderForAxe(
      <SceneProsePanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasProse />,
    );

    await waitFor(() => expect(screen.getByText('moonlit trees')).toBeInTheDocument());
    await expectNoAxeViolations(container);
  });

  it('renders the not-attached empty state without axe violations', async () => {
    const { container } = renderForAxe(
      <SceneProsePanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasProse={false} />,
    );

    await expectNoAxeViolations(container);
  });
});
