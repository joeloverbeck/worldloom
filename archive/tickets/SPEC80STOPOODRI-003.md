# SPEC80STOPOODRI-003: health-audit Phase 2o storylet pool coverage warnings

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-health-audit/` (SKILL.md gained new sub-phase `Phase 2o — Storylet Pool Coverage` with Read paths paragraph + warning-emission discipline; description-line, HARD-GATE, process-flow, SAU report, and FOUNDATIONS alignment references now include 2o)
**Deps**: None

## Problem

At intake, `branching-story-health-audit` Phase 2 ran 14 structural sub-phases (2a-2n + 2x) per `SKILL.md:35`, including Phase 2l (active-state underuse warnings) and Phase 2n (reactivity inertness). Phase 2n detected the DOWNSTREAM symptom of pool-coverage failure — 3+ consecutive pages with player-driven turn drivers despite high-urgency active non-player records being available — but did not detect the UPSTREAM cause (the pool genuinely cannot express the demanded driver-kinds or source-classes). Without an upstream coverage scan, audits surfaced the reactivity symptom without the structural diagnosis: an operator reading a Phase 2n finding learned "your pool isn't enacting the pressure" but not "your pool genuinely can't enact this driver-kind because no SLT in it supports `secret_reveal` and you have active STSEC records."

This ticket added a new sub-phase `Phase 2o — Storylet Pool Coverage` that runs the SPEC-80 §3 coverage check against the bundle's current state, emitting WARNINGS (not hard fails) for uncovered driver-kinds, source-classes, and composition gaps. The new phase aligns with Phase 2n (reactivity inertness): 2n detects downstream symptoms, 2o detects upstream cause, and the two run alongside each other emitting complementary findings.

## Assumption Reassessment (2026-05-24)

1. At intake, verified `branching-story-health-audit/SKILL.md:35` enumerated exactly 14 structural sub-phases (2a-2n + 2x); verified Phase 2l (active-state underuse warnings) and Phase 2n (reactivity inertness) already walked active non-player records (STPLAN with `current_step` due, STEMO at high intensity, CLK at threshold, active THR, reveal-ready STSEC). Verified Phase 2j (Compatibility drift) uses 2j out-of-alphabetical-order for conditional compatibility-mode reporting; the new Phase 2o landed cleanly in the remaining alphabet slot.
2. Verified SPEC-80 §3.1 trigger map's STSEC row uses schema-grounded values `{hidden, partially_revealed}` per `tools/validators/src/schemas/story-secret.schema.json:88` enum. Verified the existential predicates and driver-kind enums referenced by §3.2 and §3.1 exist at the cited schema/contract sites.
3. **Cross-skill boundary under audit**: Phase 2o reuses Phase 2l's per-page active-record enumeration for the trigger-map DEMAND side (the active non-player record walk Phase 2l already performs is the same enumeration Phase 2o's §3.1/§3.2 trigger maps consume). The SLT-pool SUPPLY side is loaded independently via `mcp__worldloom__list_records(record_type='story_storylet', story_slug=<story_slug>, include_full_body=true)` — `mcp__worldloom__select_storylet_candidates` requires `parent_page_id` + `turn_driver` filters that are inappropriate for whole-pool coverage diagnostics. The shared contract surface: SPEC-80 §3 trigger maps (consumed identically by 001's bootstrap-author-side rule, 002's commitment-block-authoring Phase 1 targets #16/#17, and 003's health-audit Phase 2o).
4. **FOUNDATIONS principles under audit**: Validation Rule 5 (No Consequence Evasion) — pool-coverage gaps at runtime become consequence-evasion risks; Phase 2o surfaces the upstream cause that Phase 2n detects downstream symptoms of. Validation Rule 7 (Preserve Mystery Deliberately) — Phase 2o's `secret_reveal` trigger references story-local STSEC records, distinct from world-level `M-<integer>` Mystery Reserve entries; the coverage warning surfaces expressive capacity only (does the pool contain a `secret_reveal`-compatible SLT when an unrevealed STSEC is active?) and does not enable any reveal. The existing mystery firewall (story state contract §7 gate 3 enforced at page-plan commit + Phase 2e Mystery / canon safety) continues to gate every actual STSEC reveal against forbidden-status M overlap independently. SPEC-80 does not weaken Rule 7 per SPEC-80 §7 Rule 7 row.
5. Reassessment corrected the proof boundary: no executable `/branching-story-health-audit` dry-run runner is available in this Codex context. The accepted verification surface is grep proof plus manual contract review of the edited skill prose against SPEC-80 §3/§4.3 and FOUNDATIONS Rule 5 / Rule 7. The drafted dry-run scenarios remain future/operator validation examples, not commands run by this ticket.
6. HARD-GATE discipline was read because the landed edit updates the skill's existing `<HARD-GATE>` phase enumeration. The change preserves gate order, approval timing, deliverable-summary approval, write surfaces, and failure semantics; it only adds Phase 2o to the structural work that must complete in memory before the unchanged approval gate can fire.

## Architecture Check

1. **WARNING severity, not hard fail**: Phase 2o emits WARNINGS for uncovered coverage gaps, consistent with health-audit's read-only audit posture (it diagnoses, it does not block). Phase 2o sits parallel to Phase 2l's WARNING-emitting underuse warnings; both are diagnostic, not gate-enforcing.
2. **Whole-pool read, not parent-PG-filtered**: Phase 2o needs every author-pool SLT to check coverage against demand; per-page eligibility (which `select_storylet_candidates` returns) is the wrong filter for a coverage audit. Using `list_records(record_type='story_storylet', story_slug=<story_slug>, include_full_body=true)` for the SLT-pool read is the structurally correct path; the `include_full_body=true` flag retrieves the `grounding.compatible_turn_drivers[]` and `preconditions.hard[]` / `preconditions.soft[]` fields that the §3.1/§3.2 trigger maps walk.
3. **Reuses Phase 2l/2n enumeration, does not re-walk**: Phase 2o's trigger-map DEMAND side reads from the per-page active-record enumeration Phase 2l already performs during its underuse-warning walk. Phase 2o is wired into the same scan pass; it does not introduce a third independent active-record walk.
4. **Upstream/downstream pairing with Phase 2n**: Phase 2o (upstream cause) + Phase 2n (downstream symptom) form a paired diagnosis. An audit surfacing BOTH a Phase 2n reactivity-inertness window AND a Phase 2o pool-coverage gap for the same driver-kind / source-class gives the operator both the symptom AND the structural cause; an audit surfacing only Phase 2n indicates the pool CAN express but is choosing not to (runtime-selection issue); an audit surfacing only Phase 2o indicates the pool cannot express but the bundle hasn't exercised the demand yet.
5. No backwards-compatibility aliasing or shims introduced. Phase 2o is a net-new sub-phase; existing Phase 2a-2n + 2x + 2j unchanged.

## Verification Layers

1. New Phase 2o sub-phase added to `branching-story-health-audit/SKILL.md` Phase 2 → codebase grep-proof: `grep -n "^### Phase 2o:" .claude/skills/branching-story-health-audit/SKILL.md` returns 1 match.
2. Phase 2o enumeration added to the description line and HARD-GATE phase list → codebase grep-proof: `grep -n "2o storylet pool coverage" .claude/skills/branching-story-health-audit/SKILL.md` returns the enumeration hit.
3. Phase 2o warning contract present → codebase grep-proof plus manual review: `grep -n "storylet_pool_coverage_gap" .claude/skills/branching-story-health-audit/SKILL.md` returns the warning type, and the edited prose requires uncovered driver-kind, source-class, and composition-pair warnings with the `commitment-block-authoring direct_batch` hint.
4. Mystery Reserve firewall preservation → FOUNDATIONS alignment check: SPEC-80 §7 Rule 7 row asserts the coverage warning surfaces expressive capacity only; story state contract §7 gate 3 + Phase 2e continue to gate every actual STSEC reveal independently. Phase 2o reads STSEC `status` (per §3.1 trigger map) but does NOT mutate any record, does NOT emit any reveal event, and does NOT bypass any existing mystery firewall.

## Landed Changes

### 1. Added new Phase 2o sub-phase to `branching-story-health-audit/SKILL.md`

Inserted a new sub-phase heading and body after Phase 2n:

> ### Phase 2o: Storylet Pool Coverage
>
> Runs the SPEC-80 §3 coverage check against the current bundle state. Emits WARNINGS (not hard fails) for uncovered driver-kind, pressure-source-class, and composition gaps. Aligns with the existing reactivity-inertness audit (Phase 2n) — that audit detects DOWNSTREAM symptoms (active records sitting inert); this audit detects UPSTREAM cause (pool can't express).
>
> **Read paths.** Phase 2o reuses the per-page active-record enumeration already performed by Phase 2l and Phase 2n for its trigger-map DEMAND side — both phases already walk active non-player records (STPLAN with `current_step` due, STEMO at high intensity, CLK at threshold, active THR, reveal-ready STSEC). The SLT-pool SUPPLY side is loaded independently via `mcp__worldloom__list_records(record_type='story_storylet', story_slug=<story_slug>, include_full_body=true)` — `mcp__worldloom__select_storylet_candidates` requires `parent_page_id` + `turn_driver` filters that are inappropriate for whole-pool coverage diagnostics (a coverage check needs every author-pool SLT regardless of any single page's driver context).
>
> Emit `storylet_pool_coverage_gap` WARNINGS with the gap shape from SPEC-80 §4.2 (`driver_kind_coverage / pressure_source_coverage / composition_gaps`). Each finding cites the uncovered driver-kind / source-class / pair, the triggering active record(s), and the actionable hint "extend the pool via `commitment-block-authoring` direct_batch addressing these gaps."

### 2. Updated Phase 2 enumeration in the description line at `SKILL.md:35`

The HARD-GATE phase enumeration now says:

> 15 structural sub-phases (2a replay, 2b branch isolation, 2c debt health, 2d belief / visibility health, 2x DA health, 2e mystery / canon safety, 2f continuation / terminal proof, 2g causal dependency health, 2h canon baseline drift, 2i CLK / STSEC / STQ mechanism health, 2k STPLAN / STEMO health, 2l active-state underuse warnings, 2m STCHAR authority health, 2n reactivity inertness, 2o storylet pool coverage)

The skill description and process-flow diagram now also name 2o, and the Phase 2 body now says "Fifteen sub-phases".

### 3. Implemented Phase 2o coverage check prose

The landed Phase 2o prose wires the check into the Phase 2 structural-mode scan pass. The check:

- Reuses Phase 2l's active-record enumeration per scanned page (no third independent walk).
- Loads the SLT pool via `mcp__worldloom__list_records(record_type='story_storylet', story_slug=<story_slug>, include_full_body=true)` once per audit invocation (the pool is bundle-scoped, not per-page).
- Applies SPEC-80 §3.1/§3.2/§3.3 trigger maps + composition rule to compute the gap shape.
- Emits one `storylet_pool_coverage_gap` WARNING per uncovered driver-kind, source-class, and composition pair. Composition gaps may be top-N capped per SPEC-80 §9 (suggest N=20).
- Records findings in the SAU report parallel to Phase 2n's emission shape.

### 4. Updated SAU report assembly and alignment references

The SAU report template now includes a `Storylet pool coverage` section for Phase 2o findings alongside the existing Phase 2 sections. The Rule 5 validation summary and FOUNDATIONS alignment table now include Phase 2o as a No Consequence Evasion surface.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify) — added Phase 2o sub-phase heading + body after Phase 2n; updated description-line and HARD-GATE enumeration with "2o storylet pool coverage"; bumped structural count from 14 to 15; added the SAU report section and FOUNDATIONS alignment references.

## Out of Scope

- Schema changes to SLT, STSEC, STPLAN, STEMO, CLK, STQ, THR, OBL, CNSQ records (SPEC-80 §5 explicitly forbids).
- Auto-generation of SLTs to close the surfaced coverage gaps (SPEC-80 §6 explicit non-goal — Phase 2o INFORMS authoring via the actionable hint; the commit-block-authoring direct_batch flow is the explicit follow-up).
- Hard-failing the audit on Phase 2o gaps (audits are read-only diagnostic; gaps are WARNINGS, not blockers).
- Emitting `RSP-<integer>` remediation cards from Phase 2o findings in this ticket (existing Phase 5 remediation drafting at `SKILL.md:404` may be extended to consume Phase 2o findings as a follow-up; out of scope here unless trivially absorbed).
- Editing `branching-story-bootstrap/` or `commitment-block-authoring/` — those surfaces are owned by `archive/tickets/SPEC80STOPOODRI-001.md` and `archive/tickets/SPEC80STOPOODRI-002.md` respectively.
- Modifying the Mystery Reserve firewall (story state contract §7 gate 3 or Phase 2e); Phase 2o is read-only and does not gate any reveal.

## Acceptance Criteria

### Tests That Must Pass

1. Codebase grep-proof: `grep -n "^### Phase 2o:\|2o storylet pool coverage\|storylet_pool_coverage_gap" .claude/skills/branching-story-health-audit/SKILL.md` returns the new sub-phase heading, enumeration hits, and warning type.
2. Manual contract review: edited Phase 2o prose matches SPEC-80 §3/§4.3 by deriving demand from active records, reading the whole SLT pool with `list_records(... include_full_body=true)`, emitting WARNING findings, and preserving read-only audit posture.
3. Manual FOUNDATIONS alignment review: Phase 2o supports Rule 5 by surfacing pool-level consequence-evasion risk and preserves Rule 7 by only warning about story-local STSEC expressive capacity, not revealing or mutating records.
4. Not run: `/branching-story-health-audit` skill dry-runs against positive and negative fixture bundles. No executable Claude-skill runner is available in this Codex context; those fixture scenarios remain future/operator validation examples.

### Invariants

1. Phase 2o emits WARNINGS, not hard fails. The audit's read-only diagnostic posture is preserved.
2. Phase 2o is read-only: it reads bundle active records (via Phase 2l reuse) and the SLT pool (via `list_records`) but mutates nothing. No record write, no reveal event, no firewall bypass.
3. Mystery Reserve firewall (story state contract §7 gate 3 + Phase 2e) continues to gate every actual STSEC reveal against forbidden-status M overlap independently of Phase 2o. The coverage check tests EXPRESSIVE CAPACITY of the pool; it does not enable, weaken, or bypass any reveal-time gate (SPEC-80 §7 Rule 7 row).
4. Phase 2o uses SPEC-80 §3 trigger maps as the single source of truth — identical to the maps consumed by `archive/tickets/SPEC80STOPOODRI-001.md`'s bootstrap-author-side Phase 10 HARD-GATE and `archive/tickets/SPEC80STOPOODRI-002.md`'s commitment-block-authoring Phase 1 targets #16/#17.
5. Phase 2o reuses Phase 2l's per-page active-record enumeration; it does not introduce a third independent active-record walk.

## Test Plan

### New/Modified Tests

1. None — documentation-only skill contract ticket; verification is grep-proof plus manual contract review because no executable Claude-skill dry-run runner is available in this Codex context.

### Commands

1. `grep -n "^### Phase 2o:\|2o storylet pool coverage\|storylet_pool_coverage_gap" .claude/skills/branching-story-health-audit/SKILL.md` — verify the new sub-phase heading + description-line enumeration update + warning type landed.
2. Manual contract review against SPEC-80 §3/§4.3 and `docs/FOUNDATIONS.md` Rule 5 / Rule 7 — verify Phase 2o is a read-only warning diagnostic for pool expressive capacity, not runtime ranking, record mutation, or Mystery Reserve bypass.

## Outcome

Completed: 2026-05-25

This ticket landed the health-audit side of SPEC-80. `branching-story-health-audit` structural mode now includes `Phase 2o: Storylet Pool Coverage`, with demand-side active-record enumeration reuse, whole-pool SLT supply read via `mcp__worldloom__list_records(... include_full_body=true)`, SPEC-80 §3 driver/source/composition coverage rules, `storylet_pool_coverage_gap` WARNING findings, and the `commitment-block-authoring direct_batch` actionable hint. The skill description, HARD-GATE phase enumeration, process-flow diagram, Phase 2 count, SAU report template, Rule 5 validation summary, and FOUNDATIONS alignment table now include the new phase.

## Verification Result

1. `grep -n "^### Phase 2o:\|2o storylet pool coverage\|storylet_pool_coverage_gap" .claude/skills/branching-story-health-audit/SKILL.md` — passed; returned the Phase 2o heading, `2o storylet pool coverage` enumeration, and `storylet_pool_coverage_gap` warning type.
2. `rg -n "14 structural|Fourteen" .claude/skills/branching-story-health-audit/SKILL.md` — passed; returned no matches after the process-flow count was corrected.
3. Manual contract review against SPEC-80 §3/§4.3 and `docs/FOUNDATIONS.md` Rule 5 / Rule 7 — passed; Phase 2o is read-only, emits warnings rather than hard fails, diagnoses author-pool expressive capacity against present active records, does not rank runtime candidates, does not mutate records, and does not bypass existing STSEC / Mystery Reserve reveal gates.

## Deviations

The drafted acceptance listed `/branching-story-health-audit` dry-runs against positive and negative fixture bundles. Those were not run because this Codex context has no executable Claude-skill runner. The accepted proof boundary is grep proof plus manual contract review over the edited skill surface; the SPEC-80 §8 fixture scenarios remain future/operator validation examples.
