import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RecordCard, RecordField, RecordGroup, RecordLink } from '../../../api/client';
import { CompactLine, compactLineCacheKey } from '../RecordCardRenderers';

const GROUP_BY_CLASS: Record<string, RecordGroup> = {
  BEL: 'Knowledge & Truth',
  BR: 'Event Delta',
  CHC: 'Event Delta',
  CLK: 'Pressure & Open Loops',
  CNSQ: 'Pressure & Open Loops',
  DA: 'Knowledge & Truth',
  OBL: 'Relationships & Debts',
  SE: 'Event Delta',
  SF: 'Knowledge & Truth',
  SLT: 'Plans & Emotion',
  SREL: 'Relationships & Debts',
  STCHAR: 'Cast & Status',
  STEMO: 'Plans & Emotion',
  STENT: 'Cast & Status',
  STINT: 'Plans & Emotion',
  STLOC: 'Scene & Affordances',
  STOBJ: 'Scene & Affordances',
  STPLAN: 'Plans & Emotion',
  STQ: 'Pressure & Open Loops',
  STSEC: 'Knowledge & Truth',
  STSTAT: 'Cast & Status',
  THR: 'Pressure & Open Loops',
};

function link(recordClass: string, recordId = `${recordClass}-9`): RecordLink {
  return {
    recordId,
    recordClass,
    label: recordId,
    relationship: 'references',
    targetExists: true,
    activeOnCurrentPage: true,
    targetPageId: recordClass === 'PG' ? recordId : null,
    brokenReason: null,
  };
}

function recordCard(
  recordClass: string,
  fields: RecordField[],
  overrides: Partial<RecordCard> = {},
): RecordCard {
  return {
    recordId: `${recordClass}-1`,
    recordClass,
    group: GROUP_BY_CLASS[recordClass] ?? 'Validation & Integrity',
    summaryLine: `${recordClass} fallback summary`,
    chips: [],
    primaryFields: fields,
    secondaryFields: [],
    status: null,
    visibility: null,
    confidence: null,
    urgency: null,
    participants: [],
    provenance: {
      createdAtPage: 'PG-1',
      creatingEventId: 'SE-1',
      modifyingEventIds: [],
      evidenceRecordIds: [],
    },
    links: [],
    rawAvailable: true,
    sourcePath: `fixture/${recordClass}-1.yaml`,
    contentHash: `hash-${recordClass}`,
    ...overrides,
  };
}

describe('RecordCardRenderers', () => {
  it.each([
    ['STENT', [{ name: 'display_name', value: 'Lyra' }, { name: 'world_ent_id', value: 'ENT-1' }], { links: [link('STCHAR')] }, ['STENT-1', 'Lyra', 'world-bound ENT-1', 'STCHAR 1']],
    ['STCHAR', [{ name: 'title', value: 'Lyra of Ash' }, { name: 'source_char_id', value: 'CHAR-1' }], { links: [link('STENT')] }, ['STCHAR-1', 'Lyra of Ash', 'STENT 1', 'CHAR CHAR-1']],
    ['STSTAT', [{ name: 'entity', value: 'STENT-1' }, { name: 'status_label', value: 'wounded' }], { visibility: 'hidden', urgency: 'severe' }, ['STSTAT-1', 'STENT-1', 'wounded', 'severe/hidden']],
    ['BEL', [{ name: 'holder', value: 'STCHAR-1' }, { name: 'claim', value: 'The gate is watched' }, { name: 'truth_relation', value: 'uncertain' }], { confidence: 'low', visibility: 'hidden' }, ['BEL-1', 'holder STCHAR-1', '"The gate is watched"', 'uncertain', 'low', 'hidden']],
    ['SF', [{ name: 'claim', value: 'Gate guards rotate nightly' }, { name: 'authority', value: 'derived' }, { name: 'derived_from', value: 'CF-1' }], {}, ['SF-1', '"Gate guards rotate nightly"', 'derived', 'derived-from CF-1']],
    ['SE', [{ name: 'event_kind', value: 'choice-resolution' }, { name: 'actor', value: 'STCHAR-1' }, { name: 'targets', value: 'STENT-2' }, { name: 'outcome_route', value: 'success' }, { name: 'selected_slt_id', value: 'SLT-3' }], {}, ['SE-1', 'choice-resolution', 'STCHAR-1 -> STENT-2', 'success', 'SLT SLT-3']],
    ['CHC', [{ name: 'surface_label', value: 'Open the gate' }, { name: 'player_visible_intent', value: 'Enter quietly' }, { name: 'likely_state_pressure', value: 'alarm' }, { name: 'grounded_in', value: '2' }], { links: [link('PG')] }, ['CHC-1', '"Open the gate"', 'Enter quietly', 'pressure alarm', 'grounded-in 2', 'child-outcomes 1']],
    ['OBL', [{ name: 'owed_by', value: 'STCHAR-1' }, { name: 'owed_to', value: 'STCHAR-2' }, { name: 'description', value: 'Repay the guide' }], { status: 'open', urgency: 'soon' }, ['OBL-1', 'STCHAR-1 -> STCHAR-2', '"Repay the guide"', 'open', 'soon']],
    ['CNSQ', [{ name: 'description', value: 'The watch is alerted' }, { name: 'derived_from', value: 'SE-1' }], { status: 'active', urgency: 'high' }, ['CNSQ-1', '"The watch is alerted"', 'active', 'high', 'derived-from SE-1']],
    ['THR', [{ name: 'title', value: 'Gatehouse suspicion' }, { name: 'pressure', value: 'mounting' }, { name: 'derived_from', value: 'SE-1' }], { status: 'open', links: [link('OBL')] }, ['THR-1', '"Gatehouse suspicion"', 'open', 'mounting', 'obligations 1', 'derived-from SE-1']],
    ['SREL', [{ name: 'participants', value: 'STCHAR-1, STCHAR-2' }, { name: 'relationship_kind', value: 'rivalry' }, { name: 'polarity', value: 'negative' }, { name: 'intensity', value: 'strong' }], { status: 'active' }, ['SREL-1', 'STCHAR-1, STCHAR-2', 'rivalry', 'negative/strong', 'active']],
    ['STINT', [{ name: 'holder', value: 'STCHAR-1' }, { name: 'objective', value: 'Reach the archive' }, { name: 'supersedes', value: 'STINT-0' }], { status: 'active', urgency: 'urgent' }, ['STINT-1', 'holder STCHAR-1', '"Reach the archive"', 'active', 'urgent', 'supersedes STINT-0']],
    ['STLOC', [{ name: 'label', value: 'North Gate' }, { name: 'current_scene_role', value: 'threshold' }, { name: 'access', value: 'locked' }], {}, ['STLOC-1', '"North Gate"', 'threshold', 'locked', 'created at PG-1']],
    ['STOBJ', [{ name: 'object_name', value: 'Iron key' }, { name: 'location', value: 'STLOC-1' }, { name: 'access', value: 'usable' }], { status: 'held' }, ['STOBJ-1', '"Iron key"', 'STLOC-1', 'usable', 'held']],
    ['DA', [{ name: 'title', value: 'Guard roster' }, { name: 'artifact_type', value: 'ledger' }, { name: 'holder', value: 'STCHAR-1' }, { name: 'maturity', value: 'realized' }, { name: 'source_records', value: 'SF-1' }], {}, ['DA-1', '"Guard roster"', 'ledger', 'STCHAR-1', 'realized', 'sources SF-1']],
    ['CLK', [{ name: 'title', value: 'Alarm clock' }, { name: 'current_value', value: '2' }, { name: 'threshold', value: '4' }, { name: 'driver', value: 'noise' }, { name: 'last_tick_event', value: 'SE-1' }], { status: 'ticking' }, ['CLK-1', '"Alarm clock"', '2/4', 'driver noise', 'ticking', 'last-tick SE-1']],
    ['STSEC', [{ name: 'secret_label', value: 'Hidden entrance' }, { name: 'holders', value: 'STCHAR-1' }, { name: 'clue_count', value: '3' }, { name: 'protected_mystery_refs', value: 'M-1' }], { status: 'unrevealed', visibility: 'hidden' }, ['STSEC-1', '"Hidden entrance"', 'holders STCHAR-1', 'hidden/unrevealed', 'clue-count 3', 'protects M-1']],
    ['STQ', [{ name: 'question_text', value: 'Who betrayed the guard?' }, { name: 'source_records', value: 'SF-1' }, { name: 'payoff_records', value: 'SF-9' }], { status: 'open', urgency: 'medium' }, ['STQ-1', '"Who betrayed the guard?"', 'open', 'sources SF-1', 'answer SF-9', 'medium']],
    ['STPLAN', [{ name: 'holder', value: 'STCHAR-1' }, { name: 'objective', value: 'Bypass the watch' }, { name: 'current_step', value: 'wait for bell' }, { name: 'root_intention', value: 'STINT-1' }, { name: 'blockers', value: 'locked gate' }, { name: 'success_condition', value: 'inside unseen' }], { status: 'active' }, ['STPLAN-1', 'holder STCHAR-1', '"Bypass the watch"', 'step wait for bell', 'root STINT-1', 'blockers locked gate', 'success inside unseen']],
    ['STEMO', [{ name: 'holder', value: 'STCHAR-1' }, { name: 'affect_kind', value: 'fear' }, { name: 'appraisal', value: 'cornered' }, { name: 'orientation', value: 'toward gate' }, { name: 'trigger_event', value: 'SE-1' }], { urgency: 'sharp' }, ['STEMO-1', 'holder STCHAR-1', 'fear/cornered', 'intensity sharp', 'toward toward gate', 'trigger SE-1']],
    ['BR', [{ name: 'label', value: 'West breach' }, { name: 'parent_branch_id', value: 'BR-0' }, { name: 'forked_at_page_id', value: 'PG-2' }, { name: 'root_page_id', value: 'PG-1' }, { name: 'current_leaf', value: 'PG-4' }], {}, ['BR-1', '"West breach"', 'parent BR-0', 'forked at PG-2', 'root PG-1', 'leaf PG-4']],
    ['SLT', [{ name: 'move_family', value: 'infiltration' }, { name: 'scope.visibility', value: 'author' }, { name: 'scope.branch_id', value: 'BR-1' }, { name: 'saliency.urgency', value: 'high' }, { name: 'compatible_turn_drivers', value: 'choice' }, { name: 'precondition_count', value: '2' }, { name: 'effect_count', value: '3' }], {}, ['SLT-1', 'infiltration', 'scope author', 'branch BR-1', 'saliency high', 'drivers choice', 'preconds 2', 'effects 3']],
  ])('renders the %s compact line from RecordCard fields', (recordClass, fields, overrides, expectedParts) => {
    render(<CompactLine recordCard={recordCard(recordClass, fields as RecordField[], overrides as Partial<RecordCard>)} />);

    const rendered = screen.getByText((content) => expectedParts.every((part) => content.includes(part)));
    expect(rendered).toBeInTheDocument();
  });

  it('falls back to the server-provided summary line for unknown classes', () => {
    render(<CompactLine recordCard={recordCard('MISC', [], { summaryLine: 'Server fallback' })} />);

    expect(screen.getByText('MISC-1 · MISC · Server fallback')).toBeInTheDocument();
  });

  it('keys memoization by record ID and content hash', () => {
    expect(compactLineCacheKey(recordCard('BEL', [], { contentHash: 'abc' }))).toBe('BEL-1:abc');
    expect(compactLineCacheKey(recordCard('BEL', [], { contentHash: null }))).toBe('BEL-1:no-hash');
  });
});
