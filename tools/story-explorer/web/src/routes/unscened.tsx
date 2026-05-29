import { useLoaderData, useSearchParams, type LoaderFunctionArgs } from 'react-router-dom';

import type {
  ActiveRecordDeltaSummary,
  EnvelopedResult,
  UnscenedRange,
  UnscenedRangeList,
  UnscenedRangeValidationStatus,
} from '../api/client';
import { getUnscenedRanges } from '../api/client';
import { ChoiceSurfacePanel } from '../components/ChoiceSurfacePanel';
import { StateDeltaPanel } from '../components/StateDeltaPanel';
import { StateTickDrawer } from '../components/StateTickDrawer';
import { UnscenedRunCard } from '../components/UnscenedRunCard';
import { useIndexStatusBannerFromStatus } from '../hooks/use-index-status-banner';

interface UnscenedRouteResult {
  unscened: EnvelopedResult<UnscenedRangeList>;
  worldSlug: string;
  storySlug: string;
}

export async function unscenedLoader({ params, request }: LoaderFunctionArgs): Promise<UnscenedRouteResult> {
  const worldSlug = params.slug;
  const storySlug = params.storySlug;

  if (!worldSlug || !storySlug) {
    throw new Error('World slug and story slug are required to load unscened ranges.');
  }

  // The `?branch` shorthand mirrors the timeline/scenes convention and maps to
  // SPEC-96's `branchId` query param. PG focus is separate query state (?focus),
  // consumed by the StateTickDrawer.
  const url = new URL(request.url);
  const branchId = url.searchParams.get('branch') ?? undefined;

  const unscened = await getUnscenedRanges(worldSlug, storySlug, { branchId });

  return { unscened, worldSlug, storySlug };
}

function totalActiveRecords(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + Math.max(0, count), 0);
}

// The state-progression summary across the run: how the active-record footprint
// moved from the run's first PG to its last, plus the create/supersede/close
// churn. This is the dedicated "state progression" surface called out by
// SPEC-97 §2.6 (the per-PG x-ray drawer is the deeper-inspection affordance).
function StateProgressionSummary({ delta }: { delta: ActiveRecordDeltaSummary }): JSX.Element {
  const startTotal = totalActiveRecords(delta.startActiveRecordCounts);
  const endTotal = totalActiveRecords(delta.endActiveRecordCounts);

  return (
    <section className="unscened-range__progression" aria-label="State progression">
      <h4 className="unscened-range__subtitle">State progression</h4>
      <p className="unscened-range__progression-totals" data-testid="state-progression-totals">
        {startTotal} → {endTotal} active records
      </p>
      <dl className="unscened-range__progression-counts">
        <div>
          <dt>Created</dt>
          <dd data-testid="state-progression-created">{delta.createdRecordIds.length}</dd>
        </div>
        <div>
          <dt>Superseded</dt>
          <dd data-testid="state-progression-superseded">{delta.supersededRecordIds.length}</dd>
        </div>
        <div>
          <dt>Closed</dt>
          <dd data-testid="state-progression-closed">{delta.closedRecordIds.length}</dd>
        </div>
      </dl>
    </section>
  );
}

function ValidationTraces({ status }: { status: UnscenedRangeValidationStatus }): JSX.Element {
  return (
    <section className="unscened-range__validation" aria-label="Validation traces">
      <h4 className="unscened-range__subtitle">Validation traces</h4>
      <p className="unscened-range__validation-summary" data-testid="validation-trace-summary">
        {status.pagesWithValidationTrace} of {status.pageCount} pages carry a validation trace
        {' · '}
        <span data-testid="validation-trace-verdict">{status.verdict}</span>
      </p>
    </section>
  );
}

function UnscenedRangeView({
  range,
  onSelectPage,
}: {
  range: UnscenedRange;
  onSelectPage: (pageId: string) => void;
}): JSX.Element {
  return (
    <article className="unscened-range" aria-label={`Unscened range ${range.startPg}–${range.endPg}`}>
      <UnscenedRunCard
        pageIds={range.pageIds}
        startPageId={range.startPg}
        endPageId={range.endPg}
        onSelectPage={onSelectPage}
      />

      <p className="unscened-range__suggested-label" data-testid="suggested-range-label">
        Suggested label: {range.suggestedRangeLabel}
      </p>

      {/* No reader/prose affordance: an unscened range is a normal authoring
          state, not a missing-scene error (SPEC-97 §2.6 / unscened-first-class). */}
      <p className="unscened-range__no-prose" data-testid="no-prose-note">
        No scene plan or prose yet.
      </p>

      <StateProgressionSummary delta={range.activeRecordDelta} />

      <StateDeltaPanel eventDeltas={[range.eventDelta]} />

      <section className="unscened-range__choice-surface" aria-label="Final-page choice surface">
        <h4 className="unscened-range__subtitle">Final-page choice surface</h4>
        <ChoiceSurfacePanel choiceSurface={range.finalChoiceSurface} onSelectPage={onSelectPage} />
      </section>

      <ValidationTraces status={range.validationStatus} />
    </article>
  );
}

export function UnscenedRoute(): JSX.Element {
  const {
    unscened: { payload: unscened },
    worldSlug,
    storySlug,
  } = useLoaderData() as UnscenedRouteResult;
  const [searchParams, setSearchParams] = useSearchParams();
  const banner = useIndexStatusBannerFromStatus(unscened.indexStatus);

  // Selecting a PG deep-links the state-tick x-ray drawer via ?focus=PG-N, the
  // same author-x-ray-first inspection affordance the timeline route uses.
  function handleSelectPage(pageId: string): void {
    const next = new URLSearchParams(searchParams);
    next.set('focus', pageId);
    setSearchParams(next);
  }

  return (
    <main className="app-shell unscened-route" aria-labelledby="unscened-title">
      <header className="route-header">
        <p className="route-kicker">
          {worldSlug} · {storySlug}
        </p>
        <h1 id="unscened-title">Unscened ranges · {unscened.branchId}</h1>
      </header>

      {banner}

      {unscened.ranges.length === 0 ? (
        <section className="empty-state" aria-labelledby="unscened-empty-title">
          <h2 id="unscened-empty-title">No unscened committed runs on this branch.</h2>
          <p>Every committed page on this branch is covered by an active scene.</p>
        </section>
      ) : (
        <section className="unscened-route__ranges" aria-labelledby="unscened-ranges-title">
          <h2 id="unscened-ranges-title">Unscened ranges</h2>
          <ol className="unscened-route__range-list" aria-label="Unscened ranges">
            {unscened.ranges.map((range) => (
              <li key={`${range.startPg}-${range.endPg}`}>
                <UnscenedRangeView range={range} onSelectPage={handleSelectPage} />
              </li>
            ))}
          </ol>
        </section>
      )}

      <StateTickDrawer worldSlug={worldSlug} storySlug={storySlug} />
    </main>
  );
}
