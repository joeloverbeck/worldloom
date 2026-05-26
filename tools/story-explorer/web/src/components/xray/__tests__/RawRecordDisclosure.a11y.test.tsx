import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '../../../lib/a11y-test-helpers';
import { RawRecordDisclosure } from '../RawRecordDisclosure';
import { rawRecordResponse } from './a11y-fixtures';

describe('RawRecordDisclosure a11y', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the raw YAML disclosure as labelled read-only code', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(rawRecordResponse())));

    const { container } = render(<RawRecordDisclosure recordId="BEL-1" storySlug="red-bunny" worldSlug="fixture-world" />);
    const trigger = screen.getByRole('button', { name: 'View raw record' });

    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByText('sha256-demo')).toBeInTheDocument());

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelector('pre code.language-yaml')).toHaveTextContent('claim: The gate is watched');

    await expectNoAxeViolations(container);
  });
});
