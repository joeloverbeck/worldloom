# Story-state-contract property audit — triage (2026-05-14)

## Source

User-initiated brainstorm investigating drift in `worlds/erotica-world/stories/red-bunny/_source/`. The triggering observation was that CHC records emitted at PG-1 (by `branching-story-bootstrap`) carry a different field set than CHC records emitted at PG-2 (by `branching-story-turn-cycle`), despite both skills citing `.claude/skills/_shared-templates/story-state-contract.md` as the shared contract. Investigation expanded to every `_source/` subdirectory and traced field provenance across all 16 record classes.

## Three root causes found

1. **Contract gap**: `story-state-contract.md` §4 defines schemas for only 4 of the 16 classes inventoried in §3 (`BEL`, `PG`, `SE`, `SLT`). The other 12 (`STENT`, `STINT`, `SF`, `OBL`, `CNSQ`, `THR`, `SREL`, `STLOC`, `STOBJ`, `DA`, `BR`, `CHC`) have no canonical shape, so skills invent it.
2. **Validator gap**: 13 of 16 JSON schemas under `tools/validators/src/schemas/` require only `{id, story_id}` with `additionalProperties: true`. Only `story-belief`, `story-page` (partially), and `story-storylet` enforce structural shape.
3. **Cross-layer mismatch**: Contract §4.2 PG schema and `story-page.schema.json` disagree about prose-path fields. Contract uses `rendered_prose.{path, receipt_path}` (consumed by nothing — dead writes); validator requires `prose_plan_path` (top-level). Both SKILL.md files emit both forms, documenting it as "legacy until reconciliation."

## Bootstrap-specific authoring drift

Independent of the structural causes, the actual CHC-1..4 records in red-bunny carry 13+ legacy fields (`record_version`, `choice_contract`, `choice_worthiness`, `commitment_class/detail/family`, `continuation_capacity`, `strategy_cluster`, `likely_effects`, `emitted_at_branch`, `emitted_by_page`) that bootstrap's own SKILL.md Phase 8 does NOT prescribe and that line 358 explicitly forbids (`record_version`). These are residual authoring habit leaking through from the pre-rebuild era. The skill spec is right; the wild records are the bug.

## Accepted (3 deliverables; SCAUD-002 superseded post-triage — see below)

- **`specs/SPEC-24-story-state-contract-property-audit.md`** — Umbrella spec; full per-class audit verdict tables for all 16 record classes; R3 PG reconciliation; amended §4 YAML schemas; FOUNDATIONS alignment; verification. Substantial. — *Rationale: User explicitly asked for "every structural file type" to be triaged; verdicts must live in spec authority to prevent recurrence.*
- **`archive/tickets/SCAUD-001-apply-audit-verdicts-to-story-state-contract.md`** — Applies the spec's amended §4 to `story-state-contract.md`; updates all 7 affected SKILL.md files; resolves §4 numbering. — *Rationale: Mechanical application of spec verdicts to canonical contract; required before any new bundle authors against the amended schema.*
- **`tickets/SCAUD-002-cleanup-red-bunny-drifted-records.md`** — **SUPERSEDED post-triage (2026-05-14); ticket file deleted** — see §Post-triage revision below. Was: a single `audit_repair` SE superseding CHC-1..8 and OBL-1 with conforming replacements via the patch engine, plus a new audit_repair PG snapshot and bundle INDEX.md update. Red-bunny carried only 2 pages, so it is removed and re-bootstrapped from zero rather than remediated in place.
- **`tickets/SCAUD-003-tighten-json-validator-schemas.md`** — Promotes amended §4 field sets into 13 minimal JSON schemas; re-audits 3 strict schemas; removes `introduced_at_page` fallback from `recursive-reference-closure.ts`; updates validator tests; adds contract-schema roundtrip test. Deferred until SCAUD-001 lands (done); the former SCAUD-002 dependency was removed by the post-triage revision, so SCAUD-003 is now unblocked. — *Rationale: User selected ticket-only-deferred (Q4 recommended); validator alignment is mechanism following the canon, not coupled to it.*

## Dismissed

- **Methodology-only spec (defer verdicts to implementation)** — (pragmatic — verdict-drift between methodology and implementation is the exact pathology motivating this work; chosen verdicts-in-spec instead).
- **Separate `docs/triage/` doc carrying verdicts; spec as narrative only** — (structural — the audit decisions ARE the spec content, not adjacent triage; this triage file carries only the deliverable index).
- **Tightening JSON schemas in SCAUD-001 alongside contract** — (pragmatic — couples two distinct review surfaces; deferred to SCAUD-003 per user Q4 selection).
- **Preserving dropped fields as backward-compat tolerance** — (structural — Hook 3 already forbids in-place mutation, so the alternative to supersession-cleanup is doing nothing; tolerance encourages future drift).
- **Cleaning other red-bunny classes beyond CHC and OBL** — (structural — drift in SF/BEL/STENT/STINT/STLOC/STOBJ/SREL/CNSQ/THR is within-skill consistent and non-blocking; SCAUD-002 keeps scope tight).
- **Migrating other user-bundles** — (per CLAUDE.md `worlds/` is per-user / gitignored; the user's only currently-affected bundle is red-bunny).

## Follow-ups flagged but not actioned

- **PG state_hash continuity across R3 reconciliation** — SPEC-24 §Risks recommends tolerance + documentation note (not backfill). SCAUD-001 implementer confirms during execution.
- **Action-family enum bug**: `attempt` listed as an action_family in `story-choice.schema.json` but is structurally an SE `outcome_route`. Removed in SCAUD-001 (contract) and SCAUD-003 (validator).
- **`commitment_class` / `commitment_family` MCP vocabulary surface** — currently exposed via `get-canonical-vocabulary.ts:44,48` but DROPPED from CHC schema; removed from vocabulary surface in SCAUD-003 §20.
- **`DA` (story-local diegetic artifact) class has no wild evidence** — SPEC-24 §4.5.10 derived from skill prescription only; first author empirically validates.

## Post-triage revision (2026-05-14)

A follow-up brainstorm the same day superseded **SCAUD-002**. The remediation ticket would have generated a full `audit_repair` turn (SE + CHC-9..16 + OBL-2 + new PG snapshot + page plan + INDEX updates) just to launder a bundle with only 2 pages. Instead, red-bunny is **removed and re-bootstrapped from zero** against the amended contract — a local operation on a gitignored, per-user bundle. Consequences applied to the deliverable set:

- `tickets/SCAUD-002-...md` deleted (obsolete; no records left to clean).
- `tickets/SCAUD-003-...md` reconciled: the SCAUD-002 dependency is dropped, so SCAUD-003 is unblocked once SCAUD-001 lands (done); red-bunny-specific verification/acceptance items are replaced by synthetic-fixture checks.
- `specs/SPEC-24-...md` reconciled: status/companion lines, Deliverable 2, Verification item 3, Risks, the FOUNDATIONS §Story Bundles §3 row, and the per-class Migration notes' active SCAUD-002 claims updated; descriptive audit evidence preserved.
- **Sequencing**: SCAUD-003 should land *before* the user re-bootstraps red-bunny, so the fresh bundle is born under the tightened (`additionalProperties: false`) validators and cannot re-drift.

## Cross-references

- SPEC-24 §Risks contains the full open-questions list for SCAUD-001 implementer.
- SCAUD-001 §Assumption Reassessment §7 lists every property name that must return zero hits from the post-amendment skill-spec grep sweep.
