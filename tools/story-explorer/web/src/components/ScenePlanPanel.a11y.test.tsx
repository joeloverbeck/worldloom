import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getScenePlan } from '../api/client';
import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
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

describe('ScenePlanPanel a11y', () => {
  it('renders the loaded plan without axe violations', async () => {
    mockedGetScenePlan.mockResolvedValue({
      envelope: null,
      payload: { sceneId: 'SCN-3', kind: 'plan', sourcePath: 'scene-prose-plans/SCN-3.md', body: 'Plan beats.' },
    });

    const { container } = renderForAxe(
      <ScenePlanPanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasPlan />,
    );

    await waitFor(() => expect(screen.getByText('Plan beats.')).toBeInTheDocument());
    await expectNoAxeViolations(container);
  });
});
