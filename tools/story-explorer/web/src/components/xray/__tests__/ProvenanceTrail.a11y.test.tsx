import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '../../../lib/a11y-test-helpers';
import { ProvenanceTrail } from '../ProvenanceTrail';
import { provenanceResponse, recordResponse } from './a11y-fixtures';

describe('ProvenanceTrail a11y', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders SE attribution and evidence chips without axe violations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/provenance/BEL-1')) {
          return Promise.resolve(provenanceResponse({ creatingSeId: 'SE-1', evidenceRecords: ['SF-1'] }));
        }
        return Promise.resolve(recordResponse());
      }),
    );

    const { container } = render(
      <ProvenanceTrail recordId="BEL-1" storyContext={{ worldSlug: 'fixture-world', storySlug: 'red-bunny' }} />,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'SE-1 at PG-12' })).toBeInTheDocument());
    expect(screen.getByLabelText('Evidence records')).toHaveTextContent('SF-1');

    await expectNoAxeViolations(container);
  });
});
