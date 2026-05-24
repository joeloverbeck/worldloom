import { auditOnlySeShape } from "../structural/audit-only-se-shape.js";
import { activeRecordsFullShape } from "../structural/active-records-full-shape.js";
import { activePressureHandlingDiscipline } from "../structural/active-pressure-handling-discipline.js";
import { approvalSemantics } from "../structural/approval-semantics.js";
import { artifactMaturity } from "../structural/artifact-maturity.js";
import { branchIsolation } from "../structural/branch-isolation.js";
import { canonBaselineDrift } from "../structural/canon-baseline-drift.js";
import { canonDriftClassificationEvidence } from "../structural/canon-drift-classification-evidence.js";
import { characterGroundingConsistency } from "../structural/character-grounding-consistency.js";
import { characterMemorabilityStructure } from "../structural/character-memorability-structure.js";
import { chcSltSelectedCommitmentTrace } from "../structural/chc-slt-selected-commitment-trace.js";
import { clockFiringThresholdIntegrity } from "../structural/clock-firing-threshold-integrity.js";
import { clockIntroductionGroundingIntegrity } from "../structural/clock-introduction-grounding-integrity.js";
import { clockTerminalDebtIntegrity } from "../structural/clock-terminal-debt-integrity.js";
import { clockThresholdOrdering } from "../structural/clock-threshold-ordering.js";
import { clockTickProvenance } from "../structural/clock-tick-provenance.js";
import { clockValueInRange } from "../structural/clock-value-in-range.js";
import { compatibilityDrift } from "../structural/compatibility-drift.js";
import { causalDependencyThreatScan } from "../structural/causal-dependency-threat-scan.js";
import { crossFileReference } from "../structural/cross-file-reference.js";
import { entityIntroductionStatusPairing } from "../structural/entity-introduction-status-pairing.js";
import { expectedWitnessCoverage } from "../structural/expected-witness-coverage.js";
import { forbiddenStcharTamperHashFields } from "../structural/forbidden-stchar-tamper-hash-fields.js";
import { introductionObserverFirewall } from "../structural/introduction-observer-firewall.js";
import { indexDiskConsistency } from "../structural/index-disk-consistency.js";
import { midstoryRecordIntroductionGrounding } from "../structural/midstory-record-introduction-grounding.js";
import { nonPropagationFactsCompleteness } from "../structural/non-propagation-facts-completeness.js";
import { idUniqueness } from "../structural/id-uniqueness.js";
import { liePromotedSilently } from "../structural/lie-promoted-silently.js";
import { modificationHistoryRetrofit } from "../structural/modification-history-retrofit.js";
import { narrativeShapeFieldRejection } from "../structural/narrative-shape-field-rejection.js";
import { noCharAuthorityInStoryRuntime } from "../structural/no-char-authority-in-story-runtime.js";
import { noStoryStateInPlaceMutation } from "../structural/no-story-state-in-place-mutation.js";
import { observerFirewall } from "../structural/observer-firewall.js";
import { pageAffordanceIntegrity } from "../structural/page-affordance-integrity.js";
import { pagePlanStcharPacketIntegrity } from "../structural/page-plan-stchar-packet-integrity.js";
import { pagePlanTurnDriverConsistency } from "../structural/page-plan-turn-driver-consistency.js";
import { proposalPackageShape } from "../structural/proposal-package-shape.js";
import { proseReceiptHashIntegrity } from "../structural/prose-receipt-hash-integrity.js";
import { proseReceiptSchemaCompliance } from "../structural/prose-receipt-schema-compliance.js";
import { proseReceiptStcharIntegrity } from "../structural/prose-receipt-stchar-integrity.js";
import { recordIntroductionUniqueness } from "../structural/record-introduction-uniqueness.js";
import { recordSchemaCompliance } from "../structural/record-schema-compliance.js";
import { recursiveReferenceClosure } from "../structural/recursive-reference-closure.js";
import { relationshipIntroductionGroundingIntegrity } from "../structural/relationship-introduction-grounding-integrity.js";
import { criticalSecretClueCoverageWhenRevealed } from "../structural/critical-secret-clue-coverage-when-revealed.js";
import { secretIntroductionAnchorIntegrity } from "../structural/secret-introduction-anchor-integrity.js";
import { secretCarrierExistence } from "../structural/secret-carrier-existence.js";
import { secretMysteryFirewallCompliance } from "../structural/secret-mystery-firewall-compliance.js";
import { snapshotReplayEquality } from "../structural/snapshot-replay-equality.js";
import { sltCreatedAtPageOriginConsistency } from "../structural/slt-created-at-page-origin-consistency.js";
import { sltGroundingMinimalIntegrity } from "../structural/slt-grounding-minimal-integrity.js";
import { stateDeltaClassIntegrity } from "../structural/state-delta-class-integrity.js";
import { stateSnapshotIntegrity } from "../structural/state-snapshot-integrity.js";
import { stplanBeliefBasisGrounded } from "../structural/stplan-belief-basis-grounded.js";
import { stplanBlockersGrounded } from "../structural/stplan-blockers-grounded.js";
import { stplanClosureStatusRequiresClosureEvent } from "../structural/stplan-closure-status-requires-closure-event.js";
import { stplanCurrentStepTargetsGrounded } from "../structural/stplan-current-step-targets-grounded.js";
import { stplanEventPlanRelationConsistency } from "../structural/stplan-event-plan-relation-consistency.js";
import { stplanHolderExistsAndActive } from "../structural/stplan-holder-exists-and-active.js";
import { stplanIdUniquenessAndAppendOnly } from "../structural/stplan-id-uniqueness-and-append-only.js";
import { stplanNoFuturePageIds } from "../structural/stplan-no-future-page-ids.js";
import { stplanPredicateReferences } from "../structural/stplan-predicate-references.js";
import { stplanResourceBasisGrounded } from "../structural/stplan-resource-basis-grounded.js";
import { stplanRootIntentionGrounded } from "../structural/stplan-root-intention-grounded.js";
import { stplanSchemaCompliance } from "../structural/stplan-schema-compliance.js";
import { stplanSupersessionChainValid } from "../structural/stplan-supersession-chain-valid.js";
import { stemoAgencyEffectCompatibility } from "../structural/stemo-agency-effect-compatibility.js";
import { stemoAppraisalBasisAccessibleToHolder } from "../structural/stemo-appraisal-basis-accessible-to-holder.js";
import { stemoEnumCompliance } from "../structural/stemo-enum-compliance.js";
import { stemoHolderExistsAndActive } from "../structural/stemo-holder-exists-and-active.js";
import { stemoNoFuturePageIds } from "../structural/stemo-no-future-page-ids.js";
import { stemoOrientationRecordsExist } from "../structural/stemo-orientation-records-exist.js";
import { stemoSchemaCompliance } from "../structural/stemo-schema-compliance.js";
import { stemoSupersessionLifecycleValid } from "../structural/stemo-supersession-lifecycle-valid.js";
import { stemoTriggerEventOnBranchPath } from "../structural/stemo-trigger-event-on-branch-path.js";
import { stcharActiveForBoundStent } from "../structural/stchar-active-for-bound-stent.js";
import { stcharBodyIntegrity } from "../structural/stchar-body-integrity.js";
import { stcharBoundStentReciprocity } from "../structural/stchar-bound-stent-reciprocity.js";
import { stcharResolves } from "../structural/stchar-resolves.js";
import { stcharRegenerationReasonIntegrity } from "../structural/stchar-regeneration-reason-integrity.js";
import { stcharSourceFactCoverage } from "../structural/stchar-source-fact-coverage.js";
import { stcharSourceMaterialInventoryIntegrity } from "../structural/stchar-source-material-inventory-integrity.js";
import { stcharSupersessionIntegrity } from "../structural/stchar-supersession-integrity.js";
import { stcharTemporalReferenceBoundary } from "../structural/stchar-temporal-reference-boundary.js";
import { stentRequiresStchar } from "../structural/stent-requires-stchar.js";
import { storyQuestionIntroductionGroundingIntegrity } from "../structural/story-question-introduction-grounding-integrity.js";
import { storyQuestionGroundingIntegrity } from "../structural/story-question-grounding-integrity.js";
import { storyQuestionPayoffIntegrity } from "../structural/story-question-payoff-integrity.js";
import { storyQuestionSetupPredatesPayoff } from "../structural/story-question-setup-predates-payoff.js";
import { storyQuestionTerminalDebt } from "../structural/story-question-terminal-debt.js";
import { storyDaDuplicateHeuristic } from "../structural/story-da-duplicate-heuristic.js";
import { storyFactAuthority } from "../structural/story-fact-authority.js";
import { storyKernelCastBindListIntegrity } from "../structural/story-kernel-cast-bind-list-integrity.js";
import { threadIntroductionGroundingIntegrity } from "../structural/thread-introduction-grounding-integrity.js";
import { turnDriverPovObserverFirewall } from "../structural/turn-driver-pov-observer-firewall.js";
import { turnDriverSchemaCompliance } from "../structural/turn-driver-schema-compliance.js";
import { turnCycleOutputGroundingIntegrity } from "../structural/turn-cycle-output-grounding-integrity.js";
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
  approvalSemantics,
  artifactMaturity,
  indexDiskConsistency,
  characterMemorabilityStructure,
  storyFactAuthority,
  liePromotedSilently,
  branchIsolation,
  observerFirewall,
  noStoryStateInPlaceMutation,
  stateDeltaClassIntegrity,
  auditOnlySeShape,
  causalDependencyThreatScan,
  expectedWitnessCoverage,
  midstoryRecordIntroductionGrounding,
  clockIntroductionGroundingIntegrity,
  sltCreatedAtPageOriginConsistency,
  canonBaselineDrift,
  canonDriftClassificationEvidence,
  nonPropagationFactsCompleteness,
  snapshotReplayEquality,
  recursiveReferenceClosure,
  stentRequiresStchar,
  stcharResolves,
  stcharBoundStentReciprocity,
  stcharActiveForBoundStent,
  stcharSupersessionIntegrity,
  stcharBodyIntegrity,
  stcharSourceFactCoverage,
  stcharSourceMaterialInventoryIntegrity,
  stcharTemporalReferenceBoundary,
  stcharRegenerationReasonIntegrity,
  forbiddenStcharTamperHashFields,
  noCharAuthorityInStoryRuntime,
  characterGroundingConsistency,
  chcSltSelectedCommitmentTrace,
  stateSnapshotIntegrity,
  clockValueInRange,
  clockThresholdOrdering,
  clockTickProvenance,
  clockFiringThresholdIntegrity,
  clockTerminalDebtIntegrity,
  secretCarrierExistence,
  criticalSecretClueCoverageWhenRevealed,
  secretIntroductionAnchorIntegrity,
  secretMysteryFirewallCompliance,
  storyQuestionIntroductionGroundingIntegrity,
  threadIntroductionGroundingIntegrity,
  entityIntroductionStatusPairing,
  relationshipIntroductionGroundingIntegrity,
  introductionObserverFirewall,
  recordIntroductionUniqueness,
  narrativeShapeFieldRejection,
  compatibilityDrift,
  activeRecordsFullShape,
  pageAffordanceIntegrity,
  pagePlanStcharPacketIntegrity,
  pagePlanTurnDriverConsistency,
  activePressureHandlingDiscipline,
  storyQuestionPayoffIntegrity,
  storyQuestionSetupPredatesPayoff,
  storyQuestionGroundingIntegrity,
  storyQuestionTerminalDebt,
  storyDaDuplicateHeuristic,
  sltGroundingMinimalIntegrity,
  turnDriverSchemaCompliance,
  turnDriverPovObserverFirewall,
  turnCycleOutputGroundingIntegrity,
  touchedByCfCompleteness,
  proposalPackageShape,
  proseReceiptSchemaCompliance,
  proseReceiptHashIntegrity,
  proseReceiptStcharIntegrity,
  storyKernelCastBindListIntegrity,
  modificationHistoryRetrofit,
  validationTraceShapeCompliance,
  stplanSchemaCompliance,
  stplanIdUniquenessAndAppendOnly,
  stplanHolderExistsAndActive,
  stplanRootIntentionGrounded,
  stplanBeliefBasisGrounded,
  stplanResourceBasisGrounded,
  stplanBlockersGrounded,
  stplanCurrentStepTargetsGrounded,
  stplanPredicateReferences,
  stplanNoFuturePageIds,
  stplanSupersessionChainValid,
  stplanClosureStatusRequiresClosureEvent,
  stplanEventPlanRelationConsistency,
  stemoSchemaCompliance,
  stemoHolderExistsAndActive,
  stemoTriggerEventOnBranchPath,
  stemoAppraisalBasisAccessibleToHolder,
  stemoOrientationRecordsExist,
  stemoEnumCompliance,
  stemoNoFuturePageIds,
  stemoSupersessionLifecycleValid,
  stemoAgencyEffectCompatibility
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
