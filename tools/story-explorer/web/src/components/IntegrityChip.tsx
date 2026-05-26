import { useId, useState } from 'react';

import type { ValidationIntegritySummary } from '../api/client';

interface IntegrityChipProps {
  validationIntegrity: ValidationIntegritySummary;
}

type IntegrityTone = 'clean' | 'warning' | 'broken';

function integrityTone(validationIntegrity: ValidationIntegritySummary): IntegrityTone {
  if (validationIntegrity.proseStatus === 'hash_mismatch') {
    return 'broken';
  }

  if (validationIntegrity.proseStatus !== 'present' || validationIntegrity.receiptVerdict === null) {
    return 'warning';
  }

  const verdict = validationIntegrity.receiptVerdict.toLowerCase();
  if (verdict.includes('fail') || verdict.includes('error') || verdict.includes('mismatch')) {
    return 'broken';
  }

  if (verdict.includes('warn')) {
    return 'warning';
  }

  return 'clean';
}

function labelForTone(tone: IntegrityTone): string {
  switch (tone) {
    case 'clean':
      return 'Integrity clean';
    case 'warning':
      return 'Integrity warning';
    case 'broken':
      return 'Integrity issue';
  }

  const exhaustiveTone: never = tone;
  return exhaustiveTone;
}

function markForTone(tone: IntegrityTone): string {
  switch (tone) {
    case 'clean':
      return 'OK';
    case 'warning':
      return '!';
    case 'broken':
      return 'X';
  }

  const exhaustiveTone: never = tone;
  return exhaustiveTone;
}

export function IntegrityChip({ validationIntegrity }: IntegrityChipProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useId();
  const tone = integrityTone(validationIntegrity);
  const label = labelForTone(tone);

  return (
    <span className="integrity-chip-wrap">
      <button
        className={`integrity-chip integrity-chip--${tone}`}
        type="button"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span aria-hidden="true">{markForTone(tone)}</span>
        <span>{label}</span>
      </button>
      <span className="integrity-popover" id={popoverId} role="status" hidden={!isOpen}>
        <span>Prose: {validationIntegrity.proseStatus}</span>
        <span>Receipt: {validationIntegrity.receiptVerdict ?? 'not attached'}</span>
      </span>
    </span>
  );
}
