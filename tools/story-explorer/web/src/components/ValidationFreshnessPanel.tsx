import type { SceneArtifactAvailability, ScenePublicationState } from '../api/client';

interface ValidationFreshnessPanelProps {
  publicationState: ScenePublicationState;
  artifactAvailability: SceneArtifactAvailability;
}

interface PublicationDescriptor {
  tone: string;
  validation: string;
}

// Publication/freshness is presence-based (SPEC-96 pruned hash-derived freshness);
// every descriptor is derived purely from the ScenePublicationState label.
const PUBLICATION_DESCRIPTORS: Record<ScenePublicationState, PublicationDescriptor> = {
  planned: { tone: 'info', validation: 'Planned — no rendered prose attached yet.' },
  'prose-present': { tone: 'info', validation: 'Prose rendered but not yet attached (no receipt).' },
  'attached:PASS': { tone: 'success', validation: 'Prose attached; attachment receipt verdict PASS.' },
  'attached:WARN': { tone: 'warning', validation: 'Prose attached; attachment receipt verdict WARN.' },
  'attached:FAIL': { tone: 'error', validation: 'Prose attached; attachment receipt verdict FAIL.' },
  superseded: { tone: 'muted', validation: 'Scene superseded by a later render unit.' },
};

function availabilityLabel(availability: SceneArtifactAvailability): string {
  const present: string[] = [];
  if (availability.hasPlan) {
    present.push('plan');
  }
  if (availability.hasProse) {
    present.push('prose');
  }
  if (availability.hasReceipt) {
    present.push('receipt');
  }
  return present.length === 0 ? 'no artifacts present' : present.join(' · ');
}

export function ValidationFreshnessPanel({
  publicationState,
  artifactAvailability,
}: ValidationFreshnessPanelProps): JSX.Element {
  const descriptor = PUBLICATION_DESCRIPTORS[publicationState];

  return (
    <section className="validation-freshness-panel" aria-labelledby="validation-freshness-title">
      <h2 id="validation-freshness-title">Validation &amp; freshness</h2>
      <p className="validation-freshness-panel__chip-row">
        <span
          className={`publication-chip publication-chip--${descriptor.tone}`}
          data-testid="publication-chip"
        >
          {publicationState}
        </span>
      </p>
      <p className="validation-freshness-panel__validation" data-testid="validation-summary">
        {descriptor.validation}
      </p>
      <p className="validation-freshness-panel__freshness" data-testid="freshness-summary">
        Freshness is presence-based: {availabilityLabel(artifactAvailability)}.
      </p>
    </section>
  );
}
