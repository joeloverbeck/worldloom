import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '../../../lib/a11y-test-helpers';
import { MobileSummaryBar } from '../MobileSummaryBar';
import { groupAnchorId } from '../groupActiveRecords';
import { demoStateTickXray } from './a11y-fixtures';

describe('MobileSummaryBar a11y', () => {
  it('renders a labelled mobile summary and keyboard-reachable group jump', async () => {
    const target = document.createElement('button');
    target.id = groupAnchorId('Knowledge & Truth');
    target.scrollIntoView = vi.fn();
    document.body.append(target);

    const { container } = render(<MobileSummaryBar tick={demoStateTickXray({ currentStateRecordIds: ['BEL-1'] })} />);

    expect(screen.getByLabelText('State X-Ray summary')).toHaveTextContent('1 active');
    fireEvent.change(screen.getByLabelText('Jump to group'), { target: { value: target.id } });
    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });

    await expectNoAxeViolations(container);
    target.remove();
  });
});
