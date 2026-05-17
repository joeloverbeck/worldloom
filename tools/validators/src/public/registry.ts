import { auditOnlySeShape } from "../structural/audit-only-se-shape.js";
import { branchIsolation } from "../structural/branch-isolation.js";
import { canonBaselineDrift } from "../structural/canon-baseline-drift.js";
import { canonDriftClassificationEvidence } from "../structural/canon-drift-classification-evidence.js";
import { clockFiringThresholdIntegrity } from "../structural/clock-firing-threshold-integrity.js";
import { clockTerminalDebtIntegrity } from "../structural/clock-terminal-debt-integrity.js";
import { clockThresholdOrdering } from "../structural/clock-threshold-ordering.js";
import { clockTickProvenance } from "../structural/clock-tick-provenance.js";
import { clockValueInRange } from "../structural/clock-value-in-range.js";
import { causalDependencyThreatScan } from "../structural/causal-dependency-threat-scan.js";
import { crossFileReference } from "../structural/cross-file-reference.js";
import { expectedWitnessCoverage } from "../structural/expected-witness-coverage.js";
import { nonPropagationTagShape } from "../structural/non-propagation-tag-shape.js";
import { idUniqueness } from "../structural/id-uniqueness.js";
import { liePromotedSilently } from "../structural/lie-promoted-silently.js";
import { modificationHistoryRetrofit } from "../structural/modification-history-retrofit.js";
import { observerFirewall } from "../structural/observer-firewall.js";
import { proposalPackageShape } from "../structural/proposal-package-shape.js";
import { proseReceiptSchemaCompliance } from "../structural/prose-receipt-schema-compliance.js";
import { recordSchemaCompliance } from "../structural/record-schema-compliance.js";
import { recursiveReferenceClosure } from "../structural/recursive-reference-closure.js";
import { snapshotReplayEquality } from "../structural/snapshot-replay-equality.js";
import { sltCreatedAtPageOriginConsistency } from "../structural/slt-created-at-page-origin-consistency.js";
import { stateSnapshotIntegrity } from "../structural/state-snapshot-integrity.js";
import { storyDaDuplicateHeuristic } from "../structural/story-da-duplicate-heuristic.js";
import { storyFactAuthority } from "../structural/story-fact-authority.js";
import { validationTraceShapeCompliance } from "../structural/validation-trace-shape-compliance.js";
import { rule1NoFloatingFacts } from "../rules/rule1-no-floating-facts.js";
import { rule2NoPureCosmetics } from "../rules/rule2-no-pure-cosmetics.js";
import { rule4NoGlobalizationByAccident } from "../rules/rule4-no-globalization-by-accident.js";
import { rule5NoConsequenceEvasion } from "../rules/rule5-no-consequence-evasion.js";
import { rule6NoSilentRetcons } from "../rules/rule6-no-silent-retcons.js";
import { rule7MysteryReservePreservation } from "../rules/rule7-mystery-reserve-preservation.js";
import { ruleChcGroundedInArtifactAccessible } from "../rules/rule_chc_grounded_in_artifact_accessible.js";
import { ruleChoiceSetNoncollapse } from "../rules/rule_choice_set_noncollapse.js";
import { ruleProseLoadBearingArtifactMention } from "../rules/rule_prose_load_bearing_artifact_mention.js";
import { storyletPredicateDslParsability } from "../rules/rule_storylet_predicate_dsl_parsability.js";
import { rule11ActionSpace } from "../rules/rule11-action-space.js";
import { rule12Redundancy } from "../rules/rule12-redundancy.js";
import { touchedByCfCompleteness } from "../structural/touched-by-cf-completeness.js";
import { yamlParseIntegrity } from "../structural/yaml-parse-integrity.js";
import type { Validator } from "../framework/types.js";

export const structuralValidators: readonly Validator[] = [
  yamlParseIntegrity,
  idUniqueness,
  crossFileReference,
  recordSchemaCompliance,
  storyFactAuthority,
  liePromotedSilently,
  branchIsolation,
  observerFirewall,
  auditOnlySeShape,
  causalDependencyThreatScan,
  expectedWitnessCoverage,
  sltCreatedAtPageOriginConsistency,
  canonBaselineDrift,
  canonDriftClassificationEvidence,
  nonPropagationTagShape,
  snapshotReplayEquality,
  recursiveReferenceClosure,
  stateSnapshotIntegrity,
  clockValueInRange,
  clockThresholdOrdering,
  clockTickProvenance,
  clockFiringThresholdIntegrity,
  clockTerminalDebtIntegrity,
  storyDaDuplicateHeuristic,
  touchedByCfCompleteness,
  proposalPackageShape,
  proseReceiptSchemaCompliance,
  modificationHistoryRetrofit,
  validationTraceShapeCompliance
];

export const ruleValidators: readonly Validator[] = [
  rule1NoFloatingFacts,
  rule2NoPureCosmetics,
  rule4NoGlobalizationByAccident,
  rule5NoConsequenceEvasion,
  rule6NoSilentRetcons,
  rule7MysteryReservePreservation,
  ruleChcGroundedInArtifactAccessible,
  ruleChoiceSetNoncollapse,
  ruleProseLoadBearingArtifactMention,
  storyletPredicateDslParsability,
  rule11ActionSpace,
  rule12Redundancy
];
