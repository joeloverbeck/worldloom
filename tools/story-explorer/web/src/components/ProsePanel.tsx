import { Suspense } from 'react';

import type { PagePlanSummary, ProseBody, ProseStatus } from '../api/client';
import { getProseBody } from '../api/client';
import { formatPageStatusStrip } from '../lib/format';
import { sanitizeMarkdown } from '../lib/sanitize-markdown';
import { RouteLoading } from './RouteLoading';
import { ProseMissingPlaceholder } from './ProseMissingPlaceholder';

interface ProsePanelProps {
  proseStatus: ProseStatus;
  eagerProseBody: string | null;
  pageId: string;
  branchId: string;
  turnIndex: number;
  worldSlug: string;
  storySlug: string;
  pagePlanSummary?: PagePlanSummary | null;
}

interface ProseResource {
  read: () => ProseBody;
}

const proseBodyCache = new Map<string, ProseResource>();

function proseCacheKey(worldSlug: string, storySlug: string, pageId: string): string {
  return `${worldSlug}\u0000${storySlug}\u0000${pageId}`;
}

function createProseResource(worldSlug: string, storySlug: string, pageId: string): ProseResource {
  let status: 'pending' | 'success' | 'error' = 'pending';
  let body: ProseBody | null = null;
  let error: unknown = null;
  const promise = getProseBody(worldSlug, storySlug, pageId).then(
    (result) => {
      status = 'success';
      body = result.payload;
    },
    (caught) => {
      status = 'error';
      error = caught;
    },
  );

  return {
    read() {
      if (status === 'pending') {
        throw promise;
      }

      if (status === 'error') {
        throw error;
      }

      return body ?? { status: 'missing', body: null };
    },
  };
}

function getProseResource(worldSlug: string, storySlug: string, pageId: string): ProseResource {
  const key = proseCacheKey(worldSlug, storySlug, pageId);
  const existing = proseBodyCache.get(key);
  if (existing) {
    return existing;
  }

  const resource = createProseResource(worldSlug, storySlug, pageId);
  proseBodyCache.set(key, resource);
  return resource;
}

function renderProseMarkdown(markdown: string, pageId: string, branchId: string, turnIndex: number): JSX.Element {
  const sanitized = sanitizeMarkdown(markdown);

  return (
    <div className="prose-panel">
      <div className="prose" dangerouslySetInnerHTML={{ __html: sanitized }} />
      <p className="prose-panel__status">{formatPageStatusStrip(pageId, branchId, turnIndex)}</p>
    </div>
  );
}

function LazyProseBody({
  resource,
  pageId,
  branchId,
  turnIndex,
}: {
  resource: ProseResource;
  pageId: string;
  branchId: string;
  turnIndex: number;
}): JSX.Element {
  const prose = resource.read();

  if (prose.status !== 'present' || prose.body === null) {
    return <ProseMissingPlaceholder status={prose.status === 'present' ? 'missing' : prose.status} />;
  }

  return renderProseMarkdown(prose.body, pageId, branchId, turnIndex);
}

export function ProsePanel({
  proseStatus,
  eagerProseBody,
  pageId,
  branchId,
  turnIndex,
  worldSlug,
  storySlug,
}: ProsePanelProps): JSX.Element {
  if (proseStatus !== 'present') {
    return <ProseMissingPlaceholder status={proseStatus} />;
  }

  if (eagerProseBody !== null) {
    return renderProseMarkdown(eagerProseBody, pageId, branchId, turnIndex);
  }

  const resource = getProseResource(worldSlug, storySlug, pageId);

  return (
    <Suspense fallback={<RouteLoading label="Loading prose..." />}>
      <LazyProseBody resource={resource} pageId={pageId} branchId={branchId} turnIndex={turnIndex} />
    </Suspense>
  );
}
