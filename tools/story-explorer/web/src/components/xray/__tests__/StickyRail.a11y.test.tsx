import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../../../lib/a11y-test-helpers';
import { StickyRail } from '../StickyRail';
import { demoStateTickXray } from './a11y-fixtures';

describe('StickyRail a11y', () => {
  it('renders the desktop rail with labelled status and navigation landmarks', async () => {
    const { container } = render(<StickyRail tick={demoStateTickXray({ currentStateRecordIds: ['BEL-1', 'STCHAR-1'] })} />);

    expect(screen.getByText('PG-12 · BR-3')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Jump to group' })).toBeInTheDocument();

    await expectNoAxeViolations(container);
  });
});
