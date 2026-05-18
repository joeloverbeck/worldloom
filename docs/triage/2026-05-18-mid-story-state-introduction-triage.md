# Mid-story state introduction triage — 2026-05-18

**Source**: `reports/mid-story-state-introduction.md` (ChatGPT-Pro deep-research response, 2026-05-18, in response to `reports/mid-story-state-introduction-research-brief.md` by Claude Opus same day).
**Deliverable**: `specs/SPEC-43-present-causal-mid-story-state-introduction.md`.
**Triage operator**: Claude Opus 4.7 (1M context) via `/brainstorm` workflow with user pre-authorization ("create a spec in specs/*").

## Verification corrections (reframings to source report)

- **R-correction-A**: Source report §2 + §11 frame turn-cycle Phase 10 op enumeration as omitting `create_clk_record` / `create_stsec_record` / `create_stq_record` / `create_thr_record` / `create_srel_record` / `create_stent_record`. Verified incorrect — the wildcard `create_*_record` at `.claude/skills/branching-story-turn-cycle/SKILL.md:155` deliberately covers all six. **The gap is in the Output table rows (113–129) and Phase 2/3 + Phase 4/5 reference prose**, not the op enumeration. SPEC-43 amends the table + phase prose only; Phase 10 op-list amendment dropped.
- **R-correction-B**: Source report §10 (and the upstream research brief §5) framed red-bunny as a pre-SPEC-42 bundle that needs validation; verified red-bunny was bootstrapped 2026-05-17 (one day before SPEC-42 merged 2026-05-18) — IS a valid pre-SPEC-42 backwards-compatibility case study. Its `_source/` is missing `clocks/`, `secrets/`, `story-questions/`, `artifacts/`; its PG snapshots include `DA: []` empty placeholder but omit CLK / STSEC / STQ keys entirely.

## Verdicts

### Accept (proposal stands as recommended)

- **R1** — Present-causal mid-story introduction doctrine. _Rationale_: §5c-aligned by construction; "not reducible to an existing active record" clause prevents duplicate-record drift.
- **R2** — Storylet-mediated introduction. _Rationale_: keeps introduction inside the `SLT` causal-move primitive per §5a.
- **R3** — No new predicate DSL entries in Wave 2. _Rationale_: DSL is eligibility-over-active-state; introduction is proof-about-just-committed-event; preserves closed-DSL discipline at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:4-41`.
- **R8** — Old PG snapshots handled by normalization, not rewrites. _Rationale_: PG-rewrites would constitute Rule 6 Silent Retcons; PG schema already permissive (`additionalProperties: true` at `story-page.schema.json:68`).
- **R10** — Non-goals list. _Rationale_: matches FOUNDATIONS §5c + §5a prohibitions exactly; lifted verbatim into SPEC-43 §Out of Scope.
- **§6 class-by-class introduction rules (CLK / STSEC / STQ / THR / STENT / SREL)** en bloc. _Rationale_: each class's creation-threshold + supersede-threshold + minimum-grounding + anti-pattern set is FOUNDATIONS-aligned; STSEC "first lie rule" especially well-targeted to §6a.

### Confirms-existing-position

- **R6** — Absence of optional CLK / STSEC / STQ is not a finding. _Rationale_: already canonical per `branching-story-health-audit/SKILL.md:280` and SPEC-42 §Verification's backwards-compatibility guarantee. SPEC-43 re-affirms.

### Accept-with-modification

- **R4** — Eight new validators → expanded to nine. _Modification scope_: (a) PROMOTE `introduction_observer_firewall` from Wave 3 to Wave 2 with explicit-reference scope (inferential access stays Wave 3); (b) clarify `narrative_shape_field_rejection` as extending per-class beyond the existing STQ check at `record_schema_compliance`; (c) sharpen `entity_introduction_status_pairing` precondition to require `STENT` IS in `SE.state_delta.create[]` before pairing-requirement fires (prevents over-fire on existing-entity status updates).
- **R5** — Turn-cycle skill amendments. _Modification scope_: drop the Phase 10 op-list amendment (R-correction-A); keep Output table + Phase 2/3 + Phase 4/5 + page-plan §10b + Phase 9 amendments. Add explicit Phase 4 belief-propagation hook for STSEC creation.
- **R7** — Compatibility drift as operational, not fictional. _Modification scope_: keep doctrine + `event_kind: system_repair` tag for unavoidable repairs; defer `fail` severity for "new current-contract page omits required active-record shape" to Wave 3 (Wave 3 marker makes detection deterministic; Wave 2 keeps `warn`).
- **R9** — Wave 2 / Wave 3 partition. _Modification scope_: shifts per R4 (observer firewall → Wave 2) and R7 (drift validator `fail` → Wave 3). Otherwise as recommended.

### Defer (to follow-up specs / waves)

- **§10 dedicated `branching-story-compatibility-repair` skill** (Wave 3). _Rationale (structural)_: scope-distinct from mid-story introduction; distinct user surface and authoring posture. _Deferred to_: follow-up spec (working title SPEC-44 or later); trigger = Wave 2 surfaces ≥1 `requires_migration_patch` classification on a real bundle.
- **§10 `story_system_contract_revision` marker** in STORY_KERNEL.md frontmatter (Wave 3). _Rationale (pragmatic)_: structurally cleaner if bundled with Wave 2 but retrofit cost too high. _Deferred to_: same follow-up spec; trigger = repair skill needs deterministic current-contract detection.
- **CLK `linked_records[]` widening** (Wave 3). _Rationale (pragmatic)_: current 8-class pattern at `story-pressure-clock.schema.json:39` may force workarounds for psychological-pressure clocks. _Deferred to_: schema-expansion ticket; trigger = ≥3 documented workaround cases in Wave 2 fixture authoring or live use.
- **Inferential-access scope in `introduction_observer_firewall`**. _Rationale (pragmatic)_: explicit-reference scope ships Wave 2; inferential needs more design surface. _Deferred to_: follow-up validator ticket; trigger = Wave 2 false-negative reports.
- **Hard `fail` severity for `compatibility_drift`**. _Rationale (pragmatic)_: contract marker enables deterministic classification. _Deferred to_: same follow-up spec as marker.
- **Private production-batch audit tooling** (Wave 3). _Rationale (structural)_: standalone tooling surface. _Deferred to_: follow-up tooling ticket; trigger = authors with multiple legacy bundles request batch handling.

### Reject

None. Proposal is FOUNDATIONS-aligned end-to-end.

## Out-of-report findings (auditor-introduced)

- **O1** — Phase 10 wildcard nuance (already covered in R-correction-A). SPEC-43 §Deliverables explicitly cites the wildcard at SKILL.md:155.
- **O2** — PROMOTE `introduction_observer_firewall` to Wave 2. Landed in R4 modification scope.
- **O3** — `narrative_shape_field_rejection` scope clarification (extends per-class beyond existing STQ check). Landed in R4 modification scope.
- **O4** — `intro:<CLASS>(...)` tag grammar needs precise specification. Landed in SPEC-43 §Approach B with formal grammar + exported parser utility.
- **O5** — Closed trigger vocabularies need canonical home in `_shared-templates/`. Landed in SPEC-43 §Deliverables (`story-state-contract.md` §4.5.X).
- **O6** — Phase 2i (health-audit) vs Phase 9 (turn-cycle) integration needs explicit treatment. Landed in SPEC-43 §Approach H.
- **O7** — `entity_introduction_status_pairing` over-fire prevention. Landed in R4 modification scope + SPEC-43 §Verification.
- **O8** — CLK `linked_records[]` narrowness deferred-but-document. Landed in SPEC-43 §Out of Scope with explicit re-evaluation trigger.
- **O9** — Snapshot-key normalization replay specification. Landed in SPEC-43 §Approach F.
- **O10** — New child PG materializing the full active-record map. Landed in SPEC-43 §Approach F as the "current-contract era begins at child PG" rule.

## Deliverable-shape decision

One spec at `specs/SPEC-43-present-causal-mid-story-state-introduction.md`. Bundled (not split into SPEC-43 + SPEC-44) because both concerns share §5c discipline and overlap deliverable surfaces (validators, audit-mode integration, replay semantics). Wave 3 deferrals captured in SPEC-43 §Out of Scope with explicit re-evaluation triggers; they will form the SPEC-44 candidate when triggers fire. No tickets created in this brainstorm — user pre-authorized "a spec" only.

`specs/IMPLEMENTATION-ORDER.md` is absent in `specs/`; index update skipped per Step 5 default. Per Step 6 summary.
