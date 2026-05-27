import { useMemo } from 'react';

import type { RecordCard, RecordField } from '../../api/client';

interface CompactLineProps {
  recordCard: RecordCard;
}

type Renderer = (recordCard: RecordCard) => string[];

const FIELD_ALIASES: Record<string, string[]> = {
  actor: ['actor'],
  access: ['access', 'access_notes'],
  affect: ['affect_kind', 'emotion'],
  appraisal: ['appraisal', 'description', 'reason'],
  artifactType: ['artifact_type', 'genre'],
  authority: ['authority', 'truth_relation'],
  blockers: ['blockers'],
  branchId: ['scope.branch_id', 'branch_scope'],
  claim: ['claim', 'statement'],
  clueCount: ['clue_count', 'clue carrier count'],
  compatibleTurnDrivers: ['compatible_turn_drivers'],
  currentLeaf: ['current_leaf', 'leaf_page_id'],
  currentSceneRole: ['current_scene_role', 'scene_role'],
  currentStep: ['current_step', 'next_steps'],
  currentValue: ['current_value', 'current_tick'],
  derivedFrom: ['derived_from'],
  description: ['description', 'obligation_text', 'consequence_statement'],
  driver: ['driver', 'turn_driver'],
  effectCount: ['effect_count'],
  entity: ['entity'],
  eventKind: ['event_kind'],
  evidenceRecords: ['evidence_records'],
  forkedAtPage: ['forked_at_page_id'],
  groundedIn: ['grounded_in'],
  holder: ['holder'],
  holders: ['holders'],
  intensity: ['intensity'],
  lastTickEvent: ['last_tick_event'],
  location: ['location', 'current_location'],
  maturity: ['maturity', 'access'],
  moveFamily: ['move_family'],
  objective: ['objective', 'intent'],
  objectName: ['object_name', 'label', 'name'],
  orientation: ['orientation', 'target'],
  outcomeRoute: ['outcome_route'],
  owedBy: ['owed_by'],
  owedTo: ['owed_to'],
  participants: ['participants'],
  parentBranch: ['parent_branch_id'],
  payoffRecords: ['payoff_records', 'answer_records'],
  playerIntent: ['player_visible_intent'],
  polarity: ['polarity', 'valence'],
  preconditionCount: ['precondition_count'],
  pressure: ['pressure', 'likely_state_pressure'],
  protectedMysteries: ['protected_mystery_refs'],
  questionText: ['question_text', 'question_or_setup'],
  relationshipKind: ['relationship_kind', 'axis'],
  regenerationReason: ['regeneration_reason', 'created_from'],
  rootIntention: ['root_intention'],
  rootPage: ['root_page_id'],
  saliencyUrgency: ['saliency.urgency', 'salience'],
  scopeVisibility: ['scope.visibility', 'author_scope.visibility', 'scope_visibility'],
  secretLabel: ['secret_label', 'secret_claim'],
  selectedSlt: ['selected_slt_id', 'commitment.selected_slt_id'],
  sourceChar: ['source_char_id', 'source_character'],
  sourceRecords: ['source_records'],
  statusLabel: ['status_label', 'value', 'life', 'status'],
  successCondition: ['success_condition', 'current_step.success_condition'],
  supersedes: ['supersedes'],
  supersessionStatus: ['supersession_status', 'status'],
  surfaceLabel: ['surface_label'],
  targetCount: ['target_count'],
  targets: ['targets'],
  threshold: ['threshold', 'max_tick'],
  title: ['title', 'label', 'name', 'display_name'],
  triggerEvent: ['trigger_event'],
  truthRelation: ['truth_relation'],
  urgency: ['urgency'],
  visibility: ['visibility', 'audience_visibility', 'pov_visibility'],
  worldEntId: ['world_ent_id'],
};

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function fieldValue(recordCard: RecordCard, aliasKey: keyof typeof FIELD_ALIASES): string | null {
  const candidates = (FIELD_ALIASES[aliasKey] ?? []).map(normalizeName);
  const fields = [...recordCard.primaryFields, ...recordCard.secondaryFields];
  const match = fields.find((field: RecordField) => candidates.includes(normalizeName(field.name)));
  return match?.value ?? null;
}

function maybe(label: string, value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim().length === 0) {
    return null;
  }
  return `${label} ${value}`;
}

function quoted(value: string | null): string | null {
  return value === null ? null : `"${value}"`;
}

function title(recordCard: RecordCard): string {
  return fieldValue(recordCard, 'title') ?? recordCard.summaryLine;
}

function createdAt(recordCard: RecordCard): string | null {
  return maybe('created at', recordCard.provenance.createdAtPage);
}

function linkCount(recordCard: RecordCard, recordClass: string): string | null {
  const count = recordCard.links.filter((link) => link.recordClass === recordClass).length;
  return count > 0 ? String(count) : null;
}

function countFromFieldOrLinks(recordCard: RecordCard, aliasKey: keyof typeof FIELD_ALIASES, recordClass: string): string | null {
  return fieldValue(recordCard, aliasKey) ?? linkCount(recordCard, recordClass);
}

function deltaSummary(recordCard: RecordCard): string | null {
  const create = fieldValue(recordCard, 'clueCount');
  const supersede = fieldValue(recordCard, 'supersedes');
  return (create ?? supersede) !== null ? `delta ${create ?? 0} / ${supersede ?? 0} / 0` : null;
}

function renderParts(...parts: Array<string | null | undefined>): string[] {
  return parts.filter((part): part is string => part !== null && part !== undefined && part.trim().length > 0);
}

const RENDERERS: Record<string, Renderer> = {
  BEL: (recordCard) =>
    renderParts(
      recordCard.recordId,
      maybe('holder', fieldValue(recordCard, 'holder')),
      quoted(fieldValue(recordCard, 'claim') ?? recordCard.summaryLine),
      fieldValue(recordCard, 'truthRelation'),
      recordCard.confidence,
      recordCard.visibility,
      maybe('basis', fieldValue(recordCard, 'driver')),
    ),
  BR: (recordCard) =>
    renderParts(
      recordCard.recordId,
      quoted(title(recordCard)),
      maybe('parent', fieldValue(recordCard, 'parentBranch')),
      maybe('forked at', fieldValue(recordCard, 'forkedAtPage')),
      maybe('root', fieldValue(recordCard, 'rootPage')),
      createdAt(recordCard),
      maybe('leaf', fieldValue(recordCard, 'currentLeaf')),
    ),
  CHC: (recordCard) =>
    renderParts(
      recordCard.recordId,
      quoted(fieldValue(recordCard, 'surfaceLabel') ?? recordCard.summaryLine),
      fieldValue(recordCard, 'playerIntent'),
      createdAt(recordCard),
      maybe('pressure', fieldValue(recordCard, 'pressure')),
      maybe('grounded-in', countFromFieldOrLinks(recordCard, 'groundedIn', 'SF')),
      maybe('child-outcomes', countFromFieldOrLinks(recordCard, 'targetCount', 'PG')),
    ),
  CLK: (recordCard) =>
    renderParts(
      recordCard.recordId,
      quoted(title(recordCard)),
      fieldValue(recordCard, 'currentValue') && fieldValue(recordCard, 'threshold')
        ? `${fieldValue(recordCard, 'currentValue')}/${fieldValue(recordCard, 'threshold')}`
        : fieldValue(recordCard, 'currentValue'),
      maybe('driver', fieldValue(recordCard, 'driver')),
      recordCard.status,
      maybe('last-tick', fieldValue(recordCard, 'lastTickEvent')),
    ),
  CNSQ: (recordCard) =>
    renderParts(
      recordCard.recordId,
      quoted(fieldValue(recordCard, 'description') ?? recordCard.summaryLine),
      recordCard.status,
      recordCard.urgency,
      maybe('derived-from', fieldValue(recordCard, 'derivedFrom')),
    ),
  DA: (recordCard) =>
    renderParts(
      recordCard.recordId,
      quoted(title(recordCard)),
      fieldValue(recordCard, 'artifactType'),
      fieldValue(recordCard, 'holder') ?? fieldValue(recordCard, 'location'),
      fieldValue(recordCard, 'maturity'),
      maybe('sources', fieldValue(recordCard, 'sourceRecords')),
    ),
  OBL: (recordCard) =>
    renderParts(
      recordCard.recordId,
      fieldValue(recordCard, 'owedBy') && fieldValue(recordCard, 'owedTo')
        ? `${fieldValue(recordCard, 'owedBy')} -> ${fieldValue(recordCard, 'owedTo')}`
        : null,
      quoted(fieldValue(recordCard, 'description') ?? recordCard.summaryLine),
      recordCard.status,
      recordCard.urgency,
    ),
  SE: (recordCard) =>
    renderParts(
      recordCard.recordId,
      fieldValue(recordCard, 'eventKind') ?? recordCard.summaryLine,
      fieldValue(recordCard, 'actor') && fieldValue(recordCard, 'targets')
        ? `${fieldValue(recordCard, 'actor')} -> ${fieldValue(recordCard, 'targets')}`
        : null,
      fieldValue(recordCard, 'outcomeRoute'),
      maybe('SLT', fieldValue(recordCard, 'selectedSlt')),
      deltaSummary(recordCard),
    ),
  SF: (recordCard) =>
    renderParts(
      recordCard.recordId,
      quoted(fieldValue(recordCard, 'claim') ?? recordCard.summaryLine),
      fieldValue(recordCard, 'authority'),
      maybe('derived-from', fieldValue(recordCard, 'derivedFrom')),
      createdAt(recordCard),
    ),
  SLT: (recordCard) =>
    renderParts(
      recordCard.recordId,
      fieldValue(recordCard, 'moveFamily') ?? recordCard.summaryLine,
      maybe('scope', fieldValue(recordCard, 'scopeVisibility')),
      maybe('branch', fieldValue(recordCard, 'branchId')),
      maybe('saliency', fieldValue(recordCard, 'saliencyUrgency') ?? recordCard.urgency),
      maybe('drivers', fieldValue(recordCard, 'compatibleTurnDrivers')),
      maybe('preconds', fieldValue(recordCard, 'preconditionCount')),
      maybe('effects', fieldValue(recordCard, 'effectCount')),
    ),
  SREL: (recordCard) =>
    renderParts(
      recordCard.recordId,
      fieldValue(recordCard, 'participants'),
      fieldValue(recordCard, 'relationshipKind'),
      fieldValue(recordCard, 'polarity') && fieldValue(recordCard, 'intensity')
        ? `${fieldValue(recordCard, 'polarity')}/${fieldValue(recordCard, 'intensity')}`
        : fieldValue(recordCard, 'polarity') ?? fieldValue(recordCard, 'intensity'),
      recordCard.status,
      maybe('derived-from', fieldValue(recordCard, 'derivedFrom')),
    ),
  STCHAR: (recordCard) =>
    renderParts(
      recordCard.recordId,
      maybe('STENT', linkCount(recordCard, 'STENT')),
      maybe('CHAR', fieldValue(recordCard, 'sourceChar')),
      fieldValue(recordCard, 'supersessionStatus'),
      fieldValue(recordCard, 'regenerationReason'),
    ),
  STEMO: (recordCard) =>
    renderParts(
      recordCard.recordId,
      maybe('holder', fieldValue(recordCard, 'holder')),
      fieldValue(recordCard, 'affect') && fieldValue(recordCard, 'appraisal')
        ? `${fieldValue(recordCard, 'affect')}/${fieldValue(recordCard, 'appraisal')}`
        : fieldValue(recordCard, 'affect') ?? fieldValue(recordCard, 'appraisal') ?? recordCard.summaryLine,
      maybe('intensity', fieldValue(recordCard, 'intensity') ?? recordCard.urgency),
      maybe('toward', fieldValue(recordCard, 'orientation')),
      maybe('trigger', fieldValue(recordCard, 'triggerEvent')),
      maybe('supersedes', fieldValue(recordCard, 'supersedes')),
    ),
  STENT: (recordCard) =>
    renderParts(
      recordCard.recordId,
      title(recordCard),
      maybe('world-bound', fieldValue(recordCard, 'worldEntId')),
      maybe('STCHAR', linkCount(recordCard, 'STCHAR')),
      recordCard.status,
      createdAt(recordCard),
    ),
  STINT: (recordCard) =>
    renderParts(
      recordCard.recordId,
      maybe('holder', fieldValue(recordCard, 'holder')),
      quoted(fieldValue(recordCard, 'objective') ?? recordCard.summaryLine),
      recordCard.status,
      recordCard.urgency,
      maybe('supersedes', fieldValue(recordCard, 'supersedes')),
    ),
  STLOC: (recordCard) =>
    renderParts(
      recordCard.recordId,
      quoted(title(recordCard)),
      fieldValue(recordCard, 'currentSceneRole'),
      fieldValue(recordCard, 'access'),
      createdAt(recordCard),
    ),
  STOBJ: (recordCard) =>
    renderParts(
      recordCard.recordId,
      quoted(fieldValue(recordCard, 'objectName') ?? recordCard.summaryLine),
      fieldValue(recordCard, 'holder') ?? fieldValue(recordCard, 'location'),
      fieldValue(recordCard, 'access'),
      recordCard.status,
      createdAt(recordCard),
    ),
  STPLAN: (recordCard) =>
    renderParts(
      recordCard.recordId,
      maybe('holder', fieldValue(recordCard, 'holder')),
      quoted(fieldValue(recordCard, 'objective') ?? recordCard.summaryLine),
      maybe('step', fieldValue(recordCard, 'currentStep')),
      maybe('root', fieldValue(recordCard, 'rootIntention')),
      recordCard.status,
      maybe('blockers', fieldValue(recordCard, 'blockers')),
      maybe('success', fieldValue(recordCard, 'successCondition')),
      maybe('supersedes', fieldValue(recordCard, 'supersedes')),
    ),
  STQ: (recordCard) =>
    renderParts(
      recordCard.recordId,
      quoted(fieldValue(recordCard, 'questionText') ?? recordCard.summaryLine),
      recordCard.status,
      maybe('sources', fieldValue(recordCard, 'sourceRecords')),
      maybe('answer', fieldValue(recordCard, 'payoffRecords')),
      recordCard.urgency,
    ),
  STSEC: (recordCard) =>
    renderParts(
      recordCard.recordId,
      quoted(fieldValue(recordCard, 'secretLabel') ?? recordCard.summaryLine),
      maybe('holders', fieldValue(recordCard, 'holders')),
      recordCard.visibility && recordCard.status ? `${recordCard.visibility}/${recordCard.status}` : recordCard.visibility ?? recordCard.status,
      maybe('clue-count', fieldValue(recordCard, 'clueCount')),
      maybe('protects', fieldValue(recordCard, 'protectedMysteries')),
    ),
  STSTAT: (recordCard) =>
    renderParts(
      recordCard.recordId,
      fieldValue(recordCard, 'entity'),
      fieldValue(recordCard, 'statusLabel') ?? recordCard.summaryLine,
      recordCard.urgency && recordCard.visibility ? `${recordCard.urgency}/${recordCard.visibility}` : recordCard.urgency ?? recordCard.visibility,
      createdAt(recordCard),
      maybe('supersedes', fieldValue(recordCard, 'supersedes')),
    ),
  THR: (recordCard) =>
    renderParts(
      recordCard.recordId,
      quoted(title(recordCard)),
      recordCard.status,
      fieldValue(recordCard, 'pressure'),
      maybe('obligations', linkCount(recordCard, 'OBL')),
      maybe('derived-from', fieldValue(recordCard, 'derivedFrom')),
    ),
};

export function compactLineCacheKey(recordCard: RecordCard): string {
  return `${recordCard.recordId}:${recordCard.contentHash ?? 'no-hash'}`;
}

export function renderCompactLine(recordCard: RecordCard): JSX.Element {
  const renderer = RENDERERS[recordCard.recordClass];
  const parts = renderer ? renderer(recordCard) : renderParts(recordCard.recordId, recordCard.recordClass, recordCard.summaryLine);

  return (
    <span className="record-card__summary">
      {parts.join(' · ')}
    </span>
  );
}

export function CompactLine({ recordCard }: CompactLineProps): JSX.Element {
  const cacheKey = compactLineCacheKey(recordCard);
  return useMemo(() => renderCompactLine(recordCard), [cacheKey]);
}
