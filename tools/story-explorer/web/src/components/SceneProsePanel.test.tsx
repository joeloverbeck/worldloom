import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSceneProse } from '../api/client';
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

describe('SceneProsePanel', () => {
  it('shows the "prose not attached" empty state and never fetches when hasProse is false', () => {
    render(<SceneProsePanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasProse={false} />);

    expect(screen.getByTestId('scene-prose-empty')).toBeInTheDocument();
    expect(screen.getByText('Prose not attached.')).toBeInTheDocument();
    expect(mockedGetSceneProse).not.toHaveBeenCalled();
  });

  it('fetches and renders sanitized scene prose when hasProse is true', async () => {
    mockedGetSceneProse.mockResolvedValue({
      envelope: null,
      payload: { sceneId: 'SCN-3', kind: 'prose', sourcePath: 'scene-prose/SCN-3.md', body: '# Dawn\n\nA quiet scene.' },
    });

    render(<SceneProsePanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasProse />);

    expect(mockedGetSceneProse).toHaveBeenCalledWith('aurelia', 'the-gathering', 'SCN-3');
    expect(await screen.findByRole('heading', { level: 1, name: 'Dawn' })).toBeInTheDocument();
    expect(screen.getByText('A quiet scene.')).toBeInTheDocument();
  });

  it('falls back to the empty state when the prose body is blank', async () => {
    mockedGetSceneProse.mockResolvedValue({
      envelope: null,
      payload: { sceneId: 'SCN-3', kind: 'prose', sourcePath: 'scene-prose/SCN-3.md', body: '   ' },
    });

    render(<SceneProsePanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasProse />);

    expect(await screen.findByTestId('scene-prose-empty')).toBeInTheDocument();
  });

  it('renders an error message when the prose fetch fails', async () => {
    mockedGetSceneProse.mockRejectedValue(new Error('boom'));

    render(<SceneProsePanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasProse />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load scene prose for SCN-3.');
  });

  it('strips unsafe html before injecting prose into the surface', async () => {
    mockedGetSceneProse.mockResolvedValue({
      envelope: null,
      payload: {
        sceneId: 'SCN-3',
        kind: 'prose',
        sourcePath: 'scene-prose/SCN-3.md',
        body: 'Safe <script>alert(1)</script> <img src=x onerror="alert(1)">',
      },
    });

    render(<SceneProsePanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasProse />);

    await waitFor(() => expect(screen.getByText(/Safe/)).toBeInTheDocument());
    expect(document.querySelector('script')).toBeNull();
    expect(document.body.innerHTML).not.toContain('onerror');
  });
});
