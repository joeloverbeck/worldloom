import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../../../lib/a11y-test-helpers';
import { RecordCardCompact } from '../RecordCardCompact';
import { card } from './a11y-fixtures';

describe('RecordCardCompact a11y', () => {
  it('labels the compact card and exposes chip text without color-only meaning', async () => {
    const { container } = render(
      <RecordCardCompact
        recordCard={card('BEL-1', 'Knowledge & Truth', {
          confidence: 'low',
          links: [],
          visibility: 'hidden',
        })}
      />,
    );

    expect(screen.getByRole('article')).toHaveAccessibleName(/BEL-1/);
    expect(screen.getByLabelText('BEL-1 summary chips')).toHaveTextContent('Visibility: hidden');
    expect(screen.getByLabelText('BEL-1 summary chips')).toHaveTextContent('Confidence: low');
    expect(screen.getByLabelText('BEL-1 summary chips')).not.toHaveTextContent(/\bvisibility: hidden\b/);
    expect(screen.getByLabelText('BEL-1 summary chips')).not.toHaveTextContent(/\bconfidence: low\b/);

    await expectNoAxeViolations(container);
  });
});
