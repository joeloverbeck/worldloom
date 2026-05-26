import { FormEvent, useId, useState } from 'react';
import { Link, useLoaderData, useNavigate, type LoaderFunctionArgs } from 'react-router-dom';

import type { EnvelopedResult, PageSummary, StorySummary } from '../api/client';
import { getLatestPage, getRootPage, getStory } from '../api/client';
import { useIndexStatusBanner } from '../hooks/use-index-status-banner';
import { getLastViewedPage } from '../prefs/local-storage';

interface PageEntryResult {
  story: EnvelopedResult<StorySummary>;
  rootPage: EnvelopedResult<PageSummary | null>;
  latestPage: EnvelopedResult<PageSummary | null>;
  lastViewedPageId: string | null;
}

const PAGE_ID_PATTERN = /^PG-\d+$/;

export async function pageEntryLoader({ params }: LoaderFunctionArgs): Promise<PageEntryResult> {
  const worldSlug = params.slug;
  const storySlug = params.storySlug;

  if (!worldSlug || !storySlug) {
    throw new Error('World slug and story slug are required to load page entry.');
  }

  const [story, rootPage, latestPage] = await Promise.all([
    getStory(worldSlug, storySlug),
    getRootPage(worldSlug, storySlug),
    getLatestPage(worldSlug, storySlug),
  ]);

  return {
    story,
    rootPage,
    latestPage,
    lastViewedPageId: getLastViewedPage(storySlug),
  };
}

function pageHref(worldSlug: string, storySlug: string, pageId: string): string {
  return `/worlds/${encodeURIComponent(worldSlug)}/stories/${encodeURIComponent(storySlug)}/pages/${encodeURIComponent(
    pageId,
  )}`;
}

export function PageEntryRoute(): JSX.Element {
  const {
    story: { envelope: storyEnvelope, payload: story },
    rootPage: { envelope: rootPageEnvelope, payload: rootPage },
    latestPage: { envelope: latestPageEnvelope, payload: latestPage },
    lastViewedPageId,
  } = useLoaderData() as PageEntryResult;
  const [chosenPageId, setChosenPageId] = useState('');
  const [choosePageError, setChoosePageError] = useState<string | null>(null);
  const inputId = useId();
  const navigate = useNavigate();

  const rootPageId = rootPage?.pageId ?? story.rootPageId ?? 'PG-1';
  const latestPageId = latestPage?.pageId ?? story.latestPageId;
  const storyTitle = story.title ?? story.storySlug;
  const indexStatusBanner = useIndexStatusBanner(
    rootPageEnvelope?.worldIndexStatus ? rootPageEnvelope : latestPageEnvelope?.worldIndexStatus ? latestPageEnvelope : storyEnvelope,
  );

  function submitChosenPage(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const normalizedPageId = chosenPageId.trim().toUpperCase();

    if (!PAGE_ID_PATTERN.test(normalizedPageId)) {
      setChoosePageError('Enter a page ID like PG-12.');
      return;
    }

    setChoosePageError(null);
    navigate(pageHref(story.worldSlug, story.storySlug, normalizedPageId));
  }

  return (
    <main className="app-shell page-entry-route" aria-labelledby="page-entry-title">
      <header className="route-header">
        <p className="route-kicker">{story.storySlug}</p>
        <h1 id="page-entry-title">{storyTitle}</h1>
      </header>
      {indexStatusBanner}

      <section className="page-entry-panel" aria-labelledby="page-entry-actions-title">
        <h2 id="page-entry-actions-title">Choose a page entry point</h2>
        <div className="page-entry-actions" aria-label={`Entry points for ${storyTitle}`}>
          <Link className="page-entry-action page-entry-action--primary" to={pageHref(story.worldSlug, story.storySlug, rootPageId)}>
            <span>Start at root</span>
            <span>{rootPageId}</span>
          </Link>
          {latestPageId === null ? (
            <span className="page-entry-action page-entry-action--disabled" aria-disabled="true">
              <span>Open latest leaf</span>
              <span>None indexed</span>
            </span>
          ) : (
            <Link className="page-entry-action" to={pageHref(story.worldSlug, story.storySlug, latestPageId)}>
              <span>Open latest leaf</span>
              <span>{latestPageId}</span>
            </Link>
          )}
          {lastViewedPageId === null ? null : (
            <Link className="page-entry-action" to={pageHref(story.worldSlug, story.storySlug, lastViewedPageId)}>
              <span>Open last viewed</span>
              <span>{lastViewedPageId}</span>
            </Link>
          )}
        </div>

        <form className="page-entry-jump" onSubmit={submitChosenPage} noValidate>
          <label htmlFor={inputId}>Choose page</label>
          <div className="page-entry-jump__controls">
            <input
              id={inputId}
              value={chosenPageId}
              onChange={(event) => {
                setChosenPageId(event.currentTarget.value);
                setChoosePageError(null);
              }}
              aria-describedby={choosePageError === null ? undefined : `${inputId}-error`}
              aria-invalid={choosePageError === null ? undefined : true}
              autoComplete="off"
              placeholder="PG-12"
            />
            <button type="submit">Open</button>
          </div>
          {choosePageError === null ? null : (
            <p className="page-entry-jump__error" id={`${inputId}-error`}>
              {choosePageError}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
