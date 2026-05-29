import type { SceneCoverageCounts, UnscenedRunCounts } from '../api/client';

interface CoveragePanelProps {
  sceneCoverageCounts: SceneCoverageCounts;
  unscenedRunCounts: UnscenedRunCounts;
}

function formatCount(value: number | null): string {
  // Never fabricate a number when the backend could not derive coverage.
  return value === null ? '—' : String(value);
}

function DegradedNotice({ label }: { label: string }): JSX.Element {
  return (
    <p className="coverage-panel__degraded" role="status">
      {label} unavailable — index degraded. Counts are not shown to avoid fabricating coverage.
    </p>
  );
}

export function CoveragePanel({ sceneCoverageCounts, unscenedRunCounts }: CoveragePanelProps): JSX.Element {
  const scenesDegraded = sceneCoverageCounts.status === 'degraded';
  const unscenedDegraded = unscenedRunCounts.status === 'degraded';

  return (
    <section className="coverage-panel" aria-labelledby="coverage-panel-title">
      <h2 id="coverage-panel-title">Coverage</h2>

      <div className="coverage-panel__group" aria-labelledby="coverage-scenes-title">
        <h3 id="coverage-scenes-title">Scenes</h3>
        {scenesDegraded ? (
          <DegradedNotice label="Scene coverage" />
        ) : (
          <dl className="coverage-panel__counts">
            <div>
              <dt>Active</dt>
              <dd data-testid="coverage-active-scenes">{formatCount(sceneCoverageCounts.activeSceneCount)}</dd>
            </div>
            <div>
              <dt>Superseded</dt>
              <dd data-testid="coverage-superseded-scenes">{formatCount(sceneCoverageCounts.supersededSceneCount)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd data-testid="coverage-total-scenes">{formatCount(sceneCoverageCounts.totalSceneCount)}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="coverage-panel__group" aria-labelledby="coverage-unscened-title">
        <h3 id="coverage-unscened-title">Unscened committed runs</h3>
        {unscenedDegraded ? (
          <DegradedNotice label="Unscened-run coverage" />
        ) : (
          <dl className="coverage-panel__counts">
            <div>
              <dt>Runs</dt>
              <dd data-testid="coverage-unscened-runs">{formatCount(unscenedRunCounts.runCount)}</dd>
            </div>
            <div>
              <dt>Pages</dt>
              <dd data-testid="coverage-unscened-pages">{formatCount(unscenedRunCounts.pageCount)}</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}
