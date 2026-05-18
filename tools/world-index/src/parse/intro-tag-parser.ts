export type MidstoryIntroductionClass = "CLK" | "STSEC" | "STQ" | "THR" | "STENT" | "SREL";

const CLK_TRIGGERS = [
  "deadline_declared",
  "pursuit_started",
  "exposure_accumulation_started",
  "faction_mobilized",
  "environmental_degradation_started",
  "mission_or_race_started",
  "staged_danger_became_trackable"
] as const;

const STSEC_TRIGGERS = [
  "lie_made_hidden_truth_branch_relevant",
  "hidden_truth_constrains_action",
  "clue_carrier_enters_play",
  "holder_access_changed",
  "protected_mystery_story_secret_needed"
] as const;

const STQ_TRIGGERS = [
  "promise_made",
  "explicit_question_raised",
  "unexplained_evidence_introduced",
  "affordance_setup_introduced",
  "open_decision_created"
] as const;

const THR_TRIGGERS = [
  "new_ongoing_causal_concern",
  "investigation_line_opened",
  "recovery_line_opened",
  "negotiation_line_opened",
  "mission_line_opened",
  "social_fallout_line_opened"
] as const;

const STENT_TRIGGERS = [
  "actor_enters_branch",
  "witness_needed",
  "information_source_enters",
  "pressure_driver_enters",
  "counterparty_enters",
  "choice_target_enters"
] as const;

const SREL_TRIGGERS = [
  "alliance_forms",
  "rivalry_forms",
  "debt_relation_forms",
  "authority_relation_forms",
  "trust_axis_becomes_relevant",
  "intimacy_axis_becomes_relevant",
  "hostility_axis_becomes_relevant"
] as const;

export const MIDSTORY_TRIGGERS_CLK = CLK_TRIGGERS;
export const MIDSTORY_TRIGGERS_STSEC = STSEC_TRIGGERS;
export const MIDSTORY_TRIGGERS_STQ = STQ_TRIGGERS;
export const MIDSTORY_TRIGGERS_THR = THR_TRIGGERS;
export const MIDSTORY_TRIGGERS_STENT = STENT_TRIGGERS;
export const MIDSTORY_TRIGGERS_SREL = SREL_TRIGGERS;

export const MIDSTORY_TRIGGERS_BY_CLASS: Readonly<Record<MidstoryIntroductionClass, readonly string[]>> = {
  CLK: CLK_TRIGGERS,
  STSEC: STSEC_TRIGGERS,
  STQ: STQ_TRIGGERS,
  THR: THR_TRIGGERS,
  STENT: STENT_TRIGGERS,
  SREL: SREL_TRIGGERS
};

export const INTRO_TAG_PATTERN =
  /intro:(CLK|STSEC|STQ|THR|STENT|SREL)\(id=([A-Z]+-(?:0|[1-9][0-9]*)), trigger=([a-z_]+), evidence=\[([A-Z0-9,\-]*)\], distinct_from=\[([A-Z0-9,\-]*)\]\)/g;

const INTRO_TAG_PARSE_PATTERN =
  /^intro:(CLK|STSEC|STQ|THR|STENT|SREL)\s*\(\s*id\s*=\s*([A-Z]+-(?:0|[1-9][0-9]*))\s*,\s*trigger\s*=\s*([a-z_]+)\s*,\s*evidence\s*=\s*\[([A-Z0-9,\-\s]*)\]\s*,\s*distinct_from\s*=\s*\[([A-Z0-9,\-\s]*)\]\s*\)$/;
const RECORD_ID_PATTERN = /^[A-Z]+-(?:0|[1-9][0-9]*)$/;

export interface ParsedIntroTag {
  class: MidstoryIntroductionClass;
  recordId: string;
  trigger: string;
  evidence: string[];
  distinctFrom: string[];
}

export class MidstoryIntroductionTagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

const TagError = MidstoryIntroductionTagError;

export function parseIntroTag(rationale: string): ParsedIntroTag | null {
  const tag = firstIntroTag(rationale);
  return tag === null ? null : parseExactIntroTag(tag);
}

export function extractIntroTags(rationale: string): ParsedIntroTag[] {
  const tags = introTagCandidates(rationale);
  return tags.map((tag) => parseExactIntroTag(tag));
}

function firstIntroTag(rationale: string): string | null {
  return introTagCandidates(rationale)[0] ?? null;
}

function introTagCandidates(rationale: string): string[] {
  const candidates: string[] = [];
  let cursor = 0;

  while (cursor < rationale.length) {
    const start = rationale.indexOf("intro:", cursor);
    if (start === -1) {
      break;
    }

    const close = rationale.indexOf(")", start);
    if (close === -1) {
      throw new TagError("Malformed intro tag: missing closing parenthesis.");
    }

    candidates.push(rationale.slice(start, close + 1));
    cursor = close + 1;
  }

  return candidates;
}

function parseExactIntroTag(tag: string): ParsedIntroTag {
  const match = INTRO_TAG_PARSE_PATTERN.exec(tag);
  if (match === null) {
    throw new TagError(
      "Malformed intro tag: expected fields id, trigger, evidence, and distinct_from in that order."
    );
  }

  const recordClass = match[1] as MidstoryIntroductionClass;
  const recordId = match[2] ?? "";
  const trigger = match[3] ?? "";
  const evidence = parseRecordList(match[4] ?? "", "evidence");
  const distinctFrom = parseRecordList(match[5] ?? "", "distinct_from");

  if (!MIDSTORY_TRIGGERS_BY_CLASS[recordClass].includes(trigger)) {
    throw new TagError(
      `Malformed intro tag: field trigger=${trigger} is not valid for class ${recordClass}.`
    );
  }

  return {
    class: recordClass,
    recordId,
    trigger,
    evidence,
    distinctFrom
  };
}

function parseRecordList(raw: string, field: "evidence" | "distinct_from"): string[] {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const records = trimmed.split(",").map((record) => record.trim());
  const invalid = records.find((record) => !RECORD_ID_PATTERN.test(record));
  if (invalid !== undefined) {
    throw new TagError(
      `Malformed intro tag: field ${field} contains invalid record id ${invalid}.`
    );
  }
  return records;
}
