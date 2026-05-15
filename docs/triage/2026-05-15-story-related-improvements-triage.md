# Triage — Story-Related Improvements (Third Iteration)

**Date**: 2026-05-15
**Source**: `reports/story-related-improvements-third-iteration.md` — external review (ChatGPT-Pro) of the branching-story system, fed `docs/FOUNDATIONS.md` + the seven story-pipeline skills + `.claude/skills/_shared-templates/`, with no access to `tools/`, `docs/HARD-GATE-DISCIPLINE.md`, or `docs/CONTEXT-PACKET-CONTRACT.md`. 16 evaluated items (10 P0, 5 P1, 1 P2).
**Outcome**: 7 accepted → `archive/specs/SPEC-28-story-contract-hardening.md`; 9 dismissed; 3 follow-ups noted.
**Verification**: every intake claim was re-checked against the working tree (two rounds, ~9 agent passes + exact-match search). The report's *diagnoses* are sound; its *categorization* is not — it re-proposed a concern SPEC-27 shipped the same day, miscategorized two feature-additions as P0 bugs, and built a "purge" task on a misread greenfield rebuild.

## Accepted → SPEC-28 (D1–D7)

| Intake | Deliverable | One-line rationale |
|---|---|---|
| P0.1 | D1 | Real contradiction: arg prose says hash drift "fails the receipt", Phase 2 says verdict is "exclusively driven by the 7 deterministic checks". Make hash drift verdict-driving. |
| P0.2 | D2 | `SLT.saliency.cooldown_pages` is a dead field — unenforceable because nothing records which `SLT` fired on which page. `SE.commitment` (trimmed: `selected_slt_id` / `selection_source` / `alias_bindings`) makes it enforceable and serves the §6b firewall audit + replay. |
| P0.3 | D3 | `BEL.basis` records only `source_event`; SPEC-27 D7's §6b observer firewall is not auditable post-hoc. `access_route` / `access_records` give health-audit Phase 2d a recorded trail. Reverses an explicit §5b note — user-confirmed include. |
| P0.6 | D4 | Confirmed: turn-cycle HARD-GATE says "6", Phase 9 lists 7; health-audit says "Seven sub-phases", lists 8 (2a–2h); health-audit cites prose receipt §4.5 vs the contract's §4.6. Two of three are SPEC-27 D6's incomplete count cascade. |
| P0.7 | D5 | `direct_user_approval` is inert repo-wide and already kept `false`, but template comments wrongly say "set true at Phase 7". `derived_from: [null]` for novel candidates is a null-in-ID-list hazard → `[]` (matches SPEC-24's `SF` precedent). |
| P0.8 | D6 | Real contradiction: closeout SKILL.md line 177 ("supersede only when a schema field changes") vs line 221 ("every source record gets a supersession … abort"). Resolve with an explicit `source_record_dispositions:` map. |
| P0.9 | D7 | `CONTEXT-PACKET-CONTRACT.md` + `story-bundle-context.ts` read STORY_KERNEL.md frontmatter (`mysteries_in_play` / `cast_bind_list` / `invariants_acknowledged`); bootstrap writes only markdown sections — every story-pipeline context packet silently returns empty. Absorbs the one genuine sliver of P0.10. |

## Dismissed

| Intake | Reason |
|---|---|
| P0.4 — diegetic time on `PG.state_snapshot` | Feature addition miscategorized as a contract bug; `temporal_state` + new predicates would violate §5b on day one (no consumer); no production stories prove page-count fails. *(structural)* |
| P0.5 — structured `validation_trace` with `authority_refs` | Redundant with SPEC-27 D4 (shipped 2026-05-15), which generalized authority-cited rationale discipline via `HARD-GATE-DISCIPLINE.md`. No validator consumes a structured trace. The report couldn't see D4 — that file wasn't in its input set. *(structural)* |
| P0.10 — purge legacy ARC vocabulary | Wrong as framed: exact-match search confirms live skills + `story-state-contract.md` are already clean (greenfield rebuild). Tools-layer survivors are partly deliberate (SCAUD-003). Genuine sliver folds into D7. *(structural)* |
| P1.1 — branch-viability forecasting | SPEC-27 D5 already shipped the core (Choice Consequence Integrity); P1.1 is an enhancement to a diagnostic skill, not a contract gap. *(structural)* |
| P1.2 — character-initiative pressure checks | Enhancement (new health-audit finding) consuming existing structure; no new load-bearing property. *(structural)* |
| P1.3 — social-practice storylet batches | "No new schema needed" — an authoring convention, not load-bearing structure. *(structural)* |
| P1.4 — temporal continuity findings | Moot — depends on the dismissed P0.4. *(structural)* |
| P1.5 — choice-explanation inspection | "A tool/query, not a schema field" — tooling enhancement, not load-bearing. *(structural)* |
| P2 — hostile test-fixture suite | QA investment, not contract hardening; several assertions depend on D2 landing first. Recommended as a follow-up spec — see below. *(structural)* |

## Follow-ups identified (not actioned)

- **Tools-layer arc-vocabulary residue** (out-of-report finding). `tools/world-mcp/`, `tools/validators/`, and `docs/MACHINE-FACING-LAYER.md` still carry SPEC-22-era arc machinery (`arc_trace_record` retrieval, `get_canonical_vocabulary` serving `arc_archetype` / `narrative_point`). The `commitment_family` / `commitment_class` part is confirmed-deliberate (SCAUD-003); the `arc_trace_record` part is ambiguous (create op is validator-rejected, read surface lingers). No arc records exist anywhere, so it is inert. Worth a `tools/`-scoped investigation to confirm deliberate-vs-dead — distinct from SPEC-28's skill+contract scope.
- **`source_basis.direct_user_approval` is a field-without-a-consumer** (out-of-report finding). SPEC-28 D5 fixes the misleading story-skill comments, but the field is inert across the entire codebase (FOUNDATIONS doesn't define it; `canon-addition` / validators / patch-engine never read it). Whether it should exist in the world-canon CF schema is a `docs/FOUNDATIONS.md` / `canon-addition` scope question, completed in `archive/tickets/FOUNDATIONS-005.md`.
  - 2026-05-15 update: FOUNDATIONS-005 reconciled this as accepted-CF provenance. Persisted Canon Fact Records require `source_basis.direct_user_approval: true` through `record_schema_compliance`; pre-acceptance proposal packages may still carry `false` until `canon-addition` accepts them through its own HARD-GATE.
- **P2 hostile test-fixture suite** as a dedicated follow-up spec, sequenced after SPEC-28 (its assertions depend on D2's `SE.commitment` and the D1/D4/D6 contract fixes being in place).
