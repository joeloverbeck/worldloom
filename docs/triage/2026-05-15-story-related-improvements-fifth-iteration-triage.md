# Triage — Story-Related Improvements (Fifth Iteration)

**Date**: 2026-05-15
**Source**: `reports/story-related-improvements-fifth-iteration.md` — external review (ChatGPT-Pro) of the post-SPEC-30 branching-story system, fed `docs/FOUNDATIONS.md` + the seven story-pipeline skills + `.claude/skills/_shared-templates/` + `docs/CONTEXT-PACKET-CONTRACT.md` + `docs/MACHINE-FACING-LAYER.md`. 19 evaluated items (14 findings: 1 P0, 9 P1, 4 P2 + 5 negative recommendations).
**Outcome**: 14 accepted → `specs/SPEC-31-story-contract-hardening-iii.md` (D1–D14); 5 confirms-existing-position (negative recommendations R-01 through R-05).
**Verification**: every finding re-checked against the working tree across one parallel exploration pass (full surface map of `_shared-templates/story-state-contract.md` + 7 story skills + `docs/CONTEXT-PACKET-CONTRACT.md` + `docs/MACHINE-FACING-LAYER.md` + `tools/validators/src/schemas/` + `tools/world-mcp/src/tools/`) plus direct file:line inspection by the operator on the highest-blast-radius findings (F-01, F-04, F-07, F-08, F-09, F-11, F-13). Diagnoses are uniformly sound; this is the strongest external iteration to date — codebase verification surfaced no false positives.
**Cross-iteration check**: no overlap with SPEC-28 (D1–D7, merged 2026-05-13) or SPEC-30 (D1–D10, merged 2026-05-15). F-05 (ARCTRACE in MACHINE-FACING-LAYER.md) is a residue SPEC-29 (legacy tools vocabulary cleanup) missed — the SPEC-29 sweep targeted `tools/world-mcp/` and `tools/validators/` surfaces; `docs/MACHINE-FACING-LAYER.md` `:67` was not in its diff. SPEC-31 absorbs the residue.
**Severity reclassifications**: F-06 P1→P2 (closeout direct reads are read-only; Hook 3 blocks writes only; case for MCP conversion is consistency, not safety). F-07 P1→P2 (documentation muddle, not behavior contradiction). F-11 P2→P1 (Phase 2e references a non-existent field — broken reference, not hypothetical).

## Accepted → SPEC-31 (D1–D14)

| Intake | Severity | Deliverable | One-line rationale |
|---|---|---|---|
| F-01 / A-01 | **P0** | D1 | Real lifecycle lie: PG.prose_path/prose_receipt_path read by health-audit `:250-251`, turn-cycle `:162`; written null at commit by bootstrap `:313` + turn-cycle `:373`; prose-attach never mutates PG `:31`. Hash payload already excludes them `:181-182` so fork-replay is safe — but the two consumer surfaces silently break. Delete fields; replace consumer checks with deterministic-path filesystem stats. |
| F-02 / A-02 | P1 | D2 | Contract gap: contract `:209,:214,:242` enumerate `prose_attach` and `promotion_closeout` event_kind values but never specify page-emission / state-delta / replay semantics. Add §4.3a (audit-only SEs are page-less, delta-empty, replay-ignored ledger evidence). |
| F-03 / A-03 | P1 | D3 | Real contradiction: contract `:266` says SLT.created_at_page is null only for global_author_pool; commitment-block-authoring `:175` writes null for both direct_batch and audit_repair regardless of scope. Reformulate as origin-keyed: required for runtime_jit; nullable for page-independent origins. |
| F-04 / A-04 | P1 | D4 | Real 3-way drift: CONTEXT-PACKET-CONTRACT `:125` says story_bootstrap returns story_bundle_context:null; MACHINE-FACING-LAYER `:76` says it's populated; bootstrap pre-flight `:209` omits story_slug arg entirely. Standardize: requires story_slug, returns null story_bundle_context, reserves INV/M full bodies. |
| F-05 / A-05 | P1 | D5 | Real residue: MACHINE-FACING-LAYER `:67` lists `ARCTRACE` in get_record id classes; SPEC-29 sweep missed this surface. While editing, explicitly disambiguate world-level vs. story-local DA scope. |
| F-08 / A-08 | P1 | D6 | Real impurity: story-fact-promotion-to-canon `:197-210` embeds `source_basis.story_branch`, `source_basis.story_evidence`, `promotion_provenance` inside `candidate:`; `:169` claims candidate "matches CF schema strictly". Split: pure CF candidate + top-level proposal_evidence. Eliminates strip-on-accept fragility in canon-addition. |
| F-09 / A-09 | P1 | D7 | Real coverage gap: closed enum exists at turn-cycle `:292` + health-audit `:190` (5 reasons), but turn-cycle `:293` records rationale free-form in "authoring notes". Parseable tag convention `non_propagation:<reason>(group=..., records=[...])` inside SE.world_logic_rationale; no new schema field. |
| F-10 / A-10 | P1 | D8 | Real evidence gap: turn-cycle `:164-165` and health-audit `:238` use only-latest-CH for drift comparison. Require CH-window load (every CH newer than parent baseline + affected CF/M/INV/SEC) before classifying drift. |
| F-11 / A-11 | P1 (reclassified up) | D9 | Real broken reference: health-audit Phase 2e `:206` cites `M-record's accretion_policy.max_clues / equivalent limit` but FOUNDATIONS Mystery Reserve schema does not define this field. Reclassified P2→P1: this is a broken reference, not a forward guard. Make conditional: enforce policy if M record exposes validator-backed field; otherwise schema-backed progression only; collective-answer is judgment-assisted. |
| F-06 / A-06 | P2 (reclassified down) | D10 | Real but non-gating: closeout `:140-141, :155, :167` instructs raw filesystem reads of CF/CH/PA. Reads are read-only; Hook 3 only blocks writes; Phase-3 gate-1 verification keeps the patch plan canon-safe. Reclassified P1→P2: the case for MCP conversion is retrieval-contract consistency, not safety. |
| F-07 / A-07 | P2 (reclassified down) | D11 | Real but documentation-level: source-kind mapping at `:113` muddles "governing firewall load (M)" with "source record (SF/BEL)"; contract `:236` is clean. Reclassified P1→P2: parameter naming stays stable; clarify mapping prose so user-supplied source_record_ids takes SF/BEL and M is auto-loaded. |
| F-12 / A-12 | P2 | D12 | Real overstatement: prose-attach `:193` presents `invented_structural_fact` as deterministic, but implied alignment / capability / institutional-rule cases require semantic judgment. Split into deterministic FAIL subchecks (dead actor speaks, named-record absence, forbidden mystery pattern) + judgment-assisted WARN/FAIL subchecks (faction alignment, new capability, institutional rule). |
| F-13 / A-13 | P2 | D13 | Confirmed three drift sites: contract `:60` ("next `-NNNN` id" — padded); turn-cycle `:402` (CHC-0003, CHC-0004 — padded); closeout `:353` ("5 layer values" — CF has 4 statuses). Quick lint. |
| F-14 / A-14 | P2 | D14 | Confirmed clarity issue: seed_nodes is world-record-oriented per packet semantics; story-local records arrive via story_slug + story_bundle_context or get_records(story_slug=...). Document the boundary in CONTEXT-PACKET-CONTRACT.md + cross-reference MACHINE-FACING-LAYER.md `:76`; audit story-pipeline skill pre-flight calls for misuse. |

## Confirms-existing-position (no action)

| Intake | Reason |
|---|---|
| R-01 — dramatic acts / midpoints / climax trackers | Confirms FOUNDATIONS §Story Bundles §No-Act-Structure rejection. The report itself classifies as reject. |
| R-02 — global drama manager / optimal-story planner | Confirms FOUNDATIONS §Story Bundles §No-Global-Drama-Manager rejection. The report itself classifies as reject. |
| R-03 — global rumor graph (now) | Confirms iteration-3 + iteration-4 deferral; existing BEL + SREL + access routes + witness propagation cover the scope. The report itself classifies as reject pending first red-team bundle evidence. |
| R-04 — word-count targets / pacing budgets | Confirms FOUNDATIONS §Prose Length rejection ("length follows beats and stopping point, not quotas"). The report itself classifies as reject. |
| R-05 — auto-merge / reconverge sibling branches | Confirms FOUNDATIONS §Branch-Local Authority + §Story Bundles §4a. Branch contradictions are lawful; merging requires explicit compatibility proof. The report itself classifies as reject. |

## Out-of-report findings

None substantive. Verification was comprehensive (full surface map + targeted file:line inspection on highest-blast-radius items); no pre-existing contract drift beyond the 14 findings was surfaced. Iteration-5 is the cleanest external pass — diagnoses uniformly hold up, only severity calibration needed adjustment in three places (F-06↓, F-07↓, F-11↑).

## Implementation-order file

`specs/IMPLEMENTATION-ORDER.md` is absent. Per the brainstorm skill's Step 5 default rule, no index update — single-spec deliverable doesn't qualify for fresh creation (requires ≥3 specs in a logical bundle with meaningful sequencing). SPEC-31's §Verification provides a phased implementation order within the spec.

## Verification reference

Verification approach: one parallel Explore agent ran a 14-item-by-14-item sweep across the contract, the seven story skills, and the validator/MCP surface. The operator then independently re-verified the highest-blast-radius items (F-01 consumer mapping, F-04 3-way drift, F-08 candidate impurity, F-09 closed-enum-already-exists, F-11 Phase 2e wording) by direct file:line inspection. Key file:line citations consolidated:

- **F-01**: contract `_shared-templates/story-state-contract.md:149-150` (field definitions), `:163` (informational claim), `:181-182` (hash payload exclusion); consumers `branching-story-health-audit/SKILL.md:250-251`, `branching-story-turn-cycle/SKILL.md:162`; writers `branching-story-bootstrap/SKILL.md:313`, `branching-story-turn-cycle/SKILL.md:373`; prose-attach non-mutation `:31`.
- **F-02**: contract `:209` event_kind enum, `:214,:242` selection_source none discipline; no §4.3a sub-section currently exists.
- **F-03**: contract `:266` global_author_pool-only rule; commitment-block-authoring `:175` both-modes-null behavior.
- **F-04**: CONTEXT-PACKET-CONTRACT `:125` null story_bundle_context; MACHINE-FACING-LAYER `:76` populated claim; bootstrap pre-flight `:209` missing story_slug.
- **F-05**: MACHINE-FACING-LAYER `:67` ARCTRACE listed.
- **F-06**: closeout `:140-141`, `:155`, `:167` raw `_source/` reads.
- **F-07**: skill `:113` source-kind table; contract `:236` SF/BEL enum.
- **F-08**: skill `:169` strict-CF claim; `:197-210` candidate template with embedded promotion-only fields; `:121` strip-on-accept convention.
- **F-09**: turn-cycle `:292` closed enum, `:293` free-form note; health-audit `:190` enum repeat.
- **F-10**: turn-cycle `:164-165` latest-CH only; health-audit `:131,:238` latest-CH only.
- **F-11**: health-audit `:206` references `accretion_policy.max_clues / equivalent limit`; FOUNDATIONS Mystery Reserve schema does not define this field.
- **F-12**: prose-attach `:193` overstates deterministic scope.
- **F-13**: contract `:60` padded format; turn-cycle `:402` padded CHC; closeout `:353` "5 layer values".
- **F-14**: contract-level wording in CONTEXT-PACKET-CONTRACT / MACHINE-FACING-LAYER conflates world-seed and story-local retrieval scopes.

Cross-spec context: SPEC-28 (D1–D7, merged 2026-05-13) hardened input legality / belief predicate / promotion source mapping / closeout supersession; SPEC-30 (D1–D10, merged 2026-05-15) hardened PG-1 input legality / branch_path doc / belief predicate split / promotion source widening (STSTAT/SREL) / mystery evidence_records / commitment effects-or-likely-effects / choice-set non-collapse / motivation grounding / selection rationale / structured SREL direction. SPEC-31 (this spec) is the third iteration of contract hardening, focused on lifecycle / retrieval / shape consistency.
