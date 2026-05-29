import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SceneDetail, StateTickXray } from '../api/client';
import { getScenePlan, getSceneProse, getSceneReceipt, getStateTickXray } from '../api/client';
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
const mockedGetScenePlan = vi.mocked(getScenePlan);
const mockedGetSceneReceipt = vi.mocked(getSceneReceipt);
const mockedGetStateTickXray = vi.mocked(getStateTickXray);

function buildScene(overrides: Partial<SceneDetail> = {}): SceneDetail {
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
        xrayHref: '/worlds/aurelia/stories/the-gathering/timeline?focus=PG-1',
      },
      {
        pageId: 'PG-2',
        branchId: 'BR-2',
        parentPageId: 'PG-1',
        turnIndex: 2,
        resolvedEventId: 'SE-2',
        activeRecordCounts: { STENT: 2, BEL: 1 },
        xrayHref: '/worlds/aurelia/stories/the-gathering/timeline?focus=PG-2',
      },
    ],
    endChoiceSurface: {
      pageId: 'PG-2',
      emittedChoices: [
        {
          choiceId: 'CHC-1',
          surfaceLabel: 'Cross the bridge',
          playerVisibleIntent: 'Press on',
          pressure: ['fear'],
          groundedInCount: 2,
        },
      ],
    },
    eventDeltas: [
      {
        eventId: 'SE-1',
        createCount: 1,
        supersedeCount: 0,
        closeCount: 0,
        introducedRecordIds: ['STENT-1'],
        relationCount: 1,
      },
    ],
    artifactAvailability: { hasPlan: true, hasProse: true, hasReceipt: true },
    artifactLinks: {
      plan: '/worlds/aurelia/stories/the-gathering/scenes/SCN-3/plan',
      prose: '/worlds/aurelia/stories/the-gathering/scenes/SCN-3/prose',
      receipt: '/worlds/aurelia/stories/the-gathering/scenes/SCN-3/receipt',
    },
    indexStatus: { kind: 'fresh', version: 1 },
    degradedDirectRead: false,
    ...overrides,
  };
}

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <span data-testid="location-search">{location.search}</span>;
}

function renderShell(scene: SceneDetail, initialEntry = '/scenes/SCN-3'): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SceneDetailShell scene={scene} worldSlug="aurelia" storySlug="the-gathering" />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockedGetSceneProse.mockReset();
  mockedGetScenePlan.mockReset();
  mockedGetSceneReceipt.mockReset();
  mockedGetStateTickXray.mockReset();

  mockedGetSceneProse.mockResolvedValue({
    envelope: null,
    payload: { sceneId: 'SCN-3', kind: 'prose', sourcePath: 'scene-prose/SCN-3.md', body: 'Attached scene prose.' },
  });
  mockedGetScenePlan.mockResolvedValue({
    envelope: null,
    payload: { sceneId: 'SCN-3', kind: 'plan', sourcePath: 'scene-prose-plans/SCN-3.md', body: 'Plan beats here.' },
  });
  mockedGetSceneReceipt.mockResolvedValue({
    envelope: null,
    payload: { sceneId: 'SCN-3', kind: 'receipt', sourcePath: 'scene-prose-receipts/SCN-3.yaml', body: { verdict: 'PASS' } },
  });
  mockedGetStateTickXray.mockImplementation((_slug, _story, pageId) =>
    Promise.resolve({ envelope: null, payload: demoStateTickXray({ pageId }) as StateTickXray }),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SceneDetailShell header + rail', () => {
  it('renders the SCN id, branch, PG range, and publication chip', () => {
    renderShell(buildScene());

    expect(screen.getByRole('heading', { level: 1, name: 'SCN-3' })).toBeInTheDocument();
    expect(screen.getByText('BR-2')).toBeInTheDocument();
    expect(screen.getByText('PG-1 → PG-2')).toBeInTheDocument();
    expect(screen.getAllByTestId('publication-chip')[0]).toHaveTextContent('attached:PASS');
  });

  it('renders the bottom-rail panels: PG ticks, event deltas, choice surface, active records, validation', () => {
    renderShell(buildScene());

    expect(screen.getByRole('button', { name: 'Inspect state tick PG-1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Event deltas' })).toBeInTheDocument();
    expect(screen.getByText('Cross the bridge')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Active records' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Validation/ })).toBeInTheDocument();
  });
});

describe('SceneDetailShell prose-first precedence', () => {
  it('renders prose when prose is present', async () => {
    renderShell(buildScene());

    expect(await screen.findByText('Attached scene prose.')).toBeInTheDocument();
    expect(mockedGetScenePlan).not.toHaveBeenCalled();
  });

  it('falls back to the plan when prose is absent but a plan exists', async () => {
    renderShell(buildScene({ artifactAvailability: { hasPlan: true, hasProse: false, hasReceipt: false } }));

    expect(await screen.findByText('Plan beats here.')).toBeInTheDocument();
    expect(mockedGetSceneProse).not.toHaveBeenCalled();
  });

  it('shows "prose not attached" when neither prose nor plan is present', () => {
    renderShell(buildScene({ artifactAvailability: { hasPlan: false, hasProse: false, hasReceipt: false } }));

    expect(screen.getByTestId('scene-prose-empty')).toBeInTheDocument();
    expect(mockedGetSceneProse).not.toHaveBeenCalled();
    expect(mockedGetScenePlan).not.toHaveBeenCalled();
  });
});

describe('SceneDetailShell co-equal x-ray', () => {
  it('embeds the x-ray for the first page by default', async () => {
    renderShell(buildScene());

    await waitFor(() => expect(mockedGetStateTickXray).toHaveBeenCalledWith('aurelia', 'the-gathering', 'PG-1'));
    expect(await screen.findByRole('tablist', { name: 'State X-Ray tabs' })).toBeInTheDocument();
  });

  it('honors a ?focusPg preset that names a page in the scene', async () => {
    renderShell(buildScene(), '/scenes/SCN-3?focusPg=PG-2');

    await waitFor(() => expect(mockedGetStateTickXray).toHaveBeenCalledWith('aurelia', 'the-gathering', 'PG-2'));
    expect(screen.getByRole('heading', { level: 2, name: 'State x-ray · PG-2' })).toBeInTheDocument();
  });

  it('sets ?focusPg when a PG tick is clicked', async () => {
    renderShell(buildScene());

    const pageList = screen.getByRole('list', { name: 'Scene pages' });
    fireEvent.click(within(pageList).getByRole('button', { name: 'Inspect state tick PG-2' }));

    await waitFor(() => expect(screen.getByTestId('location-search')).toHaveTextContent('focusPg=PG-2'));
    await waitFor(() => expect(mockedGetStateTickXray).toHaveBeenCalledWith('aurelia', 'the-gathering', 'PG-2'));
  });
});
