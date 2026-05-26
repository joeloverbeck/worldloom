import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';

import type { EnvelopedResult, PageDetail, StorySummary, TerminalReason, WorldSummary } from '../api/client';
import { getPageDetail, getStory, getWorld } from '../api/client';
import { Breadcrumb } from '../components/Breadcrumb';
import { ChoiceCard } from '../components/ChoiceCard';
import { PageHeader } from '../components/PageHeader';
import { ProsePanel } from '../components/ProsePanel';
import { TerminalCard } from '../components/TerminalCard';
import { XRayPanel } from '../components/xray/XRayPanel';
import { useIndexStatusBanner } from '../hooks/use-index-status-banner';

interface PageReadResult {
  world: EnvelopedResult<WorldSummary>;
  story: EnvelopedResult<StorySummary>;
  pageDetail: EnvelopedResult<PageDetail>;
  worldSlug: string;
  storySlug: string;
  pageId: string;
}

function pageRecordId(page: Record<string, unknown>, fallback: string): string {
  return typeof page.id === 'string' && page.id.length > 0 ? page.id : fallback;
}

function pageIsLeaf(page: Record<string, unknown>): boolean {
  return page.isLeaf === true;
}

function pageTerminalReason(page: Record<string, unknown>): TerminalReason {
  return page.terminalReason === 'no_children' || page.terminalReason === 'paused' || page.terminalReason === 'terminal'
    ? page.terminalReason
    : null;
}

export async function pageReadLoader({ params }: LoaderFunctionArgs): Promise<PageReadResult> {
  const worldSlug = params.slug;
  const storySlug = params.storySlug;
  const pageId = params.pageId;

  if (!worldSlug || !storySlug || !pageId) {
    throw new Error('World slug, story slug, and page ID are required to load a reading page.');
  }

  const [world, story, pageDetail] = await Promise.all([
    getWorld(worldSlug),
    getStory(worldSlug, storySlug),
    getPageDetail(worldSlug, storySlug, pageId),
  ]);

  return { world, story, pageDetail, worldSlug, storySlug, pageId };
}

export function PageReadRoute(): JSX.Element {
  const {
    world: { payload: world },
    story: { payload: story },
    pageDetail: { envelope: pageDetailEnvelope, payload: pageDetail },
    worldSlug,
    storySlug,
    pageId: routePageId,
  } = useLoaderData() as PageReadResult;
  const storyTitle = story.title ?? story.storySlug;
  const pageId = pageRecordId(pageDetail.page, routePageId);
  const navigableChoices = pageDetail.choiceNavigation.filter((choice) => choice.isNavigable);
  const showTerminal = pageIsLeaf(pageDetail.page) && navigableChoices.length === 0;
  const indexStatusBanner = useIndexStatusBanner(pageDetailEnvelope);

  return (
    <main className="app-shell page-read-route" aria-labelledby="page-title">
      <PageHeader pageDetail={pageDetail} storyTitle={storyTitle} worldSlug={worldSlug} storySlug={storySlug} pageId={pageId} />
      <Breadcrumb
        worldSlug={worldSlug}
        worldDisplayName={world.displayName}
        storySlug={storySlug}
        storyTitle={storyTitle}
        branchId={pageDetail.branchContext.branchId}
        pageId={pageId}
        parentPageId={pageDetail.branchContext.parentPageId}
      />
      {indexStatusBanner}

      <div className="reading-layout">
        <div className="reading-layout__main">
          <section className="reading-section prose-section" aria-labelledby="prose-section-title">
            <h2 id="prose-section-title">Prose</h2>
            <ProsePanel
              proseStatus={pageDetail.proseStatus}
              eagerProseBody={pageDetail.prose}
              pageId={pageId}
              branchId={pageDetail.branchContext.branchId}
              turnIndex={pageDetail.branchContext.turnIndex}
              worldSlug={worldSlug}
              storySlug={storySlug}
              pagePlanSummary={pageDetail.pagePlanSummary}
            />
          </section>
          <section className="reading-section choices-section" aria-labelledby="choices-section-title">
            <h2 id="choices-section-title">Choices</h2>
            {navigableChoices.length > 0 ? (
              <div className="choice-list">
                {navigableChoices.map((choice) => (
                  <ChoiceCard key={choice.choiceId} choice={choice} worldSlug={worldSlug} storySlug={storySlug} />
                ))}
              </div>
            ) : (
              <p>No navigable choices from this page.</p>
            )}
          </section>
          {showTerminal ? (
            <section className="reading-section terminal-section" aria-labelledby="terminal-section-title">
              <h2 id="terminal-section-title">Continuation</h2>
              <TerminalCard terminalReason={pageTerminalReason(pageDetail.page)} />
            </section>
          ) : null}
          <section className="reading-section xray-section" aria-labelledby="xray-section-title">
            <h2 id="xray-section-title">State X-Ray</h2>
            <XRayPanel pageDetail={pageDetail} />
          </section>
        </div>
        <aside className="summary-rail" aria-labelledby="summary-rail-title">
          <h2 id="summary-rail-title">Summary</h2>
          <p>Summary rail slot (SPEC-89 fills)</p>
        </aside>
      </div>
    </main>
  );
}
