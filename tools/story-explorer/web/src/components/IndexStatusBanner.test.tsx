import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { IndexStatus } from '../api/client';
import { IndexStatusBanner } from './IndexStatusBanner';

describe('IndexStatusBanner', () => {
  it('renders nothing for fresh indexes', () => {
    const { container } = render(<IndexStatusBanner status={{ kind: 'fresh', version: 4 }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [
      { kind: 'missing', remedy: 'Run npm exec --prefix tools/story-explorer -- world-index build example.' },
      'Index not built. Run npm exec --prefix tools/story-explorer -- world-index build example.',
    ],
    [
      {
        kind: 'stale',
        driftedFiles: ['a.yaml', 'b.yaml'],
        remedy: 'Run npm exec --prefix tools/story-explorer -- world-index sync example --quiet.',
      },
      '2 file(s) drifted. Run npm exec --prefix tools/story-explorer -- world-index sync example --quiet.',
    ],
    [{ kind: 'empty', remedy: 'Add story records.' }, 'Index built but contains no records. Add story records.'],
    [
      {
        kind: 'version_mismatch',
        expected: 7,
        found: 6,
        remedy: 'Run npm exec --prefix tools/story-explorer -- world-index build example.',
      },
      'Schema version mismatch (expected 7, found 6). Run npm exec --prefix tools/story-explorer -- world-index build example.',
    ],
    [{ kind: 'open_failed', error: 'SQLITE_CANTOPEN' }, 'Index could not be opened. SQLITE_CANTOPEN'],
  ] satisfies Array<[IndexStatus, string]>)('renders %s banner content', (status, expected) => {
    render(<IndexStatusBanner status={status} />);

    expect(screen.getByRole('status')).toHaveTextContent(expected);
  });
});
