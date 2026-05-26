import type { ReactNode } from 'react';

import type { RecordCard, RecordGroup } from '../../api/client';
import { useDisclosure } from '../disclosure/use-disclosure';
import { groupAnchorId } from './groupActiveRecords';

interface XRayGroupProps {
  group: RecordGroup;
  records: RecordCard[];
  children: ReactNode;
  initialOpen?: boolean;
}

function countMatching(records: RecordCard[], key: 'visibility' | 'confidence', predicate: (value: string) => boolean): number {
  return records.filter((record) => {
    const value = record[key];
    return value !== null && predicate(value.toLowerCase());
  }).length;
}

function groupChipLabels(group: RecordGroup, records: RecordCard[]): string[] {
  const hiddenCount = countMatching(records, 'visibility', (value) => value.includes('hidden') || value.includes('secret'));
  const lowConfidenceCount = countMatching(records, 'confidence', (value) => value.includes('low'));
  const chips = [`${records.length} active`];

  if (hiddenCount > 0) {
    chips.push(`${hiddenCount} hidden`);
  }

  if (lowConfidenceCount > 0) {
    chips.push(`${lowConfidenceCount} low-confidence`);
  }

  return [`${group} · ${chips.join(' · ')}`];
}

export function XRayGroup({ group, records, children, initialOpen = true }: XRayGroupProps): JSX.Element {
  const disclosure = useDisclosure(initialOpen);
  const headerLabel = groupChipLabels(group, records)[0];
  const headingId = groupAnchorId(group);

  return (
    <section className="xray-group" aria-labelledby={headingId}>
      <h3 className="xray-group__heading">
        <button
          className="xray-group__trigger"
          id={headingId}
          type="button"
          {...disclosure.triggerProps}
        >
          {headerLabel}
        </button>
      </h3>
      <div className="xray-group__content" {...disclosure.contentProps}>
        {children}
      </div>
    </section>
  );
}
