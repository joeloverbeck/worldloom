<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-30 — Story Contract Hardening II

**Status**: COMPLETED
**Date**: 2026-05-15
**Supersedes**: none (extends `archive/specs/SPEC-28-story-contract-hardening.md` which shipped D1–D7 on 2026-05-13)
**Companion triage**: `docs/triage/2026-05-15-story-related-improvements-fourth-iteration-triage.md`

> **Implementation note (2026-05-15)**: D1 landed via `archive/tickets/SPEC30STOCONHAR-001.md`. The implementation chose the preferred validator-layer enforcement path: `story-page.schema.json` remains permissive for nullable `input.choice_id` / `input.manual_action_text`, while `state_snapshot_integrity` resolves `input.resolved_event_id` to the SE `event_kind` and emits `state_snapshot_integrity.pg_input_legality_violation` (`severity: fail`) for illegal combinations. The live test file is `tools/validators/tests/structural/state-snapshot-integrity.test.ts`; remaining D1 prose below is historical specification context unless contradicted by this note.

> **Implementation note (2026-05-15)**: D2 landed via `archive/tickets/SPEC30STOCONHAR-002.md`. `.claude/skills/branching-story-bootstrap/SKILL.md` now states that `branch_path` is required by shared contract §4.2 and that §4.4 documents the `SLT.scope.visible_branch_path_prefix` / `recursive_reference_closure` linkage; remaining D2 prose below is historical specification context unless contradicted by this note.

> **Implementation note (2026-05-15)**: D3 landed via `archive/tickets/SPEC30STOCONHAR-003.md`. Shared contract §5 now uses `belief_record(holder, BEL-<integer>, mode?, confidence_floor?)` for actor-specific BEL grounding and keeps `any_belief(...)` for existential alias-binding; the validator grammar/parser reject legacy `belief(...)` as `unknown_predicate` and reject non-BEL second arguments with `belief_record_argument_invalid`. Remaining D3 prose below is historical specification context unless contradicted by this note.

> **Implementation note (2026-05-15)**: D4 landed via `archive/tickets/SPEC30STOCONHAR-004.md`. Shared contract §4.3 and `story-event.schema.json` now admit `STSTAT` and `SREL` in `promotion_claims[].source_record`; `recursive_reference_closure` resolves both classes from SE promotion claims; `story-fact-promotion-to-canon`, `branching-story-turn-cycle`, and `story-promotion-closeout` now describe the widened STENT/STSTAT/SREL promotion source discipline. Remaining D4 prose below is historical specification context unless contradicted by this note.

> **Implementation note (2026-05-15)**: D5 landed via `archive/tickets/SPEC30STOCONHAR-005.md`. Shared contract §4.2 and `story-page.schema.json` now admit `PG.state_snapshot.unresolved_mystery_claims[].evidence_records[]` with `SF | BEL | DA | SE` ids; `state_snapshot_integrity` emits `state_snapshot_integrity.mystery_evidence_required` for non-`preserved` mystery statuses without evidence and validates story-local evidence closure; `snapshot_replay_equality` now compares evidence lineage across new-schema parent/child pages. At D5 closeout, health-audit and MCP context-packet consumers were still follow-up scope in `archive/tickets/SPEC30STOCONHAR-006.md`; see the next note for that follow-up's completion. Remaining D5 prose below is historical specification context unless contradicted by these notes.

> **Implementation note (2026-05-15)**: D5 consumer follow-up `archive/tickets/SPEC30STOCONHAR-006.md` landed the read/consume side. `branching-story-health-audit` Phase 2e now prescribes `mystery_accretion_overflow` using ordered `evidence_records[]` chains and status progression; `tools/world-mcp` story-bundle context packets now surface per-mystery evidence chains from PG snapshots. Remaining D5 consumer prose below is historical specification context unless contradicted by this note.

> **Implementation note (2026-05-15)**: D6 landed via `archive/tickets/SPEC30STOCONHAR-007.md`. `.claude/skills/commitment-block-authoring/SKILL.md` now replaces the literal-effects-only Phase 4 belief-or-relationship coverage rule with a three-form OR over `effects.*`, `exit_options[].likely_effects`, and `preconditions.hard | soft` containing `any_belief(...)` / `any_relationship_axis(...)`; runtime consequences remain authoritative in `SE.state_delta`. Remaining D6 prose below is historical specification context unless contradicted by this note.

> **Implementation note (2026-05-15)**: D7 landed via `archive/tickets/SPEC30STOCONHAR-008.md`. `tools/validators` now registers `choice_set_noncollapse`, exposes it as a named `world-validate --story <story-slug> --rules=choice_set_noncollapse` selector, and tests commit-time collapse/error plus rhetorical warning behavior. `branching-story-turn-cycle` Phase 9 now treats `choice_set_collapse` as an ERROR page-commit gate, while `branching-story-health-audit` Phase 2a replays historical menus as `choice_set_collapse_observed`. Remaining D7 prose below is historical specification context unless contradicted by this note.

> **Implementation note (2026-05-15)**: D10 landed via `archive/tickets/SPEC30STOCONHAR-009.md`. Shared contract §4.5.7 and `story-relationship.schema.json` now require structured `SREL.direction: { kind, from, to }`, with conditional endpoint legality; `recursive_reference_closure` now proves closure over `direction.from` / `direction.to`; bootstrap and turn-cycle skill prose show the structured authored form. The D10 world-index and MCP rendering bullets remain future follow-up material because the live repo has no SREL edge extraction or context-packet SREL rendering surface to update.

> **Implementation note (2026-05-15)**: D8 landed via `archive/tickets/SPEC30STOCONHAR-010.md`. `branching-story-turn-cycle` now requires Motivation Grounding in `SE.world_logic_rationale` for non-system character actions, citing active STINT, actor-held BEL, actor-involving OBL/CNSQ/THR/SREL, or immediate physical affordance; Phase 9 now has 9 turn-cycle-additional checks. `branching-story-health-audit` Phase 2d now reports `motivation_ungrounded` as a warning-only audit signal. No schema, validator, patch-plan, approval-token, or canon-mutation surface changed; remaining D8 prose below is historical specification context unless contradicted by this note.

> **Implementation note (2026-05-15)**: D9 landed via `archive/tickets/SPEC30STOCONHAR-011.md`. `branching-story-turn-cycle` now requires Selection Rationale in `SE.world_logic_rationale` when a selected `SLT` outranks eligible equal-or-higher-salience competitors; Phase 9 now has 10 turn-cycle-additional checks. `branching-story-health-audit` Phase 2c now reports `saliency_starvation` as a warning over `N=3` consecutive pages when high-urgency `OBL` / `CNSQ` / `THR` / `STINT` records remain open while lower-urgency blocks are selected without rationale. No schema, validator, patch-plan, approval-token, or canon-mutation surface changed; remaining D9 prose below is historical specification context unless contradicted by this note.

---

## Problem Statement

`archive/reports/story-related-improvements-fourth-iteration.md` is an external review (ChatGPT-Pro, no codebase access) of the recently-overhauled branching-story pipeline. It evaluated 14 items against `docs/FOUNDATIONS.md` + the seven story-pipeline skills + `.claude/skills/_shared-templates/`. Every claim was re-checked against the working tree across three parallel exploration passes; the companion triage file ledgers all 14 verdicts. Ten items reach this spec: five P0 contract-hardening fixes the report flagged as pre-production-blocking, four P1 small additions whose surface is well-bounded, and one P2 pre-production schema cleanup. Two larger-scope items (storylet-pool linter cluster, story-sift recap mode) are deferred to follow-up specs; one (property-based tests) was already deferred indefinitely by the third-iteration triage.

The motivating production-readiness window: zero production stories exist yet — pre-greenfield is the cheapest moment to land schema/contract changes that would later require migration. The blast radius (mapped via parallel agent on `tools/`) covers `story-state-contract.md` + 4 JSON schemas + 6 validator files + 1 patch-engine op handler + 2 MCP tool files + 6 skill files. No `_source/` story bundles exist anywhere in the repository to migrate.

### Key design decisions

- **Considered STSTAT replacement of STENT in `promotion_claims.source_record` for `character_outcome` (per ChatGPT-Pro's framing); chose STSTAT-additive (STENT remains required, STSTAT becomes permitted as supporting supersession-chain evidence) because the identity/status separation at `story-state-contract.md:582-596` is deliberate** — STSTAT is a derived life/agency/location projection, STENT is identity. Folding STSTAT into the source-of-truth slot would conflate the two; folding it in as additive evidence preserves the separation while letting the supersession chain be cited.
- **Considered a structured `SE.commitment.selection_rationale` field; chose prose-only enrichment of `SE.world_logic_rationale` for saliency rationale because SPEC-28 D2's `SE.commitment` already records `selected_slt_id` / `selection_source` / `alias_bindings`** — adding a structured rationale field on top would proliferate the SE schema without proven need. The §6b observer-firewall audit operates on prose `world_logic_rationale` already; saliency-starvation health-audit can replay from the same surface. If prose audit proves too fuzzy after first production stories, promote to structured field at that point.
- **Considered enriching the `belief` predicate to handle both BEL-id and free-claim forms; chose explicit predicate split (`belief_record` for BEL-id, `any_belief` for prefiltering) because `story-state-contract.md:640` vs `story-state-contract.md:662` ambiguity is a Rule 1 hazard** — text-matching belief claims would become a validator nightmare. Removing the free-claim form is cleaner than reconciling it.
- **Considered SLT effects-schema additions (new fields like `effect_intent`); chose validator-rule change in `commitment-block-authoring` batch-diversity check because schema minimalism wins** — the tension at `commitment-block-authoring/SKILL.md:214` vs `:241-242` is rule-level, not schema-level, and the proposed three-form OR (effects / exit_options.likely_effects / preconditions) preserves the existing schema.
- **Considered backward-compatible `SREL.direction` migration; chose hard-cutover structured form because no production story bundles exist** — the validator/parser surface is the only consumer; pre-production is the lowest-cost cutover moment.
- **Considered including item 8 (SLT-pool linter, 6 sub-checks) and item 10 (story-sift recap mode) in this spec; deferred both to follow-up specs because cluster scope is structurally distinct from contract hardening and roughly doubles SPEC-30's surface area** — see Risks & Open Questions for the deferral risk and the triage file's Follow-ups section for sequencing.

---

## Deliverables

### D1 — PG-1 input legality `story_start` exception

**Problem**: `_shared-templates/story-state-contract.md:100-101` enforces "exactly one of `choice_id` / `manual_action_text` is non-null"; line 693-694 (Gate 1 validation) requires "exactly one source action (chosen CHC or write-in). Parent page exists and belongs to the named story bundle". For PG-1 the resolved event is `story_start`: there is no parent page, no chosen `CHC`, and no write-in. Either bootstrap silently violates the contract or the gate gets diluted to allow PG-1 by exception in implementation.

**Change**:
1. **Contract** (`_shared-templates/story-state-contract.md` §4.2 PG schema): replace the `# exactly one of choice_id / manual_action_text is non-null` comment with the conditional form:
   ```yaml
   # Input legality:
   # - If resolved_event.event_kind == story_start (i.e., parent_page_id == null, only PG-1):
   #     choice_id == null
   #     manual_action_text == null
   # - Otherwise:
   #     exactly one of choice_id / manual_action_text is non-null
   ```
2. **Schema** (`tools/validators/src/schemas/story-page.schema.json` lines 32-41): wrap `input` with `oneOf` covering the two cases, OR (preferred) keep `input` permissive at JSON-schema level and enforce the legality in `state-snapshot-integrity.ts` where the resolved event kind is already in scope.
3. **Validator** (`tools/validators/src/structural/state-snapshot-integrity.ts`): add a check that resolves `input.resolved_event_id` and applies the conditional legality. Emit `state_snapshot_integrity.pg_input_legality_violation` (severity: fail) when violated.
4. **Gate text** (`_shared-templates/story-state-contract.md:693-694`): rephrase Gate 1 to reflect the `story_start` carve-out — "Exactly one source action (chosen CHC or write-in) UNLESS the resolved event is `story_start`. Parent page exists and belongs to the named story bundle UNLESS the resolved event is `story_start` (PG-1)".
5. **Bootstrap** (`branching-story-bootstrap` Phase 6): update prose to cite the new contract carve-out so authors don't read the gate text and assume bootstrap violates it.

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md` (§4.2 + §gates)
- `tools/validators/src/schemas/story-page.schema.json`
- `tools/validators/src/structural/state-snapshot-integrity.ts`
- `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (new test cases for PG-1 + non-PG-1)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (Phase 6 prose)

**Verification**:
- Validator test: PG-1 with `choice_id: null` + `manual_action_text: null` + resolved event kind `story_start` → PASS.
- Validator test: PG-1 with non-null `choice_id` + `story_start` → `pg_input_legality_violation`.
- Validator test: PG-N (N>1) with both `choice_id: null` + `manual_action_text: null` + non-`story_start` event → `pg_input_legality_violation`.
- Bootstrap dry-run produces a PG-1 record that passes `record_schema_compliance` and `state_snapshot_integrity` against the updated schema.

---

### D2 — `branch_path` doc cleanup in bootstrap

**Problem**: `.claude/skills/branching-story-bootstrap/SKILL.md:295` says "§4.2's PG schema enumeration omits explicit listing of the field but §4.4 treats it as canonical". The contract at `_shared-templates/story-state-contract.md:97` now lists `branch_path: [PG-<integer>]*` in the §4.2 PG schema explicitly; the bootstrap note is stale residue.

**Change**:
1. Update bootstrap line ~295 to reflect that `branch_path` is now in §4.2 explicitly: replace "§4.2's PG schema enumeration omits explicit listing of the field but §4.4 treats it as canonical" with "Required by §4.2 of the shared contract; §4.4 documents the cross-reference into `SLT.scope.visible_branch_path_prefix` and the `recursive_reference_closure` validator's authorization rule."

**Files touched**:
- `.claude/skills/branching-story-bootstrap/SKILL.md` (one line)

**Verification**:
- Cross-file grep for "§4.2's PG schema enumeration omits" returns zero matches after the edit.

---

### D3 — Belief predicate split: `belief_record` (atomic) + `any_belief` (existential)

**Problem**: `_shared-templates/story-state-contract.md:640` defines `belief(holder, claim, mode?, confidence_floor?)` (claim is a free string); line 662 references `belief(holder, BEL-<integer>)` for actor-specific execution grounding. Two execution semantics share one predicate name. The DSL grammar (`tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`) already lists both `belief` and `any_belief` predicates; the underlying contract ambiguity is what needs resolving. Free-claim text matching would become a validator nightmare and violates Rule 1 (no free-form predicate prose).

**Change**:
1. **Contract** (`_shared-templates/story-state-contract.md:640`): rename and re-signature: `belief(holder, claim, mode?, confidence_floor?)` → `belief_record(holder, BEL-<integer>, mode?, confidence_floor?)`. Update the row's "When to use" cell to "turn-cycle eligibility, social-state firewall (actor-specific BEL grounding)".
2. **Contract** (`_shared-templates/story-state-contract.md:662`): update prose to cite `belief_record(holder, BEL-<integer>)` and `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)` as the two belief-family predicates. Explicitly forbid free-claim string matching.
3. **DSL grammar** (`tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`): replace `belief` entries (line 6 in `PRED_TYPES`, line 88 in `PREDICATE_ARG_SCHEMAS`) with `belief_record`. Update arg schema to require BEL-id (string matching `^BEL-\d+$`) for the second argument.
4. **DSL parser** (`tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`): rename `belief`-handling arms to `belief_record`; emit `unknown_predicate` for any literal `belief(` form remaining in SLT YAML.
5. **Skill prose**:
   - `commitment-block-authoring/SKILL.md:206`: replace "refined `belief(holder, claim, mode?, confidence_floor?)`" with "`belief_record(holder, BEL-<integer>, mode?, confidence_floor?)` for hard execution eligibility; `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)` for author-pool / branch-prefix prefiltering".
   - Search every story skill for the literal token `belief(` and update to `belief_record(` where the BEL-id form is meant; leave `any_belief(` alone.
6. **Cross-file legacy-string sweep**: after primary edits, grep for `\bbelief\(` (regex, not `any_belief(`) across all skill files + contract + tests + tools to catch residues.

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md`
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.test.ts` (new test cases)
- `.claude/skills/commitment-block-authoring/SKILL.md` and any references/
- `.claude/skills/branching-story-bootstrap/SKILL.md` and references/
- `.claude/skills/branching-story-turn-cycle/SKILL.md` and references/
- Other skill prose where `belief(` appears as a non-`any_belief` token

**Verification**:
- Validator test: SLT YAML containing `belief_record(STENT-1, BEL-3, mode: confident)` parses cleanly.
- Validator test: SLT YAML containing `belief(STENT-1, "the king is dead")` (free claim) emits `unknown_predicate`.
- Cross-file grep for `\bbelief\(` returns matches only in `belief_record` and `any_belief` contexts.

---

### D4 — `promotion_claims.source_record` enum expansion (+SREL; +STSTAT additive)

**Problem**: `_shared-templates/story-state-contract.md:220` enumerates `source_record: SF | BEL | DA | STENT`. Promotion source kinds in `story-fact-promotion-to-canon/SKILL.md:97` include `relationship_or_institutional_outcome` (SREL absent from enum) and `character_outcome` (status changes happen on STSTAT supersession chains, but only STENT is citable). ChatGPT-Pro's framing — "character outcomes often live in STSTAT, not STENT" — misreads the deliberate identity/status separation (`story-state-contract.md:582-596`); the correct framing is *additive evidence*, not replacement.

**Change**:
1. **Contract** (`_shared-templates/story-state-contract.md:220`): expand enum to `source_record: SF-<integer> | BEL-<integer> | DA-<integer> | STENT-<integer> | STSTAT-<integer> | SREL-<integer>`.
2. **Contract** (immediately following the enum): add a per-source-kind requirement table:
   - `story_fact` → SF required.
   - `mystery_resolution` → SF or BEL required.
   - `character_outcome` → STENT required; STSTAT MAY appear as supporting supersession-chain evidence; STENT alone is sufficient.
   - `artifact_canonization` → DA required.
   - `relationship_or_institutional_outcome` → SREL required; supporting BEL or SF allowed.
   - `other_branch_claim` → at least one source record from the enum required; no kind-specific constraint.
3. **Schema** (`tools/validators/src/schemas/story-event.schema.json:115`): update pattern from `^(SF|BEL|DA|STENT)-\d+$` to `^(SF|BEL|DA|STENT|STSTAT|SREL)-\d+$`.
4. **Validator** (`tools/validators/src/structural/recursive-reference-closure.ts`): include STSTAT and SREL in the closure check for `promotion_claims[].source_record`.
5. **Promotion skill** (`story-fact-promotion-to-canon/SKILL.md:114-116`): update the required-source-records table to match the per-kind requirements above. For `character_outcome`, document that the supersession chain MAY include STSTAT references showing the outcome's accumulation. For `relationship_or_institutional_outcome`, replace the prior STENT-only line with SREL-required.
6. **Closeout skill** (`story-promotion-closeout/SKILL.md:119-123`): note that closeout supersedes STSTAT records when the promotion's source_record set includes STSTAT (e.g., character outcome where STSTAT chain becomes canon).

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md`
- `tools/validators/src/schemas/story-event.schema.json`
- `tools/validators/src/structural/recursive-reference-closure.ts`
- `tools/validators/src/structural/recursive-reference-closure.test.ts`
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md`
- `.claude/skills/story-promotion-closeout/SKILL.md`

**Verification**:
- Validator test: `SE.promotion_claims` with `source_record: STSTAT-3` resolves cleanly when STSTAT-3 exists in bundle.
- Validator test: `SE.promotion_claims` with `source_record: SREL-2` resolves cleanly when SREL-2 exists in bundle.
- Promotion-skill dry-run: `character_outcome` with STENT-1 + STSTAT-2/STSTAT-3 supersession chain produces a valid proposal package.
- Promotion-skill dry-run: `relationship_or_institutional_outcome` with SREL-4 only produces a valid proposal package; without SREL emits a per-kind validation error.

---

### D5 — Mystery-claim `evidence_records[]`

**Problem**: `_shared-templates/story-state-contract.md:131-134` records `unresolved_mystery_claims[]` with `mystery_id`, `authority`, `status` only. The §Mystery Accretion rule (`docs/FOUNDATIONS.md:616`) requires `branching-story-health-audit` to walk the branch page chain and flag accumulated narrowing — but with no `evidence_records` field, the audit relies on prose/plans or semantic reconstruction to identify which records caused the narrowing. The audit becomes deterministic only with explicit evidence pointers.

**Change**:
1. **Contract** (`_shared-templates/story-state-contract.md:131-134`): extend the schema:
   ```yaml
   unresolved_mystery_claims:
     - mystery_id: M-<integer>
       authority: apparent | branch_local_counterfactual | canon_candidate
       status: preserved | clue_added | narrowed | apparent_resolution | held_for_promotion
       evidence_records: [SF-<integer> | BEL-<integer> | DA-<integer> | SE-<integer>]
   ```
   Add the legality rule: `evidence_records` MUST be non-empty when `status` is `clue_added | narrowed | apparent_resolution | held_for_promotion`; MAY be `[]` when `status` is `preserved`.
2. **Schema** (`tools/validators/src/schemas/story-page.schema.json:66-78`): add `evidence_records` array property with item pattern `^(SF|BEL|DA|SE)-\d+$`. Add conditional legality (status-aware required-when via `if`/`then` or document in cross-validator).
3. **Validator** (`tools/validators/src/_helpers/state-snapshot-replay.ts`): include `evidence_records` in the snapshot construction logic so replay equality preserves it.
4. **Validator** (`tools/validators/src/structural/snapshot-replay-equality.ts`): refine the comment-noted exclusion — currently `unresolved_mystery_claims` is excluded entirely; switch to comparing `mystery_id + authority + status + evidence_records` while still allowing in-page derivation.
5. **Validator** (`tools/validators/src/structural/state-snapshot-integrity.ts`): add the closure check (every `evidence_records` ID exists in the bundle) and the status-conditional non-empty check.
6. **Health-audit** (`branching-story-health-audit`): add a Mystery-Accretion sub-check that walks the branch chain, collects per-`mystery_id` `evidence_records` across all PG snapshots on the branch, and flags `mystery_accretion_overflow` when the cumulative count or status escalation exceeds the M record's policy.
7. **MCP** (`tools/world-mcp/src/context-packet/story-bundle-context.ts`): include `evidence_records` cross-references in story-bundle context-packet assembly.

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md`
- `tools/validators/src/schemas/story-page.schema.json`
- `tools/validators/src/_helpers/state-snapshot-replay.ts`
- `tools/validators/src/structural/snapshot-replay-equality.ts`
- `tools/validators/src/structural/state-snapshot-integrity.ts`
- `tools/validators/src/structural/state-snapshot-integrity.test.ts`
- `tools/world-mcp/src/context-packet/story-bundle-context.ts`
- `.claude/skills/branching-story-health-audit/SKILL.md` and Phase 2 sub-checks

**Verification**:
- Validator test: PG snapshot with `status: narrowed` + `evidence_records: [SF-7]` passes.
- Validator test: PG snapshot with `status: narrowed` + `evidence_records: []` emits `mystery_evidence_required`.
- Validator test: PG snapshot with `status: preserved` + `evidence_records: []` passes.
- Health-audit test: branch with three PGs each adding evidence to M-1 (`clue_added` → `clue_added` → `narrowed`) walks the chain deterministically and (when threshold exceeded) emits `mystery_accretion_overflow`.

---

### D6 — SLT effects diversity-check semantics

**Problem**: `commitment-block-authoring/SKILL.md:214` says `effects.create / supersede / close` MAY be empty when the block's effect-shape is contextual at runtime. `commitment-block-authoring/SKILL.md:241-242` simultaneously requires the batch-diversity belief-or-relationship-coverage check to find LITERAL `effects.create / supersede / close` entries containing BEL/SREL references. Authors who legitimately defer effects to runtime are forced to invent fake effects to pass the linter.

**Change**:
1. **Skill rule** (`commitment-block-authoring/SKILL.md:241-242`): replace the literal-effects-only requirement with the three-form OR — at least one block in the batch satisfies belief-or-relationship coverage by ANY of:
   - `effects.create / supersede / close` references a BEL/SREL record or `bound:<alias>` whose same-block existential predicate matches BEL/SREL (existing literal form).
   - `exit_options[].likely_effects` references a BEL/SREL record or `bound:<alias>`.
   - `preconditions.hard / soft` includes `any_belief(...)` or `any_relationship_axis(...)`.
2. **Skill rule**: add a closing sentence affirming "actual runtime consequences remain authoritative in `SE.state_delta` — the batch-diversity check verifies *intent surface*, not pre-authored effects".
3. **Skill rule**: extend the same three-form OR pattern to other batch-diversity coverage targets that today require literal-effects entries (audit `commitment-block-authoring/SKILL.md` §batch-diversity for any other target with the same literal-effects assumption).

**Files touched**:
- `.claude/skills/commitment-block-authoring/SKILL.md`
- `.claude/skills/commitment-block-authoring/references/` (any sub-doc that restates the rule)

**Verification**:
- Authoring dry-run: a batch where the belief-or-relationship-coverage block uses `any_belief(...)` in preconditions but empty `effects.*` passes the diversity check.
- Authoring dry-run: a batch where the block uses `exit_options[].likely_effects: [BEL-3]` but empty `effects.*` passes.
- Authoring dry-run: a batch where every block has empty `effects.*` AND no `exit_options.likely_effects` AND no `any_belief`/`any_relationship_axis` predicate emits `belief_or_relationship_coverage_missing`.

---

### D7 — `choice_set_noncollapse` validator (page-plan + turn-cycle gate)

**Problem**: `branching-story-health-audit/SKILL.md:163` Choice Consequence Integrity catches *individual* cosmetic accepted choices at audit-time replay. The choice menu itself can still collapse: three differently-worded `CHC` records on the same plan that all map to the same SLT, the same record set, the same `likely_state_pressure`. There is no current gate for choice-set collapse pre-selection.

**Change**:
1. **New validator** (`tools/validators/src/rules/rule_choice_set_noncollapse.ts`): for any non-terminal page with more than one CHC, at least two CHC records must differ materially in:
   - `target_or_action_families`, OR
   - `grounded_in.records`, OR
   - `associated_commitment_block`, OR
   - `likely_state_pressure`.
   Allow rhetorical variants only when the parent page plan explicitly marks them rhetorical via the same convention used by Choice Consequence Integrity.
   Emit `choice_set_collapse` (severity: error) when collapse detected; `choice_set_rhetorical_unmarked` (severity: warning) when ≥2 CHCs are identical on all four axes but neither is marked rhetorical.
2. **Registry** (`tools/validators/src/public/registry.ts`): add `ruleChoiceSetNoncollapse` to `ruleValidators[]`.
3. **Turn-cycle gate** (`branching-story-turn-cycle` Phase 7 — page-plan / CHC emission): run the validator during Phase 7 before the page commits. The page commit fails if `choice_set_collapse` fires.
4. **Health-audit** (`branching-story-health-audit` Phase 2): add an audit-time replay of the same check across all committed pages, emitting `choice_set_collapse_observed` for historical violations.
5. **Schema check**: confirm `CHC` schema has the four discriminating fields; if any is absent, document the omission in the validator and degrade gracefully (warn instead of error).

**Files touched**:
- `tools/validators/src/rules/rule_choice_set_noncollapse.ts` (new)
- `tools/validators/src/rules/rule_choice_set_noncollapse.test.ts` (new)
- `tools/validators/src/public/registry.ts`
- `tools/validators/src/schemas/story-choice.schema.json` (verify field coverage)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (Phase 7 prose — add the gate)
- `.claude/skills/branching-story-health-audit/SKILL.md` (Phase 2 prose — add the audit-time check)

**Verification**:
- Validator test: PG with three CHCs differing in `target_or_action_families` → PASS.
- Validator test: PG with three CHCs identical on all four axes, none marked rhetorical → `choice_set_collapse`.
- Validator test: PG with two CHCs identical, both marked rhetorical → PASS.
- Turn-cycle dry-run: Phase 7 emits an error and refuses to commit when `choice_set_collapse` fires.

---

### D8 — Motivation grounding (no schema change)

**Problem**: No current rule requires non-system character actions to be grounded in active STINT, BEL, OBL, CNSQ, THR, SREL, or immediate physical affordance. Characters can act because the system needed a beat — violates §Story Bundles intentionality contract.

**Change**:
1. **Turn-cycle additional check** (`branching-story-turn-cycle` action-validation phase): for every non-system character action (i.e., action attributed to a STENT actor, not to system-driven beats), verify at least one of the following is active in the page snapshot at action time:
   - An `STINT-<integer>` held by the actor.
   - A `BEL-<integer>` held by the actor with relevant content (§6b firewall already requires this for knowledge access; motivation-grounding extends to motive).
   - An `OBL-<integer>`, `CNSQ-<integer>`, `THR-<integer>` involving the actor.
   - An `SREL-<integer>` whose `from`/`to` includes the actor (D10 makes this structured; before D10 lands, match the free-string form).
   - An immediate physical affordance available to the actor at the page location.
   Record the grounding citation in `SE.world_logic_rationale`.
2. **Health-audit finding** (`branching-story-health-audit` Phase 2): add `motivation_ungrounded` (severity: warning) — replay across all SE records and flag actions where `world_logic_rationale` doesn't cite any of the listed grounding sources. Severity is warning (not error) because prose-level natural-language grounding may evade textual matching; surface as audit signal, not commit gate.
3. **Skill prose** (`branching-story-turn-cycle/SKILL.md`): add a short sub-section in the action-routing prose documenting the grounding requirement and the expected citation form in `world_logic_rationale`.

**Files touched**:
- `.claude/skills/branching-story-turn-cycle/SKILL.md`
- `.claude/skills/branching-story-health-audit/SKILL.md` (Phase 2 prose)
- (Optional, deferrable) `tools/validators/src/rules/rule_motivation_grounding.ts` if the audit-time check is moved into the validator lane

**Verification**:
- Turn-cycle dry-run: a character action grounded in an active STINT produces an SE whose `world_logic_rationale` cites the STINT-id; health-audit replay finds the citation and passes.
- Health-audit replay test: a character action with `world_logic_rationale` citing nothing in {STINT, BEL, OBL, CNSQ, THR, SREL, affordance} emits `motivation_ungrounded`.

---

### D9 — Saliency selection rationale (prose-only) + `saliency_starvation` audit

**Problem**: SPEC-28 D2 added `SE.commitment.selected_slt_id` and `selection_source` but no "why this block over other eligible high-salience blocks" rationale. When a high-urgency `OBL/CNSQ/THR/STINT` is repeatedly outranked by lower-urgency blocks, there's no recorded reason to surface to author or audit.

**Change**:
1. **Turn-cycle requirement** (`branching-story-turn-cycle` Phase 5/Phase 9 around SE emission): when `selected_slt_id` was chosen *over* one or more eligible competing blocks of equal-or-higher local salience, `SE.world_logic_rationale` MUST include a clause naming why the selected block won (e.g., "selected SLT-12 over SLT-7 because SLT-7's `obligation_open(OBL-3)` predicate failed in current visibility state"). When selection is uncontested (only one eligible block), no clause is required.
2. **Skill prose** (`branching-story-turn-cycle/SKILL.md`): document the rationale-clause requirement in the SE-emission section.
3. **Health-audit finding** (`branching-story-health-audit` Phase 2): add `saliency_starvation` (severity: warning) — replay across all SE records and flag patterns where a high-urgency `OBL/CNSQ/THR/STINT` remains open across N consecutive pages while lower-urgency blocks are repeatedly selected without `world_logic_rationale` citing the starvation. Tunable threshold (default N=3); document threshold in the audit prose.
4. **Future deferral note**: if prose audit proves too fuzzy after first production stories surface playable patterns, promote to a structured `SE.commitment.selection_rationale` field in a follow-up spec — flagged in Risks.

**Files touched**:
- `.claude/skills/branching-story-turn-cycle/SKILL.md`
- `.claude/skills/branching-story-health-audit/SKILL.md` (Phase 2 prose)

**Verification**:
- Turn-cycle dry-run: selecting SLT-1 over SLT-2 produces an SE whose `world_logic_rationale` names both and explains why SLT-1 won.
- Health-audit replay test: a branch with OBL-1 (urgency: high) open across pages 5/6/7/8 while SLT-2/SLT-3 (urgency: medium) are selected without rationale → `saliency_starvation` (one finding for OBL-1 with the four-page window cited).

---

### D10 — `SREL.direction` structured form

**Problem**: `tools/validators/src/schemas/story-relationship.schema.json:36` defines `direction: type: string, minLength: 1` with two example formats in the comment but no enforcement. Free-string semantics are fragile for validators (e.g., D8's motivation-grounding `SREL` actor-match needs structured `from`/`to`). Pre-production is the lowest-cost migration moment — zero `_source/` story bundles exist anywhere in the repo.

**Change**:
1. **Contract** (`_shared-templates/story-state-contract.md` §SREL schema, currently line 486): replace `direction: string*` with the structured form:
   ```yaml
   direction:
     kind: directed | bidirectional       # *
     from: STENT-<integer> | null         # required when kind == directed; null when bidirectional
     to: STENT-<integer> | null           # required when kind == directed; null when bidirectional
   ```
   Add legality rule: if `kind: directed`, both `from` and `to` MUST be non-null and reference STENT records in the bundle; if `kind: bidirectional`, both `from` and `to` MUST be null (the relationship is mutual; participants are documented elsewhere — typically in the `participants[]` field if present, or by cross-reference from STENT records).
2. **Schema** (`tools/validators/src/schemas/story-relationship.schema.json:36`): replace the string `direction` with an object schema matching the contract above. Use `oneOf` or `if`/`then` to enforce the kind-conditional from/to legality.
3. **Validator** (`tools/validators/src/structural/recursive-reference-closure.ts`): add `direction.from` and `direction.to` to the closure check for SREL records.
4. **Validator** (`tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`): if SREL references in predicates rely on parsed direction, update accordingly. (Likely no change — SREL records are referenced by id, not by direction.)
5. **World-index** (`tools/world-index/src/parse/semantic.ts`): update SREL edge extraction to read from the structured direction object instead of parsing free strings.
6. **MCP** (`tools/world-mcp/src/context-packet/story-bundle-context.ts`): update SREL rendering in context packets to format the structured direction (e.g., display "STENT-1 → STENT-3" for `directed` or "STENT-1 ↔ STENT-3" for `bidirectional` with participants from elsewhere).
7. **Skill prose**: update `branching-story-bootstrap/SKILL.md` and `branching-story-turn-cycle/SKILL.md` SREL-authoring sections to use the structured form. Update `_shared-templates/story-state-contract.md` examples.

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md` (§SREL schema)
- `tools/validators/src/schemas/story-relationship.schema.json`
- `tools/validators/src/structural/recursive-reference-closure.ts`
- `tools/validators/src/structural/recursive-reference-closure.test.ts`
- `tools/world-index/src/parse/semantic.ts`
- `tools/world-mcp/src/context-packet/story-bundle-context.ts`
- `.claude/skills/branching-story-bootstrap/SKILL.md`
- `.claude/skills/branching-story-turn-cycle/SKILL.md`
- (Optional) any documentation file (e.g., `docs/MACHINE-FACING-LAYER.md`) that examples SREL records

**Verification**:
- Validator test: SREL with `direction: { kind: directed, from: STENT-1, to: STENT-3 }` passes.
- Validator test: SREL with `direction: { kind: bidirectional, from: null, to: null }` passes.
- Validator test: SREL with `direction: { kind: directed, from: null, to: STENT-3 }` emits a schema error.
- Validator test: SREL with `direction: { kind: bidirectional, from: STENT-1, to: STENT-3 }` emits a schema error.
- World-index regenerate: SREL edge extraction produces the same edge set as before for the equivalent structured representation.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| Rule 1 — No Free-Form Predicate Prose | aligns | D3 removes the free-claim form of the belief predicate; `belief_record(holder, BEL-<integer>, ...)` is fully structured. D6 keeps SLT effects-rule discipline structural rather than letting authors fake effects to pass linting. |
| Rule 6 — No Silent Retcons | aligns | D1 closes the `story_start` schema-vs-gate contradiction so bootstrap can't silently violate the contract. D5 makes Mystery Accretion deterministically auditable rather than relying on prose semantic reconstruction. |
| §Story Bundles §4a — Plan-Authority Boundary | aligns | All ten deliverables operate on contract / validator / skill prose; none touches the prose-attach lifecycle or PG snapshot fork primitive. |
| §Story Bundles — Mystery Accretion (FOUNDATIONS:616) | aligns | D5 operationalizes the Mystery Accretion rule with explicit `evidence_records` so health-audit's chain walk is deterministic instead of reconstructive. |
| §6b — Information / Observer Firewall | aligns | D8 (motivation grounding) and D9 (saliency rationale + starvation audit) extend the §6b discipline from knowledge access to motive grounding and selection auditing — both rest on the same prose-rationale surface §6b already audits. |
| §Story Bundles — Phase 4.5 promotion routing | aligns | D4 closes the SREL absence gap in `promotion_claims.source_record` so `relationship_or_institutional_outcome` can cite the right record kind; STSTAT additive preserves the identity/status separation while letting supersession chains support `character_outcome` claims. |
| Rule 4 — No Capability Creep | aligns | D9 explicitly defers a structured `SE.commitment.selection_rationale` field; D8 explicitly defers `STINT.target_records`; D6 changes the rule, not the schema. Schema-minimalism preserved. |

---

## Risks & Open Questions

- **Item 8 (storylet-pool linter, 6 sub-checks) deferred to follow-up SPEC-31** *(pragmatic — cluster scope is structurally distinct from contract hardening and roughly doubles SPEC-30's surface area)*. If SPEC-31 doesn't land before first production stories, the SLT pool can develop blind spots that SPEC-30's `choice_set_noncollapse` and `motivation_grounding` don't catch (specifically: `dead_storylet`, `dominated_storylet`, `cooldown_trap` are not surfaced by any other audit). Recommended sequencing: author SPEC-31 immediately after SPEC-30 lands.
- **Item 10 (story_sift recap mode) deferred to follow-up spec** *(structural — recap is a different surface from validation; deserves its own design)*. No protective impact; pure author-comprehension feature.
- **Saliency rationale stays prose-only (D9), not structured**. If audit-time matching across `world_logic_rationale` prose proves too fuzzy after first production stories produce playable selection patterns, the structured `SE.commitment.selection_rationale` field gets promoted in a follow-up spec.
- **STSTAT additive in `promotion_claims.source_record` (D4)** assumes identity/status separation remains the right model for character outcomes. If playtests reveal that some character outcomes are *primarily* status-driven (e.g., a permanent-incapacitation outcome where STENT identity is unchanged but STSTAT trajectory is the load-bearing claim), revisit whether STSTAT should be elevated to required-source for a sub-class of `character_outcome` promotions.
- **`SREL.direction` hard cutover (D10)** assumes zero `_source/` story bundles exist anywhere in the repo at SPEC-30 land time. Verify with a fresh `find worlds/ -path '*/_source/relationships/*' -name '*.yaml'` before merging the schema change. If any bundle exists, add a one-time migration script.
- **D7 page-plan rhetorical-marking convention** assumes `CHC` schema or page-plan template has an existing rhetorical-mark mechanism that Choice Consequence Integrity uses; verify this exists during D7 implementation. If absent, D7 must add the mark mechanism alongside the validator.

---

## Out of Scope

- Storylet-pool linter cluster (item 8) — SPEC-31.
- Story-sift recap audit mode (item 10) — separate follow-up spec.
- Property-based branch simulation tests (item 11) — already deferred indefinitely by `docs/triage/2026-05-15-story-related-improvements-triage.md:41`.
- New `STPRAC` social-practice record class (item 13) — deferral confirmed.
- `STINT.target_records` structured target list (item 14) — deferral confirmed; D8 (motivation grounding) provides the audit surface that would surface need for target_records if it ever arose.
- Any change to canon-mutating skills, world-canon `_source/` records, or `docs/FOUNDATIONS.md` text. (D5 cites `docs/FOUNDATIONS.md:616` Mystery Accretion as the authority being operationalized; the FOUNDATIONS rule itself is not modified.)

---

## Outcome

Completed: 2026-05-15.

SPEC-30's owned deliverables landed through `archive/tickets/SPEC30STOCONHAR-001.md` through `archive/tickets/SPEC30STOCONHAR-011.md`:

- D1-D5 hardened PG input legality, branch-path bootstrap prose, predicate DSL belief semantics, promotion source records, and mystery-evidence lineage.
- D5 consumer follow-up D6, D7, D8, D9, and D10 landed the health-audit/MCP consumer side, SLT effects-diversity rule, choice-set noncollapse gate, motivation grounding, saliency selection rationale, `saliency_starvation`, and structured `SREL.direction`.
- The spec's implementation notes at the top of this file are the authoritative landed-state summary; the detailed deliverable prose remains historical proposal context unless contradicted by those notes.

Deviations from the original draft:

- D5 split into implementation plus consumer follow-up (`SPEC30STOCONHAR-006`) before the spec was considered complete.
- D10 intentionally left world-index SREL edge extraction and MCP context-packet SREL rendering as future follow-up material because the live repo has no such SREL surface to update.
- D9 remained prose-only by design; a structured `SE.commitment.selection_rationale` field remains deferred unless production story audits prove prose matching too fuzzy.
- Storylet-pool linter and story-sift recap remain out of scope for separate follow-up specs, as documented above.

Verification results:

- Active same-family ticket scan found no remaining `tickets/SPEC30STOCONHAR-*.md` files; all SPEC-30 implementation tickets are archived.
- The final D9 proof passed before this spec archival: grep proof found `Selection Rationale`, `saliency_starvation`, `N=3`, `selection_rationale`, and `10 turn-cycle-additional` on the live skill/spec surfaces.
- `git diff --check` passed before the spec archive move.
