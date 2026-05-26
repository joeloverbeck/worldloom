import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '../../../../lib/a11y-test-helpers';
import { PlanProseTab } from '../PlanProseTab';
import { demoPageDetail, envelope } from '../../__tests__/a11y-fixtures';

describe('PlanProseTab a11y', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders plan and receipt audit tables without axe violations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/page-plans/')) {
          return Promise.resolve(envelope({ body: '## Page Plan\nRender the watched gate.', sourcePath: 'pages-prose-plans/PG-12.md' }));
        }
        return Promise.resolve(
          envelope({
            body: { verdict: 'accept', checks: { hash_integrity: 'pass' }, plan_hash: 'sha256-plan' },
            sourcePath: 'pages-prose-receipts/PG-12.yaml',
          }),
        );
      }),
    );

    const { container } = render(<PlanProseTab pageDetail={demoPageDetail()} storySlug="red-bunny" worldSlug="fixture-world" />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Prose Receipt' })).toBeInTheDocument());
    expect(screen.getByText('Plan, prose, and receipt are distinct artifacts. PG is the authoritative page snapshot.')).toBeInTheDocument();

    await expectNoAxeViolations(container);
  });
});
