# SPEC09CANSAFEXP-007: create-base-world genesis enforcement for epistemic_profile + exception_governance

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/create-base-world/SKILL.md` adds genesis-time block-population guidance for the genesis CF-0001 record (and any genesis multi-record set produced under `_source/`); `.claude/skills/create-base-world/templates/canon-fact-record.yaml` is updated so the genesis CF template mirrors the post-SPEC-09 CF schema; references the same `requiresEpistemicProfile` / `requiresExceptionGovernance` source-module helpers that canon-addition Phase 13a uses (per `archive/tickets/SPEC09CANSAFEXP-002.md` export plan).
**Deps**: `archive/tickets/SPEC09CANSAFEXP-001.md`, `archive/tickets/SPEC09CANSAFEXP-002.md`

## Problem

At intake, SPEC-09 §Approach Move 2 stated `create-base-world enforces this at genesis` — meaning every new world's genesis CF-0001 record adopts the conditionally-mandatory blocks from the start. SPEC-09 §Verification 11 names the explicit check: `create-base-world genesis on a synthetic new world produces CF-0001 with both blocks populated or correctly n_a'd per fact-type`. But SPEC-09 §Deliverables enumerated no discrete create-base-world deliverable — the enforcement was implicit in Approach + Verification. Before this ticket, create-base-world did not prompt the user to populate the new blocks at genesis time, and the patch-engine's structural validator (delivered by `archive/tickets/SPEC09CANSAFEXP-002.md`) could reject the genesis patch plan with no skill-side context. This ticket filled the gap by adding genesis-time block-population guidance to the create-base-world skill and its bundled CF template.

## Assumption Reassessment (2026-04-27)

1. `.claude/skills/create-base-world/SKILL.md` exists (confirmed at spot-check (a)). The skill emits genesis world bundles at `worlds/<world-slug>/` with `WORLD_KERNEL.md`, `ONTOLOGY.md`, plus a multi-record set under `_source/` (CF-0001, CH-0001, ≥1 invariant per category, seed mysteries / open questions / named entities, one initial section per prose concern) — all via a single engine-routed patch plan per CLAUDE.md §Skill Architecture.
2. **Cross-skill / cross-artifact boundary under audit**: this ticket is the create-base-world consumer-side of `archive/tickets/SPEC09CANSAFEXP-002.md` structural-schema enforcement. create-base-world emits `create_cf_record` ops via the same patch engine that canon-addition uses (per CLAUDE.md §Machine-facing layer integration); the same conditional-presence enforcement applies. Skill prose at create-base-world must guide the user to populate the new blocks at genesis, parallel to canon-addition Phase 13a (delivered by `archive/tickets/SPEC09CANSAFEXP-004.md`).
3. **FOUNDATIONS principle motivating this ticket**: SPEC-09 §Approach §Strictness by world age — *"New worlds (any CANON_LEDGER created after SPEC-09 lands): Rules 11 & 12 apply to CF-0001 onward. Both schema blocks apply from CF-0001 onward under the conditional-mandate regime. create-base-world enforces this at genesis."* Per FOUNDATIONS Genesis-world rule paragraph (delivered by SPEC09CANSAFEXP-001), new worlds adopt the full schema from CF-0001.
4. **HARD-GATE / canon-write ordering surface touched**: create-base-world's existing HARD-GATE (gating the genesis patch plan submit) is preserved. The new prose adds block-population to the user-approval surface — the user reviews the genesis CF-0001 with epistemic_profile / exception_governance content before approval, parallel to Phase 13a in canon-addition.
5. **Schema extension consumer**: create-base-world Phase (whichever phase emits the genesis CF-0001 op) must populate the new blocks. Use the `requiresEpistemicProfile` / `requiresExceptionGovernance` helpers exported by `archive/tickets/SPEC09CANSAFEXP-002.md`'s `tools/validators/src/structural/record-schema-compliance.ts` source module to drive the conditional decision. If the genesis CF is structural / geographic / institutional-plumbing (e.g., CF-0001 might be a world-defining geographic invariant), n_a-form with fact-type rationale is acceptable; if CF-0001 is a capability-introducing fact, populated form is required.
6. **Spec-deliverable inference justification**: SPEC-09 §Deliverables does NOT enumerate create-base-world. However, §Approach Move 2 explicitly says *"create-base-world enforces this at genesis"* and §Verification 11 names a `create-base-world` test. Per /spec-to-tickets §Final Rule (every deliverable must map to a ticket OR an explicit non-goal OR a documented cross-spec / distributed / no-change category), this ticket fills the gap surfaced at decomposition time — the create-base-world enforcement IS a deliverable, just under-enumerated.
7. **Required consequence fallout**: `.claude/skills/create-base-world/templates/canon-fact-record.yaml` is a live create-base-world surface; `SKILL.md` §Record Schemas states it mirrors FOUNDATIONS §Canon Fact Record Schema. Leaving that template without `epistemic_profile` / `exception_governance` would make the genesis CF-0001 authoring guidance contradict the bundled template. Updating the template stays inside the same create-base-world schema-consumer seam and does not absorb a separate capability family.

## Architecture Check

1. Adding genesis-time block-population guidance to create-base-world skill prose preserves the skill's role as the canonical genesis-emission path. The alternative — relying on validator rejection alone, leaving the skill silent — would surface the conditional-mandate as an opaque error message at patch-engine submit time rather than as guided authoring during the skill's interview phase.
2. Reusing the `archive/tickets/SPEC09CANSAFEXP-002.md` helpers (`requiresEpistemicProfile`, `requiresExceptionGovernance`) avoids duplicating the type-taxonomy in skill prose. Single source of truth for the conditional decision.
3. No backwards-compatibility shims introduced. Existing `create-base-world` skill flow is preserved; new block-population guidance is additive at the genesis-CF authoring step.

## Verification Layers

1. create-base-world SKILL.md adds genesis-time block-population guidance — codebase grep-proof (`grep -n "epistemic_profile\|exception_governance\|requiresEpistemicProfile\|requiresExceptionGovernance" .claude/skills/create-base-world/SKILL.md`).
2. Genesis CF-0001 deliverable summary references the new blocks — codebase grep-proof in the skill's §Output or genesis-summary section.
3. create-base-world CF template includes the post-SPEC-09 blocks and remains parseable YAML — schema validation via package-local `js-yaml`.
4. Full create-base-world synthetic genesis dry-run and patch-engine acceptance are deferred to `tickets/SPEC09CANSAFEXP-008.md`, which owns SPEC-09 Verification 11.

## What to Change

### 1. `.claude/skills/create-base-world/SKILL.md` — add genesis CF-0001 block-population guidance

Locate the phase that emits the genesis CF-0001 record (typically a phase named "Genesis canon emission" or similar, where the skill constructs the `create_cf_record` op for CF-0001). Add a paragraph guiding the user to populate the new blocks:

> **Genesis-world conditionally-mandatory blocks (per SPEC-09)**: When constructing the genesis CF-0001 `create_cf_record` op, populate `epistemic_profile` and `exception_governance` (or set each to `n_a`-with-fact-type-rationale form per FOUNDATIONS §Canon Fact Record Schema). Use the structural validator's exported `requiresEpistemicProfile(cf.type)` and `requiresExceptionGovernance(cf.type)` helpers in `tools/validators/src/structural/record-schema-compliance.ts` as the source-of-truth taxonomy for the conditional-presence decision. If a block applies to the genesis fact (e.g., CF-0001 introduces a capability, exception-bearing artifact, or knowledge-asymmetric truth), populate it from the user's world-kernel interview. If a block does not apply (e.g., CF-0001 is a geographic invariant or structural-institutional fact), emit the n_a form with a rationale containing a fact-type keyword from FOUNDATIONS §Ontology Categories. Surface ambiguity to the user rather than defaulting to `n_a`.

### 2. `.claude/skills/create-base-world/templates/canon-fact-record.yaml` — update the genesis CF template

Add the post-SPEC-09 `epistemic_profile` and `exception_governance` blocks after `notes` and before `modification_history`. The template should document both populated and `n_a` shapes in comments, and it should remind create-base-world that ambiguity must be surfaced to the user rather than defaulted to `n_a`.

### 3. `.claude/skills/create-base-world/SKILL.md` — update genesis multi-record summary

If the skill has a §Output or genesis-summary section enumerating what CF-0001 contains, update it to mention `epistemic_profile` and `exception_governance` as part of the genesis CF-0001 surface.

### 4. `.claude/skills/create-base-world/SKILL.md` — update HARD-GATE deliverable summary expectations

If the skill's HARD-GATE (which gates the genesis patch plan submit) lists what the user reviews before approving, add the new blocks to the deliverable-summary expectations so the user sees epistemic_profile / exception_governance content during the approval moment.

### 5. `specs/IMPLEMENTATION-ORDER.md` — mark SPEC-09 row complete

Update the SPEC-09 Phase 2.5 row for create-base-world genesis block-population guidance to point at this active completed ticket. The full synthetic genesis dry-run remains part of the Phase 2.5 completion gate and SPEC09CANSAFEXP-008 integration capstone.

## Files to Touch

- `.claude/skills/create-base-world/SKILL.md` (modify) — genesis-CF block-population guidance + summary references + HARD-GATE deliverable-summary update
- `.claude/skills/create-base-world/templates/canon-fact-record.yaml` (modify) — post-SPEC-09 genesis CF template fields
- `specs/IMPLEMENTATION-ORDER.md` (modify) — mark create-base-world guidance complete for the SPEC-09 implementation-order row

## Out of Scope

- Schema extension (delivered by `archive/tickets/SPEC09CANSAFEXP-002.md`; this ticket consumes the schema)
- Validator implementation (delivered by SPEC09CANSAFEXP-003)
- canon-addition Phase 13a updates (delivered by `archive/tickets/SPEC09CANSAFEXP-004.md`; parallel mechanism for non-genesis CFs)
- continuity-audit silent-area canonization check (delivered by SPEC09CANSAFEXP-005)
- diegetic-artifact-generation template cleanup (delivered by `archive/tickets/SPEC09CANSAFEXP-006.md`)
- Retroactive retrofit of existing animalia genesis CF-0001 (deferred to user-choice continuity-audit cycle per SPEC-09 §Out of Scope)

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "epistemic_profile\|exception_governance" .claude/skills/create-base-world/SKILL.md` returns ≥2 matches in the genesis-CF authoring guidance.
2. `grep -n "requiresEpistemicProfile\|requiresExceptionGovernance" .claude/skills/create-base-world/SKILL.md` returns ≥1 match referencing the archived SPEC09CANSAFEXP-002 helpers.
3. `grep -n "Genesis-world\|genesis CF\|CF-0001" .claude/skills/create-base-world/SKILL.md` returns matches anchoring the new guidance to the genesis-CF authoring step.
4. `grep -n "epistemic_profile\|exception_governance" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returns matches in the CF template.
5. Template YAML parses via package-local `js-yaml`.
6. Deferred integration proof: create-base-world skill dry-run on a synthetic new world (created externally for SPEC09CANSAFEXP-008): skill prompts the user to populate epistemic_profile / exception_governance for CF-0001 per the user's world-kernel interview; emits the `create_cf_record` op with the populated (or n_a) blocks; patch engine pre-apply validator accepts the genesis patch plan; deliverable summary shown at HARD-GATE displays the new blocks for user review.

### Invariants

1. create-base-world's existing genesis multi-record set (CF-0001, CH-0001, ≥1 invariant per category, seed mysteries / open questions / named entities, one section per prose concern) is preserved; the new blocks are added to CF-0001 only, not to other genesis records.
2. The genesis patch plan still routes through `mcp__worldloom__submit_patch_plan` per CLAUDE.md §Non-negotiables; no direct `Edit`/`Write` on `_source/` files.
3. The skill's HARD-GATE remains absolute under Auto Mode — the new blocks are part of the deliverable summary the user reviews before approval.
4. n_a-form rationale at genesis must contain a fact-type keyword from FOUNDATIONS §Ontology Categories (enforced by `archive/tickets/SPEC09CANSAFEXP-002.md`'s structural validator).

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage (validators tests + create-base-world skill dry-run) is named in Assumption Reassessment.`

### Commands

1. `grep -nE "epistemic_profile|exception_governance|requiresEpistemicProfile|requiresExceptionGovernance|Genesis-world|genesis CF|CF-0001" .claude/skills/create-base-world/SKILL.md` — comprehensive grep that all post-edit content is present.
2. `grep -nE "epistemic_profile|exception_governance|n_a|Genesis-world" .claude/skills/create-base-world/templates/canon-fact-record.yaml` — template grep that both blocks and the genesis guidance are present.
3. `cd tools/validators && node -e 'const yaml = require("js-yaml"); const fs = require("fs"); yaml.load(fs.readFileSync("../../.claude/skills/create-base-world/templates/canon-fact-record.yaml", "utf8")); console.log("OK");'` — template parses as YAML through the package-local parser.
4. create-base-world skill dry-run on a synthetic new world — deferred to SPEC09CANSAFEXP-008 integration capstone; this ticket's owned proof is skill/template contract presence plus template parse.

## Outcome

Completion date: 2026-04-27.

Completed the create-base-world SPEC-09 genesis guidance:

- Added Phase 8 guidance requiring genesis CF-0001 to include `epistemic_profile` and `exception_governance`, either populated or explicitly `n_a` with fact-type rationale.
- Anchored the conditional decision to `requiresEpistemicProfile(cf.type)` and `requiresExceptionGovernance(cf.type)` in `tools/validators/src/structural/record-schema-compliance.ts`.
- Updated the Phase 10 HARD-GATE deliverable summary so the user reviews those blocks, plus any unresolved ambiguity, before approval.
- Updated `.claude/skills/create-base-world/templates/canon-fact-record.yaml` so the bundled genesis CF template matches the post-SPEC-09 schema surface.
- Updated `specs/IMPLEMENTATION-ORDER.md` to mark the create-base-world guidance row complete while leaving the full synthetic genesis dry-run with SPEC09CANSAFEXP-008.

## Verification Result

- `grep -nE "epistemic_profile|exception_governance|requiresEpistemicProfile|requiresExceptionGovernance|Genesis-world|genesis CF|CF-0001" .claude/skills/create-base-world/SKILL.md` — passed; Phase 8 and Phase 10 contain the required guidance and summary references.
- `grep -nE "epistemic_profile|exception_governance|n_a|Genesis-world" .claude/skills/create-base-world/templates/canon-fact-record.yaml` — passed; the template contains both blocks and `n_a` examples.
- `cd tools/validators && node -e 'const yaml = require("js-yaml"); const fs = require("fs"); yaml.load(fs.readFileSync("../../.claude/skills/create-base-world/templates/canon-fact-record.yaml", "utf8")); console.log("OK");'` — passed.
- `git diff --check` — passed.

## Deviations

- Same-seam widening: `.claude/skills/create-base-world/templates/canon-fact-record.yaml` was added to the file set because the live skill explicitly presents it as the CF schema mirror. Leaving it stale would contradict the new Phase 8 authoring contract.
- The full synthetic create-base-world dry-run was not executed here. `tickets/SPEC09CANSAFEXP-008.md` already owns SPEC-09 Verification 11 as the integration capstone; this ticket completed the skill/template contract needed for that capstone.
