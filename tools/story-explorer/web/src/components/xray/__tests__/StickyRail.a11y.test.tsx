import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../../../lib/a11y-test-helpers';
import { StickyRail } from '../StickyRail';
import { demoPageDetail } from './a11y-fixtures';

describe('StickyRail a11y', () => {
  it('renders the desktop rail with labelled status and navigation landmarks', async () => {
    const { container } = render(<StickyRail pageDetail={demoPageDetail({ currentStateRecordIds: ['BEL-1', 'STCHAR-1'] })} />);

    expect(screen.getByLabelText('Prose and receipt status')).toHaveTextContent('Prose missing');
    expect(screen.getByRole('navigation', { name: 'Groups' })).toBeInTheDocument();

    await expectNoAxeViolations(container);
  });
});
