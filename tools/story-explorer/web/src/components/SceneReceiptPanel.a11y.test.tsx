import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSceneReceipt } from '../api/client';
import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
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

describe('SceneReceiptPanel a11y', () => {
  it('renders the loaded receipt without axe violations', async () => {
    mockedGetSceneReceipt.mockResolvedValue({
      envelope: null,
      payload: {
        sceneId: 'SCN-3',
        kind: 'receipt',
        sourcePath: 'scene-prose-receipts/SCN-3.yaml',
        body: { verdict: 'WARN' },
      },
    });

    const { container } = renderForAxe(
      <SceneReceiptPanel worldSlug="aurelia" storySlug="the-gathering" sceneId="SCN-3" hasReceipt />,
    );

    await waitFor(() => expect(screen.getByTestId('scene-receipt-verdict')).toBeInTheDocument());
    await expectNoAxeViolations(container);
  });
});
