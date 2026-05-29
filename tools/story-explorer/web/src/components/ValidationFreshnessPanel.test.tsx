import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ScenePublicationState } from '../api/client';
import { ValidationFreshnessPanel } from './ValidationFreshnessPanel';

const fullAvailability = { hasPlan: true, hasProse: true, hasReceipt: true };

describe('ValidationFreshnessPanel', () => {
  it('renders the publication state label as a chip', () => {
    render(
      <ValidationFreshnessPanel publicationState="attached:PASS" artifactAvailability={fullAvailability} />,
    );

    expect(screen.getByTestId('publication-chip')).toHaveTextContent('attached:PASS');
  });

  it.each<[ScenePublicationState, string]>([
    ['planned', 'Planned — no rendered prose attached yet.'],
    ['prose-present', 'Prose rendered but not yet attached (no receipt).'],
    ['attached:PASS', 'Prose attached; attachment receipt verdict PASS.'],
    ['attached:WARN', 'Prose attached; attachment receipt verdict WARN.'],
    ['attached:FAIL', 'Prose attached; attachment receipt verdict FAIL.'],
    ['superseded', 'Scene superseded by a later render unit.'],
  ])('derives the validation summary for %s purely from publication state', (state, summary) => {
    render(<ValidationFreshnessPanel publicationState={state} artifactAvailability={fullAvailability} />);

    expect(screen.getByTestId('validation-summary')).toHaveTextContent(summary);
  });

  it('reports presence-based freshness from artifact availability', () => {
    render(
      <ValidationFreshnessPanel
        publicationState="planned"
        artifactAvailability={{ hasPlan: true, hasProse: false, hasReceipt: false }}
      />,
    );

    expect(screen.getByTestId('freshness-summary')).toHaveTextContent('Freshness is presence-based: plan.');
  });

  it('reports no artifacts when none are present', () => {
    render(
      <ValidationFreshnessPanel
        publicationState="planned"
        artifactAvailability={{ hasPlan: false, hasProse: false, hasReceipt: false }}
      />,
    );

    expect(screen.getByTestId('freshness-summary')).toHaveTextContent('no artifacts present');
  });
});
