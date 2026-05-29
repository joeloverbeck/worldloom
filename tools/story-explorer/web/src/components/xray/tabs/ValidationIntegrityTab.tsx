import type { IndexStatus, StateTickXray } from '../../../api/client';
import { BrokenReferenceChip } from '../BrokenReferenceChip';

interface ValidationIntegrityTabProps {
  tick: StateTickXray;
  worldIndexStatus: IndexStatus | null;
}

type Tone = 'success' | 'warning' | 'broken' | 'neutral';

function chipClass(tone: Tone): string {
  switch (tone) {
    case 'success':
      return 'record-chip record-chip--success';
    case 'warning':
      return 'record-chip record-chip--warning';
    case 'broken':
      return 'record-chip record-chip--broken';
    case 'neutral':
      return 'record-chip';
  }
}

function verdictTone(value: string | null): Tone {
  const normalized = value?.toLowerCase();
  if (normalized === 'pass' || normalized === 'accept' || normalized === 'match' || normalized === 'present' || normalized === 'fresh') {
    return 'success';
  }
  if (normalized === 'warn' || normalized === 'revise' || normalized === 'not_checked' || normalized === 'missing' || normalized === 'stale') {
    return 'warning';
  }
  if (normalized === 'fail' || normalized === 'reject' || normalized === 'mismatch' || normalized === 'unreadable' || normalized === 'open_failed') {
    return 'broken';
  }
  return 'neutral';
}

function statusChip(label: string, value: string | null): JSX.Element {
  return <span className={chipClass(verdictTone(value))}>{label}: {value?.replaceAll('_', '-') ?? 'not available'}</span>;
}

function stringValue(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function stringArrayFromTrace(trace: Record<string, unknown>, key: string): string[] {
  const value = trace[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function flattenTraceEntries(trace: Record<string, unknown>): Array<{ key: string; verdict: string; notes: string | null }> {
  const checks = Array.isArray(trace.checks) ? trace.checks : null;
  if (checks !== null) {
    return checks.map((entry, index) => {
      const block = typeof entry === 'object' && entry !== null ? entry as Record<string, unknown> : {};
      const key = stringValue(block.name) ?? stringValue(block.check) ?? `check-${index + 1}`;
      const verdict = stringValue(block.verdict) ?? stringValue(block.status) ?? 'not available';
      const notes = stringValue(block.rationale) ?? stringValue(block.notes) ?? stringValue(block.message);
      return { key, verdict, notes };
    });
  }

  return Object.entries(trace).map(([key, value]) => {
    const block = typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
    return {
      key,
      verdict: block ? stringValue(block.verdict) ?? stringValue(block.status) ?? 'present' : stringValue(value) ?? 'present',
      notes: block ? stringValue(block.rationale) ?? stringValue(block.notes) ?? stringValue(block.message) : null,
    };
  });
}

function ValidationTrace({ trace }: { trace: Record<string, unknown> }): JSX.Element {
  const rows = flattenTraceEntries(trace);

  return (
    <section className="xray-event-section" aria-labelledby="xray-validation-trace-title">
      <h4 id="xray-validation-trace-title">Validation trace</h4>
      {rows.length === 0 ? (
        <p className="xray-empty-note">All checks passed.</p>
      ) : (
        <table className="xray-validation-table">
          <thead>
            <tr>
              <th scope="col">Check</th>
              <th scope="col">Verdict</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.key}</th>
                <td><span className={chipClass(verdictTone(row.verdict))}>{row.verdict}</span></td>
                <td>{row.notes ?? 'All checks passed.'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function indexRemedy(status: IndexStatus): string | null {
  switch (status.kind) {
    case 'fresh':
      return null;
    case 'version_mismatch':
      return status.remedy;
    case 'missing':
    case 'empty':
    case 'stale':
      return status.remedy;
    case 'open_failed':
      return status.error;
  }
}

function IndexState({ worldIndexStatus }: { worldIndexStatus: IndexStatus | null }): JSX.Element {
  const label = worldIndexStatus?.kind ?? 'not available';
  const remedy = worldIndexStatus === null ? null : indexRemedy(worldIndexStatus);
  const driftedFiles = worldIndexStatus?.kind === 'stale' ? worldIndexStatus.driftedFiles : [];

  return (
    <section className="xray-event-section" aria-labelledby="xray-index-state-title">
      <h4 id="xray-index-state-title">Index state</h4>
      <div className="record-card__chips" aria-label="Index status">
        {statusChip('World index', label)}
      </div>
      {remedy !== null ? <p className="xray-empty-note">{remedy}</p> : <p className="xray-empty-note">All checks passed.</p>}
      {driftedFiles.length > 0 ? (
        <ul className="xray-structured-list">
          {driftedFiles.map((file) => <li key={file}>{file}</li>)}
        </ul>
      ) : null}
    </section>
  );
}

function IntegrityList({
  brokenReferences = false,
  emptyLabel,
  items,
  title,
}: {
  brokenReferences?: boolean;
  emptyLabel: string;
  items: string[];
  title: string;
}): JSX.Element {
  const id = `xray-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;

  return (
    <section className="xray-event-section" aria-labelledby={id}>
      <h4 id={id}>{title}</h4>
      {items.length === 0 ? (
        <p className="xray-empty-note">{emptyLabel}</p>
      ) : (
        <ul className="xray-structured-list">
          {items.map((item) => (
            <li key={item}>{brokenReferences ? <BrokenReferenceChip recordId={item} /> : <span className="record-chip record-chip--broken">{item}</span>}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ValidationIntegrityTab({ tick, worldIndexStatus }: ValidationIntegrityTabProps): JSX.Element {
  const trace = tick.validationTrace;
  const stateHashStatus =
    tick.stateHash !== null && tick.parentStateHash !== null
      ? tick.stateHash === tick.parentStateHash
        ? 'match'
        : 'mismatch'
      : 'not_checked';

  return (
    <section className="xray-tab-panel__body" aria-labelledby="xray-validation-title">
      <h3 id="xray-validation-title">Validation & Integrity</h3>
      <div className="record-card__chips" aria-label="Integrity summary">
        {statusChip('State hash', tick.stateHash ?? 'not available')}
        {statusChip('Parent state hash', tick.parentStateHash ?? 'not available')}
        {statusChip('State hash status', stateHashStatus)}
      </div>

      <ValidationTrace trace={trace} />
      <IndexState worldIndexStatus={worldIndexStatus} />
      <IntegrityList emptyLabel="All checks passed." items={stringArrayFromTrace(trace, 'malformed_yaml_warnings')} title="Malformed YAML warnings" />
      <IntegrityList emptyLabel="All checks passed." items={stringArrayFromTrace(trace, 'skipped_records')} title="Skipped records" />
      <IntegrityList brokenReferences emptyLabel="All checks passed." items={stringArrayFromTrace(trace, 'broken_refs')} title="Broken references" />
    </section>
  );
}
