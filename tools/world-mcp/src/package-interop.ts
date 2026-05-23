import { createRequire } from "node:module";

import type * as PatchEngineModule from "@worldloom/patch-engine";
import type * as ValidatorsModule from "@worldloom/validators";
import type * as WorldIndexSyncModule from "@worldloom/world-index/commands/sync";
import type * as WorldIndexHashModule from "@worldloom/world-index/hash/content";
import type * as WorldIndexOpenModule from "@worldloom/world-index/index/open";
import type * as WorldIndexVocabularyModule from "@worldloom/world-index/public/canonical-vocabularies";
import type * as WorldIndexTypesModule from "@worldloom/world-index/public/types";

const requireForInterop = createRequire(import.meta.url);

function loadPackage<T>(specifier: string): T {
  return requireForInterop(specifier) as T;
}

const patchEngine = loadPackage<typeof PatchEngineModule>("@worldloom/patch-engine");
const validators = loadPackage<typeof ValidatorsModule>("@worldloom/validators");
const worldIndexSync = loadPackage<typeof WorldIndexSyncModule>("@worldloom/world-index/commands/sync");
const worldIndexHash = loadPackage<typeof WorldIndexHashModule>("@worldloom/world-index/hash/content");
const worldIndexOpen = loadPackage<typeof WorldIndexOpenModule>("@worldloom/world-index/index/open");
const worldIndexTypes = loadPackage<typeof WorldIndexTypesModule>("@worldloom/world-index/public/types");
const worldIndexVocabulary = loadPackage<typeof WorldIndexVocabularyModule>(
  "@worldloom/world-index/public/canonical-vocabularies"
);

export const OPERATION_KINDS = patchEngine.OPERATION_KINDS;
export const CREATE_OP_CANONICAL_RECORD_ID_FIELD = patchEngine.CREATE_OP_CANONICAL_RECORD_ID_FIELD;
export const canonicalOpHash = patchEngine.canonicalOpHash;
export const checkIdAllocationRace = patchEngine.checkIdAllocationRace;
export const submitPatchPlan = patchEngine.submitPatchPlan;

export const validatePatchPlan = validators.validatePatchPlan;
export const EPISTEMIC_PROFILE_REQUIRED_TYPES = validators.EPISTEMIC_PROFILE_REQUIRED_TYPES;
export const EXCEPTION_GOVERNANCE_REQUIRED_TYPES = validators.EXCEPTION_GOVERNANCE_REQUIRED_TYPES;

export const syncWorldIndex = worldIndexSync.sync;
export const computePgStateHash = worldIndexHash.computePgStateHash;
export const computePlanHash = worldIndexHash.computePlanHash;
export const openExistingIndex = worldIndexOpen.openExistingIndex;

export const ATOMIC_LOGICAL_WORLD_FILES = worldIndexTypes.ATOMIC_LOGICAL_WORLD_FILES;
export const CURRENT_INDEX_VERSION = worldIndexTypes.CURRENT_INDEX_VERSION;
export const NODE_TYPES = worldIndexTypes.NODE_TYPES;

export const CANONICAL_DOMAINS = worldIndexVocabulary.CANONICAL_DOMAINS;
export const CF_TYPE_EPISTEMIC_PROFILE_REQUIRED =
  worldIndexVocabulary.CF_TYPE_EPISTEMIC_PROFILE_REQUIRED;
export const CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED =
  worldIndexVocabulary.CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED;
export const CF_TYPE_VALUES = worldIndexVocabulary.CF_TYPE_VALUES;
export const CHANGE_TYPE_VALUES = worldIndexVocabulary.CHANGE_TYPE_VALUES;
export const ENTITY_KIND_VALUES = worldIndexVocabulary.ENTITY_KIND_VALUES;
export const INVARIANT_CATEGORY_VALUES = worldIndexVocabulary.INVARIANT_CATEGORY_VALUES;
export const MYSTERY_RESOLUTION_SAFETY_ENUM = worldIndexVocabulary.MYSTERY_RESOLUTION_SAFETY_ENUM;
export const MYSTERY_STATUS_ENUM = worldIndexVocabulary.MYSTERY_STATUS_ENUM;
export const REVISION_DIFFICULTY_VALUES = worldIndexVocabulary.REVISION_DIFFICULTY_VALUES;
export const SEC_FILE_CLASS_VALUES = worldIndexVocabulary.SEC_FILE_CLASS_VALUES;
export const VERDICT_ENUM = worldIndexVocabulary.VERDICT_ENUM;
