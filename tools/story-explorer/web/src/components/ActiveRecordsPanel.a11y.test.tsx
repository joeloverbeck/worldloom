import { describe, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { ActiveRecordsPanel } from './ActiveRecordsPanel';

describe('ActiveRecordsPanel a11y', () => {
  it('renders grouped counts without axe violations', async () => {
    const { container } = renderForAxe(
      <ActiveRecordsPanel activeRecordCounts={{ STENT: 2, BEL: 1 }} pageId="PG-5" />,
    );

    await expectNoAxeViolations(container);
  });

  it('renders the empty state without axe violations', async () => {
    const { container } = renderForAxe(<ActiveRecordsPanel activeRecordCounts={{}} pageId={null} />);

    await expectNoAxeViolations(container);
  });
});
