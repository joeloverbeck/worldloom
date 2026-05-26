import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dispatchRecordLinkClick, type RecordLinkClickContext } from '../navigation-dispatcher';

function context(overrides: Partial<RecordLinkClickContext> = {}): RecordLinkClickContext {
  return {
    activeRecordIds: ['BEL-1'],
    navigateToPage: vi.fn(),
    openPeek: vi.fn(),
    selectTab: vi.fn(),
    storyContext: { worldSlug: 'fixture-world', storySlug: 'red-bunny' },
    ...overrides,
  };
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('dispatchRecordLinkClick', () => {
  it('scrolls to active records in the X-Ray', () => {
    const element = document.createElement('article');
    element.dataset.xrayRecordId = 'BEL-1';
    document.body.append(element);
    const ctx = context();

    dispatchRecordLinkClick('BEL-1', ctx);

    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    expect(ctx.openPeek).not.toHaveBeenCalled();
    element.remove();
  });

  it('opens the peek panel for existing records not active on the current page', () => {
    const ctx = context();

    dispatchRecordLinkClick({ recordId: 'SF-2', targetExists: true, activeOnCurrentPage: false }, ctx);

    expect(ctx.openPeek).toHaveBeenCalledWith('SF-2');
  });

  it('navigates PG links through React Router navigation', () => {
    const ctx = context();

    dispatchRecordLinkClick('PG-3', ctx);

    expect(ctx.navigateToPage).toHaveBeenCalledWith('/worlds/fixture-world/stories/red-bunny/pages/PG-3');
  });

  it('switches to What Changed Here for SE links', () => {
    const ctx = context();

    dispatchRecordLinkClick('SE-7', ctx);

    expect(ctx.selectTab).toHaveBeenCalledWith('what-changed');
  });

  it('scrolls CHC links to the reading choice card', () => {
    const element = document.createElement('article');
    element.dataset.choiceId = 'CHC-1';
    document.body.append(element);
    const ctx = context();

    dispatchRecordLinkClick('CHC-1', ctx);

    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    element.remove();
  });
});
