import type { ReactNode } from 'react';

import type { RecordCard, RecordField, RecordLink } from '../../api/client';
import { useDisclosure } from '../disclosure/use-disclosure';
import { RecordCardCompact } from './RecordCardCompact';
import { RawRecordDisclosure } from './RawRecordDisclosure';

interface StoryContext {
  worldSlug: string;
  storySlug: string;
}

interface RecordCardExpandedProps {
  recordCard: RecordCard;
  storyContext: StoryContext;
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

function RelatedLinks({ links }: { links: RecordLink[] }): JSX.Element | null {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="record-card__related" aria-label="Related records">
      {links.map((link) => (
        <span className={link.targetExists ? 'record-chip' : 'record-chip record-chip--broken'} key={link.recordId}>
          {link.label || link.recordId}
        </span>
      ))}
    </div>
  );
}

export function RecordCardExpanded({ recordCard, storyContext, provenanceSlot }: RecordCardExpandedProps): JSX.Element {
  const disclosure = useDisclosure(false);

  return (
    <article className="record-card-expanded">
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
          <RelatedLinks links={recordCard.links} />
        </section>
        {provenanceSlot ? (
          <section aria-label="Provenance">
            <h5>Provenance</h5>
            {provenanceSlot}
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
