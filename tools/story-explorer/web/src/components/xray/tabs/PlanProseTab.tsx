import { useEffect, useMemo, useState } from 'react';

import { ApiError, getPagePlan, getProseReceipt, type PageDetail, type PagePlanBody, type ProseReceiptBody } from '../../../api/client';
import { sanitizeMarkdown } from '../../../lib/sanitize-markdown';

interface PlanProseTabProps {
  pageDetail: PageDetail;
  storySlug: string;
  worldSlug: string;
}

type ResourceState<T> =
  | { status: 'loading'; value: null; error: null }
  | { status: 'loaded'; value: T; error: null }
  | { status: 'missing'; value: null; error: null }
  | { status: 'error'; value: null; error: string };

const validationSurfaces = [
  ['hash_integrity', 'Hash integrity'],
  ['engine_jargon_leak', 'Engine-jargon leak'],
  ['forbidden_mystery_resolution', 'Forbidden mystery resolution'],
  ['required_event_rendered', 'Required event rendered'],
  ['choice_consequence_visibility', 'Choice consequence visibility'],
  ['entity_status_consistency', 'Entity status consistency'],
  ['invented_structural_fact', 'Invented structural fact'],
  ['canon_claim_without_authority', 'Canon claim without authority'],
  ['char_authority_leak', 'Character authority leak'],
] as const;

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function pageId(pageDetail: PageDetail): string {
  return stringValue(pageDetail.page.id) ?? 'unknown-page';
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'missing';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function stateHashStatus(receipt: Record<string, unknown>): string {
  const checks = typeof receipt.checks === 'object' && receipt.checks !== null ? receipt.checks as Record<string, unknown> : null;
  const hashVerdict = checks ? stringValue(checks.hash_integrity) : null;
  if (hashVerdict !== null) {
    return hashVerdict;
  }
  return stringValue(receipt.state_hash_status) ?? (stringValue(receipt.state_hash_at_plan_time) ? 'recorded' : 'not-checked');
}

function verdictClass(value: string | null): string {
  const normalized = value?.toLowerCase();
  if (normalized === 'pass' || normalized === 'accept' || normalized === 'match' || normalized === 'recorded' || normalized === 'present') {
    return 'record-chip record-chip--success';
  }
  if (normalized === 'warn' || normalized === 'revise' || normalized === 'not-checked' || normalized === 'missing') {
    return 'record-chip record-chip--warning';
  }
  if (normalized === 'fail' || normalized === 'reject' || normalized === 'mismatch' || normalized === 'unreadable') {
    return 'record-chip record-chip--broken';
  }
  return 'record-chip';
}

function PlanSection({ plan }: { plan: PagePlanBody }): JSX.Element {
  const sanitizedPlan = useMemo(() => sanitizeMarkdown(plan.body), [plan.body]);

  return (
    <section className="xray-event-section" aria-labelledby="xray-plan-body-title">
      <h4 id="xray-plan-body-title">Page Plan (rendering instructions, not reader prose)</h4>
      <p className="xray-empty-note">{plan.sourcePath}</p>
      <div className="xray-markdown-body" dangerouslySetInnerHTML={{ __html: sanitizedPlan }} />
    </section>
  );
}

function ValidationRows({ receipt }: { receipt: Record<string, unknown> }): JSX.Element {
  const checks = typeof receipt.checks === 'object' && receipt.checks !== null ? receipt.checks as Record<string, unknown> : {};
  const profileFidelity = Array.isArray(receipt.profile_fidelity) ? receipt.profile_fidelity : [];

  return (
    <table className="xray-validation-table">
      <thead>
        <tr>
          <th scope="col">Validation surface</th>
          <th scope="col">Verdict</th>
        </tr>
      </thead>
      <tbody>
        {validationSurfaces.map(([key, label]) => {
          const verdict = stringValue(checks[key]) ?? 'not-checked';
          return (
            <tr key={key}>
              <th scope="row">{label}</th>
              <td>
                <span className={verdictClass(verdict)}>{verdict}</span>
              </td>
            </tr>
          );
        })}
        <tr>
          <th scope="row">STCHAR fidelity</th>
          <td>
            {profileFidelity.length === 0 ? (
              <span className={verdictClass('not-checked')}>not-checked</span>
            ) : (
              <ul className="xray-structured-list">
                {profileFidelity.map((entry, index) => {
                  const block = typeof entry === 'object' && entry !== null ? entry as Record<string, unknown> : {};
                  const stcharId = stringValue(block.stchar_id) ?? `profile ${index + 1}`;
                  const verdicts = ['voice_fidelity', 'appraisal_fidelity', 'pressure_behavior_fidelity', 'relationship_conduct_fidelity']
                    .map((field) => `${field}: ${stringValue(block[field]) ?? 'not-checked'}`)
                    .join(' · ');
                  return <li key={`${stcharId}-${index}`}>{stcharId} - {verdicts}</li>;
                })}
              </ul>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function ReceiptSection({ receipt }: { receipt: ProseReceiptBody }): JSX.Element {
  const body = receipt.body;
  const verdict = stringValue(body.verdict) ?? stringValue(body.status) ?? 'not recorded';
  const planHashStatus = stringValue(body.plan_hash) ? 'present' : 'missing';

  return (
    <section className="xray-event-section" aria-labelledby="xray-prose-receipt-title">
      <h4 id="xray-prose-receipt-title">Prose Receipt</h4>
      <p className="xray-empty-note">{receipt.sourcePath}</p>
      <div className="record-card__chips" aria-label="Prose receipt summary">
        <span className={verdictClass(verdict)}>Receipt verdict: {verdict}</span>
        <span className={verdictClass(stateHashStatus(body))}>State hash: {stateHashStatus(body)}</span>
        <span className={verdictClass(planHashStatus)}>Plan hash: {planHashStatus}</span>
      </div>
      <ValidationRows receipt={body} />
    </section>
  );
}

export function PlanProseTab({ pageDetail, storySlug, worldSlug }: PlanProseTabProps): JSX.Element {
  const currentPageId = pageId(pageDetail);
  const [planState, setPlanState] = useState<ResourceState<PagePlanBody>>({ status: 'loading', value: null, error: null });
  const [receiptState, setReceiptState] = useState<ResourceState<ProseReceiptBody>>({ status: 'loading', value: null, error: null });

  useEffect(() => {
    let cancelled = false;

    setPlanState({ status: 'loading', value: null, error: null });
    setReceiptState({ status: 'loading', value: null, error: null });

    void getPagePlan(worldSlug, storySlug, currentPageId)
      .then((result) => {
        if (!cancelled) {
          setPlanState({ status: 'loaded', value: result.payload, error: null });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message = errorMessage(error, 'Unable to load page plan.');
        setPlanState(message === 'missing' ? { status: 'missing', value: null, error: null } : { status: 'error', value: null, error: message });
      });

    void getProseReceipt(worldSlug, storySlug, currentPageId)
      .then((result) => {
        if (!cancelled) {
          setReceiptState({ status: 'loaded', value: result.payload, error: null });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message = errorMessage(error, 'Unable to load prose receipt.');
        setReceiptState(message === 'missing' ? { status: 'missing', value: null, error: null } : { status: 'error', value: null, error: message });
      });

    return () => {
      cancelled = true;
    };
  }, [currentPageId, storySlug, worldSlug]);

  return (
    <section className="xray-tab-panel__body" aria-labelledby="xray-plan-prose-title">
      <h3 id="xray-plan-prose-title">Plan & Prose</h3>
      <aside className="xray-boundary-banner">Plan, prose, and receipt are distinct artifacts. PG is the authoritative page snapshot.</aside>

      {planState.status === 'loading' ? <p role="status">Loading page plan for {currentPageId}.</p> : null}
      {planState.status === 'missing' ? <p className="xray-empty-note">No page plan for this page.</p> : null}
      {planState.status === 'error' ? <p role="alert">{planState.error}</p> : null}
      {planState.status === 'loaded' ? <PlanSection plan={planState.value} /> : null}

      {receiptState.status === 'loading' ? <p role="status">Loading prose receipt for {currentPageId}.</p> : null}
      {receiptState.status === 'missing' ? <p className="xray-empty-note">No receipt for this page.</p> : null}
      {receiptState.status === 'error' ? <p role="alert">{receiptState.error}</p> : null}
      {receiptState.status === 'loaded' ? <ReceiptSection receipt={receiptState.value} /> : null}
    </section>
  );
}
