import type { RecordLink } from '../../api/client';
import type { XRayTabId } from './XRayTabs';

interface StoryContext {
  storySlug: string;
  worldSlug: string;
}

export interface RecordLinkClickContext {
  activeRecordIds: string[];
  navigateToPage: (href: string) => void;
  openPeek: (recordId: string) => void;
  selectTab: (tabId: XRayTabId) => void;
  storyContext: StoryContext;
}

export interface RecordLinkTarget {
  recordId: string;
  targetExists?: boolean;
  activeOnCurrentPage?: boolean;
  targetPageId?: string | null;
}

// SPEC-97: PG is a causal tick, not a reader page. A PG record link deep-links
// to the timeline focused on that tick (the x-ray drawer surface), never the
// removed /pages/:pageId reader route.
function timelineFocusHref({ storySlug, worldSlug }: StoryContext, pageId: string): string {
  return `/worlds/${encodeURIComponent(worldSlug)}/stories/${encodeURIComponent(
    storySlug,
  )}/timeline?focus=${encodeURIComponent(pageId)}`;
}

function recordClass(recordId: string): string {
  return recordId.split('-')[0] ?? recordId;
}

function scrollToSelector(selector: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  element?.focus?.();
}

function quotedAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function dispatchRecordLinkClick(target: RecordLinkTarget | RecordLink | string, context: RecordLinkClickContext): void {
  const link = typeof target === 'string' ? { recordId: target } : target;
  const recordId = link.recordId;
  const classPrefix = recordClass(recordId);

  if (classPrefix === 'PG') {
    context.navigateToPage(timelineFocusHref(context.storyContext, recordId));
    return;
  }

  if (classPrefix === 'SE') {
    context.selectTab('what-changed');
    window.requestAnimationFrame(() => scrollToSelector(`[data-xray-record-id="${quotedAttributeValue(recordId)}"]`));
    return;
  }

  if (classPrefix === 'CHC') {
    scrollToSelector(`[data-choice-id="${quotedAttributeValue(recordId)}"]`);
    return;
  }

  if (link.targetExists === false) {
    return;
  }

  const activeOnCurrentPage = link.activeOnCurrentPage ?? context.activeRecordIds.includes(recordId);
  if (activeOnCurrentPage) {
    scrollToSelector(`[data-xray-record-id="${quotedAttributeValue(recordId)}"]`);
    return;
  }

  context.openPeek(recordId);
}
