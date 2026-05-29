import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SceneDetail, StateTickXray } from '../api/client';
import { getSceneProse, getSceneReceipt, getStateTickXray } from '../api/client';
import { assertHeadingHierarchy, expectNoAxeViolations } from '../lib/a11y-test-helpers';
import { SceneDetailShell } from './SceneDetailShell';
import { demoStateTickXray } from './xray/__tests__/a11y-fixtures';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    getSceneProse: vi.fn(),
    getScenePlan: vi.fn(),
    getSceneReceipt: vi.fn(),
    getStateTickXray: vi.fn(),
  };
});

const mockedGetSceneProse = vi.mocked(getSceneProse);
const mockedGetSceneReceipt = vi.mocked(getSceneReceipt);
const mockedGetStateTickXray = vi.mocked(getStateTickXray);

function buildScene(): SceneDetail {
  return {
    sceneId: 'SCN-3',
    branchId: 'BR-2',
    sceneRecord: null,
    pageIds: ['PG-1', 'PG-2'],
    publicationState: 'attached:PASS',
    coverageStatus: 'active',
    includedPages: [
      {
        pageId: 'PG-1',
        branchId: 'BR-2',
        parentPageId: null,
        turnIndex: 1,
        resolvedEventId: 'SE-1',
        activeRecordCounts: { STENT: 2 },
        xrayHref: '/x/PG-1',
      },
    ],
    endChoiceSurface: { pageId: 'PG-2', emittedChoices: [] },
    eventDeltas: [],
    artifactAvailability: { hasPlan: true, hasProse: true, hasReceipt: true },
    artifactLinks: { plan: '/p', prose: '/r', receipt: '/c' },
    indexStatus: { kind: 'fresh', version: 1 },
    degradedDirectRead: false,
  };
}

beforeEach(() => {
  mockedGetSceneProse.mockResolvedValue({
    envelope: null,
    payload: { sceneId: 'SCN-3', kind: 'prose', sourcePath: 'scene-prose/SCN-3.md', body: 'Scene prose body.' },
  });
  mockedGetSceneReceipt.mockResolvedValue({
    envelope: null,
    payload: { sceneId: 'SCN-3', kind: 'receipt', sourcePath: 'r.yaml', body: { verdict: 'PASS' } },
  });
  mockedGetStateTickXray.mockImplementation((_slug, _story, pageId) =>
    Promise.resolve({ envelope: null, payload: demoStateTickXray({ pageId }) as StateTickXray }),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SceneDetailShell a11y', () => {
  it('renders the workbench without axe violations and with a valid heading hierarchy', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/scenes/SCN-3']}>
        <SceneDetailShell scene={buildScene()} worldSlug="aurelia" storySlug="the-gathering" />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Scene prose body.')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('tablist', { name: 'State X-Ray tabs' })).toBeInTheDocument());

    await expectNoAxeViolations(container);
    assertHeadingHierarchy(container);
  });
});
