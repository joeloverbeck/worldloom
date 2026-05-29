import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSceneReceipt } from '../api/client';
import { SceneReceiptPanel } from './SceneReceiptPanel';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    getSceneReceipt: vi.fn(),
  };
});

const mockedGetSceneReceipt = vi.mocked(getSceneReceipt);

beforeEach(() => {
  mockedGetSceneReceipt.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SceneReceiptPanel', () => {
  it('shows the empty state and never fetches when hasReceipt is false', () => {
    render(<SceneReceiptPanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasReceipt={false} />);

    expect(screen.getByTestId('scene-receipt-empty')).toBeInTheDocument();
    expect(mockedGetSceneReceipt).not.toHaveBeenCalled();
  });

  it('fetches and renders the receipt verdict and raw body', async () => {
    mockedGetSceneReceipt.mockResolvedValue({
      envelope: null,
      payload: {
        sceneId: 'SCN-3',
        kind: 'receipt',
        sourcePath: 'scene-prose-receipts/SCN-3.yaml',
        body: { verdict: 'PASS', attached_pages: ['PG-1', 'PG-2'] },
      },
    });

    render(<SceneReceiptPanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasReceipt />);

    expect(mockedGetSceneReceipt).toHaveBeenCalledWith('aurelia', 'the-gathering', 'SCN-3');
    expect(await screen.findByTestId('scene-receipt-verdict')).toHaveTextContent('Verdict: PASS');
    expect(screen.getByTestId('scene-receipt-raw')).toHaveTextContent('attached_pages');
  });

  it('renders an error message when the receipt fetch fails', async () => {
    mockedGetSceneReceipt.mockRejectedValue(new Error('boom'));

    render(<SceneReceiptPanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasReceipt />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load scene receipt for SCN-3.');
  });
});
