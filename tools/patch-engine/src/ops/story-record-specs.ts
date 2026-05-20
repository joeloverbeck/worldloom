import type { IdAllocations, OperationKind } from "../envelope/schema.js";

interface StoryRecordSpec {
  allocationKey: keyof IdAllocations;
  idPattern: RegExp;
  nodeType: string;
  prefix: string;
  sourceDir: string;
}

export type StoryRecordOperationKind =
  | "create_stent_record"
  | "create_ststat_record"
  | "create_sf_record"
  | "create_se_record"
  | "create_obl_record"
  | "create_cnsq_record"
  | "create_thr_record"
  | "create_srel_record"
  | "create_stint_record"
  | "create_stloc_record"
  | "create_stobj_record"
  | "create_br_record"
  | "create_pg_record"
  | "create_chc_record"
  | "create_slt_record"
  | "create_bel_record"
  | "create_clk_record"
  | "supersede_clk_record"
  | "create_stsec_record"
  | "supersede_stsec_record"
  | "create_stq_record"
  | "supersede_stq_record"
  | "create_stplan_record"
  | "create_stemo_record"
  | "append_story_character_authority_record"
  | "supersede_story_character_authority_record"
  | "append_story_diegetic_artifact_record";

export const STORY_RECORD_OPERATION_KINDS: readonly StoryRecordOperationKind[] = [
  "create_stent_record",
  "create_ststat_record",
  "create_sf_record",
  "create_se_record",
  "create_obl_record",
  "create_cnsq_record",
  "create_thr_record",
  "create_srel_record",
  "create_stint_record",
  "create_stloc_record",
  "create_stobj_record",
  "create_br_record",
  "create_pg_record",
  "create_chc_record",
  "create_slt_record",
  "create_bel_record",
  "create_clk_record",
  "supersede_clk_record",
  "create_stsec_record",
  "supersede_stsec_record",
  "create_stq_record",
  "supersede_stq_record",
  "create_stplan_record",
  "create_stemo_record",
  "append_story_character_authority_record",
  "supersede_story_character_authority_record",
  "append_story_diegetic_artifact_record"
];

const STORY_RECORD_OPERATION_KIND_SET = new Set<OperationKind>(STORY_RECORD_OPERATION_KINDS);

export const STORY_RECORD_SPECS: Readonly<Record<StoryRecordOperationKind, StoryRecordSpec>> = {
  create_stent_record: {
    allocationKey: "stent_ids",
    idPattern: /^STENT-\d+$/,
    nodeType: "story_entity_record",
    prefix: "STENT",
    sourceDir: "entities"
  },
  create_ststat_record: {
    allocationKey: "ststat_ids",
    idPattern: /^STSTAT-\d+$/,
    nodeType: "story_status_record",
    prefix: "STSTAT",
    sourceDir: "status"
  },
  create_sf_record: {
    allocationKey: "sf_ids",
    idPattern: /^SF-\d+$/,
    nodeType: "story_fact_record",
    prefix: "SF",
    sourceDir: "facts"
  },
  create_se_record: {
    allocationKey: "se_ids",
    idPattern: /^SE-\d+$/,
    nodeType: "story_event_record",
    prefix: "SE",
    sourceDir: "events"
  },
  create_obl_record: {
    allocationKey: "obl_ids",
    idPattern: /^OBL-\d+$/,
    nodeType: "obligation_record",
    prefix: "OBL",
    sourceDir: "obligations"
  },
  create_cnsq_record: {
    allocationKey: "cnsq_ids",
    idPattern: /^CNSQ-\d+$/,
    nodeType: "consequence_record",
    prefix: "CNSQ",
    sourceDir: "consequences"
  },
  create_thr_record: {
    allocationKey: "thr_ids",
    idPattern: /^THR-\d+$/,
    nodeType: "thread_record",
    prefix: "THR",
    sourceDir: "threads"
  },
  create_srel_record: {
    allocationKey: "srel_ids",
    idPattern: /^SREL-\d+$/,
    nodeType: "relationship_record_story",
    prefix: "SREL",
    sourceDir: "relationships"
  },
  create_stint_record: {
    allocationKey: "stint_ids",
    idPattern: /^STINT-\d+$/,
    nodeType: "intention_record",
    prefix: "STINT",
    sourceDir: "intentions"
  },
  create_stloc_record: {
    allocationKey: "stloc_ids",
    idPattern: /^STLOC-\d+$/,
    nodeType: "story_location_record",
    prefix: "STLOC",
    sourceDir: "locations"
  },
  create_stobj_record: {
    allocationKey: "stobj_ids",
    idPattern: /^STOBJ-\d+$/,
    nodeType: "story_object_record",
    prefix: "STOBJ",
    sourceDir: "objects"
  },
  create_br_record: {
    allocationKey: "br_ids",
    idPattern: /^BR-\d+$/,
    nodeType: "branch_record",
    prefix: "BR",
    sourceDir: "branches"
  },
  create_pg_record: {
    allocationKey: "pg_ids",
    idPattern: /^PG-\d+$/,
    nodeType: "page_record",
    prefix: "PG",
    sourceDir: "pages"
  },
  create_chc_record: {
    allocationKey: "chc_ids",
    idPattern: /^CHC-\d+$/,
    nodeType: "choice_record",
    prefix: "CHC",
    sourceDir: "choices"
  },
  create_slt_record: {
    allocationKey: "slt_ids",
    idPattern: /^SLT-\d+$/,
    nodeType: "storylet_record",
    prefix: "SLT",
    sourceDir: "storylets"
  },
  create_bel_record: {
    allocationKey: "bel_ids",
    idPattern: /^BEL-\d+$/,
    nodeType: "belief_record",
    prefix: "BEL",
    sourceDir: "beliefs"
  },
  create_clk_record: {
    allocationKey: "clk_ids",
    idPattern: /^CLK-\d+$/,
    nodeType: "pressure_clock_record",
    prefix: "CLK",
    sourceDir: "clocks"
  },
  supersede_clk_record: {
    allocationKey: "clk_ids",
    idPattern: /^CLK-\d+$/,
    nodeType: "pressure_clock_record",
    prefix: "CLK",
    sourceDir: "clocks"
  },
  create_stsec_record: {
    allocationKey: "stsec_ids",
    idPattern: /^STSEC-\d+$/,
    nodeType: "story_secret_record",
    prefix: "STSEC",
    sourceDir: "secrets"
  },
  supersede_stsec_record: {
    allocationKey: "stsec_ids",
    idPattern: /^STSEC-\d+$/,
    nodeType: "story_secret_record",
    prefix: "STSEC",
    sourceDir: "secrets"
  },
  create_stq_record: {
    allocationKey: "stq_ids",
    idPattern: /^STQ-\d+$/,
    nodeType: "story_question_record",
    prefix: "STQ",
    sourceDir: "story-questions"
  },
  supersede_stq_record: {
    allocationKey: "stq_ids",
    idPattern: /^STQ-\d+$/,
    nodeType: "story_question_record",
    prefix: "STQ",
    sourceDir: "story-questions"
  },
  create_stplan_record: {
    allocationKey: "stplan_ids",
    idPattern: /^STPLAN-\d+$/,
    nodeType: "story_plan_record",
    prefix: "STPLAN",
    sourceDir: "plans"
  },
  create_stemo_record: {
    allocationKey: "stemo_ids",
    idPattern: /^STEMO-\d+$/,
    nodeType: "story_emotion_record",
    prefix: "STEMO",
    sourceDir: "emotions"
  },
  append_story_character_authority_record: {
    allocationKey: "stchar_ids",
    idPattern: /^STCHAR-\d+$/,
    nodeType: "story_character_authority_record",
    prefix: "STCHAR",
    sourceDir: "story-characters"
  },
  supersede_story_character_authority_record: {
    allocationKey: "stchar_ids",
    idPattern: /^STCHAR-\d+$/,
    nodeType: "story_character_authority_record",
    prefix: "STCHAR",
    sourceDir: "story-characters"
  },
  append_story_diegetic_artifact_record: {
    allocationKey: "story_da_ids",
    idPattern: /^DA-\d+$/,
    nodeType: "story_diegetic_artifact_record",
    prefix: "DA",
    sourceDir: "artifacts"
  }
};

const STORY_RECORD_PREFIXES = Array.from(new Set(Object.values(STORY_RECORD_SPECS).map((spec) => spec.prefix)));
const STORY_RECORD_PREFIX_PATTERN = STORY_RECORD_PREFIXES.map(escapeRegExp).join("|");
const BARE_STORY_RECORD_ID_PATTERN = new RegExp(`^(?:${STORY_RECORD_PREFIX_PATTERN})-\\d+$`);
const STORY_RECORD_ID_PATTERN = new RegExp(`^(?:[a-z0-9-]+:)?(${STORY_RECORD_PREFIX_PATTERN})-\\d+$`);
const STORY_BUNDLE_NODE_TYPE_BY_PREFIX: Readonly<Record<string, string>> = Object.fromEntries(
  Object.values(STORY_RECORD_SPECS).map((spec) => [spec.prefix, spec.nodeType])
);

export function isStoryRecordOperation(op: OperationKind): op is StoryRecordOperationKind {
  return STORY_RECORD_OPERATION_KIND_SET.has(op);
}

export function isBareStoryBundleRecordId(recordId: string): boolean {
  return BARE_STORY_RECORD_ID_PATTERN.test(recordId);
}

export function storyBundlePrefixForRecordId(recordId: string): string | null {
  return STORY_RECORD_ID_PATTERN.exec(recordId)?.[1] ?? null;
}

export function nodeTypeForStoryBundlePrefix(prefix: string): string | undefined {
  return STORY_BUNDLE_NODE_TYPE_BY_PREFIX[prefix];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
