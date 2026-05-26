import type { ProseStatus } from '../api/client';

type MissingProseStatus = Exclude<ProseStatus, 'present'>;

interface ProseMissingPlaceholderProps {
  status: MissingProseStatus;
}

const placeholderCopy: Record<MissingProseStatus, { heading: string; body: string }> = {
  missing: {
    heading: 'Rendered prose not attached yet.',
    body: "This page's state, choices, event delta, and records are available below.",
  },
  unreadable: {
    heading: 'Prose file present but unreadable.',
    body: 'See Validation & Integrity in State X-Ray.',
  },
  hash_mismatch: {
    heading: 'Prose receipt indicates hash mismatch.',
    body: 'See Validation & Integrity.',
  },
};

export function ProseMissingPlaceholder({ status }: ProseMissingPlaceholderProps): JSX.Element {
  const copy = placeholderCopy[status];

  return (
    <div className="prose-missing-placeholder" data-prose-status={status}>
      <div className="prose-missing-placeholder__mark" aria-hidden="true">
        PG
      </div>
      <div className="prose-missing-placeholder__copy">
        <p className="prose-missing-placeholder__title">{copy.heading}</p>
        <p>{copy.body}</p>
      </div>
      <button
        className="prose-missing-placeholder__target"
        type="button"
        disabled
        aria-disabled="true"
        title="SPEC-89 will wire this scroll target"
      >
        View page plan in State X-Ray
      </button>
    </div>
  );
}
