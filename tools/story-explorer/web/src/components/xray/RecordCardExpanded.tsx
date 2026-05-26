import type { ReactNode } from 'react';

import type { RecordCard, RecordField, RecordLink } from '../../api/client';
import { useDisclosure } from '../disclosure/use-disclosure';
import { RecordCardCompact } from './RecordCardCompact';
import { RawRecordDisclosure } from './RawRecordDisclosure';
import { BrokenReferenceChip } from './BrokenReferenceChip';
import { ProvenanceTrail } from './ProvenanceTrail';

interface StoryContext {
  worldSlug: string;
  storySlug: string;
}

interface RecordCardExpandedProps {
  recordCard: RecordCard;
  storyContext: StoryContext;
  onRecordLinkClick?: (link: RecordLink | string) => void;
  provenanceSlot?: ReactNode;
}

function FieldList({ fields }: { fields: RecordField[] }): JSX.Element | null {
  if (fields.length === 0) {
    return null;
  }

  return (
    <dl className="record-card__fields">
      {fields.map((field) => (
        <div key={`${field.name}:${field.value}`}>
          <dt>{field.name}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RelatedLinks({ links, onRecordLinkClick }: { links: RecordLink[]; onRecordLinkClick?: (link: RecordLink | string) => void }): JSX.Element | null {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="record-card__related" aria-label="Related records">
      {links.map((link) => (
        link.targetExists ? (
          <button className="record-chip record-chip--button" key={link.recordId} onClick={() => onRecordLinkClick?.(link)} type="button">
            {link.label || link.recordId}
          </button>
        ) : (
          <BrokenReferenceChip key={link.recordId} recordId={link.recordId} />
        )
      ))}
    </div>
  );
}

export function RecordCardExpanded({ recordCard, storyContext, onRecordLinkClick, provenanceSlot }: RecordCardExpandedProps): JSX.Element {
  const disclosure = useDisclosure(false);

  return (
    <article className="record-card-expanded" data-xray-record-id={recordCard.recordId} tabIndex={-1}>
      <RecordCardCompact recordCard={recordCard} />
      <button className="record-card-expanded__trigger" type="button" {...disclosure.triggerProps}>
        {disclosure.isOpen ? 'Collapse record' : 'Expand record'}
      </button>
      <div className="record-card-expanded__body" {...disclosure.contentProps}>
        <section aria-label="Primary fields">
          <h5>Primary Fields</h5>
          <FieldList fields={recordCard.primaryFields} />
        </section>
        <section aria-label="Secondary fields">
          <h5>Secondary Fields</h5>
          <FieldList fields={recordCard.secondaryFields} />
        </section>
        <section aria-label="Related record chips">
          <h5>Related Records</h5>
          <RelatedLinks links={recordCard.links} onRecordLinkClick={onRecordLinkClick} />
        </section>
        {disclosure.isOpen ? (
          <section aria-label="Provenance">
            <h5>Provenance</h5>
            {provenanceSlot ?? (
              <ProvenanceTrail
                onRecordLinkClick={onRecordLinkClick}
                recordId={recordCard.recordId}
                storyContext={storyContext}
              />
            )}
          </section>
        ) : null}
        {recordCard.rawAvailable ? (
          <RawRecordDisclosure
            recordId={recordCard.recordId}
            storySlug={storyContext.storySlug}
            worldSlug={storyContext.worldSlug}
          />
        ) : null}
      </div>
    </article>
  );
}
