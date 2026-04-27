# SPEC-06 Phase 2 Static-Acceptance Audit — 2026-04-26

**Ticket**: `tickets/SPEC06SKIREWPAT-009.md`
**Audit type**: static-and-CLI capstone over the rewrites composed by SPEC06SKIREWPAT-001..008
**Auditor**: Claude Code (read-only audit; no production code introduced)
**World under audit**: `worlds/animalia/` (current `_source/` and hybrid-file state)

This report records the verdict on the surviving SPEC-06 §Verification surface — structural patterns inside each rewritten `SKILL.md`, validator pass on the post-rewrite animalia state, `record_schema_compliance` end-to-end, and the `tools/` package test suites covering Hook 3 enforcement, engine atomicity, validator coverage, and MCP retrieval.

## §Audit scope

**Skills audited (8)**:
- `.claude/skills/canon-addition/SKILL.md`
- `.claude/skills/create-base-world/SKILL.md`
- `.claude/skills/character-generation/SKILL.md`
- `.claude/skills/diegetic-artifact-generation/SKILL.md`
- `.claude/skills/propose-new-canon-facts/SKILL.md`
- `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md`
- `.claude/skills/propose-new-characters/SKILL.md`
- `.claude/skills/continuity-audit/SKILL.md`

**Patterns checked (4)**:
1. **Engine-routed writes for canon paths** — skills that write to `_source/` reference `mcp__worldloom__submit_patch_plan` or one of the engine op names; skills that write hybrid files reference the corresponding hybrid-file op or the spec's documented direct-Edit-on-hybrid pattern. Pure-proposal / audit-class skills are flagged explicitly.
2. **No retired-monolith references** — zero prescriptive matches in `SKILL.md` and `references/` siblings (one level) for the eleven retired filenames: `CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `GEOGRAPHY.md`, `ECONOMY_AND_RESOURCES.md`, `PEOPLES_AND_SPECIES.md`. Quoted historical evidence and explicit deprecation notices are permitted.
3. **HARD-GATE block intact** — every canon-mutating or content-generating skill contains a `<HARD-GATE>` block at the top of `SKILL.md`.
4. **Mystery Reserve firewall preserved** — skills that handle proposals or generate content reference the firewall by name, M-record citation, or Rule 7 invocation.

## §Static audit table

| Skill | P1: engine-routed writes | P2: no retired-monolith refs | P3: HARD-GATE intact | P4: Mystery Reserve firewall |
|---|---|---|---|---|
| canon-addition | **PASS** — `submit_patch_plan` + 9 record/extension ops cited (SKILL.md:3, 19, 54, 59, 61–64). | **PASS** — zero matches in SKILL.md or `references/`. | **PASS** — `<HARD-GATE>` at SKILL.md:18; first body line cites `mcp__worldloom__submit_patch_plan` gating with PA-NNNN allocation, Phase 11 verdict, Phase 14a validation, and approval_token. | **PASS** — "Mystery Reserve firewall extension (target `M-NNNN.yaml`)" SKILL.md:64; "Mystery Reserve preserved (Rule 7) — mechanical layer ... judgment layer: forbidden-answer overlap check" SKILL.md:104. |
| create-base-world | **PASS** — `submit_patch_plan` + `create_cf_record`/`create_ch_record`/`create_inv_record`/`create_m_record`/`create_oq_record`/`create_ent_record`/`create_sec_record` cited (SKILL.md:3, 16, 19, 61, 129, 139, 141). `WORLD_KERNEL.md` + `ONTOLOGY.md` direct-write at world root explicitly noted (Hook 3 carve-out per SPEC-05 Part B). | **PASS** — zero matches; no `references/` directory. | **PASS** — `<HARD-GATE>` at SKILL.md:18; gates `submit_patch_plan` and `WORLD_KERNEL.md`/`ONTOLOGY.md` writes on absent target dir + Phase 9 self-validation + approval_token. | **PASS** — Phase 5 "Install Mystery Reserve seeds (active / passive / forbidden — at least one of each)" SKILL.md:43; "Rule 7 (Preserve Mystery Deliberately) — mystery must be bounded, not mushy" SKILL.md:93. |
| character-generation | **PASS** — `submit_patch_plan` carrying `append_character_record` (SKILL.md:16, 78–79, 138, 151–152); `Direct Write to <char-slug>.md is forbidden` explicitly. | **PASS** — zero matches in SKILL.md or `references/`. | **PASS** — `<HARD-GATE>` at SKILL.md:18; gates `submit_patch_plan` and `Edit characters/INDEX.md` on Phase 7 Canon Safety Check + Phase 8 Validation + approval_token. | **PASS** — "Mystery Reserve firewall prevents forbidden-answer leakage" SKILL.md:16; "7b: Mystery Reserve firewall (vs M-N records; explicit list)" SKILL.md:64. |
| diegetic-artifact-generation | **PASS** — `submit_patch_plan` carrying `append_diegetic_artifact_record` (SKILL.md:19, 22, 95–96, 159, 172–173); direct Write to `<da-slug>.md` explicitly forbidden. | **PASS** — zero matches in SKILL.md or `references/`. | **PASS** — `<HARD-GATE>` at SKILL.md:21; gates write on Phase 7 Canon Safety Check (incl. four diegetic-safety rules + World-Truth/Narrator-Truth) + Phase 8 + approval_token. | **PASS** — "Mystery Reserve firewall and a diegetic-to-world firewall prevent silent canon creation and forbidden-answer leakage" SKILL.md:19; "7b: Mystery Reserve firewall (vs M records; explicit list)" SKILL.md:75. |
| propose-new-canon-facts | **PASS** *(proposal-class)* — explicit direct-Edit-on-hybrid pattern with Hook 3 allowlist citation: "surviving cards are written direct-Edit on hybrid files (proposals are NOT canon — Hook 3 hybrid-file allowlist permits the writes)" SKILL.md:16; "direct-Edit cards + batch manifest + INDEX.md (hybrid-file allowlist)" SKILL.md:54–55. | **PASS** — zero matches in SKILL.md or `references/`. | **PASS** — `<HARD-GATE>` at SKILL.md:18; gates every file write on Phase 7 Canon Safety Check + Phase 8 + Phase 9 deliverable approval. | **PASS** — "7b Per-card Mystery Reserve Firewall (every M record)" SKILL.md:44; "Phase 7b + Phase 7d are the two Rule 7 enforcement points" SKILL.md:124; "complete Mystery Reserve firewall audit" SKILL.md:132. |
| canon-facts-from-diegetic-artifacts | **PASS** *(proposal-class)* — explicit direct-Edit-on-hybrid pattern with Hook 3 allowlist citation: SKILL.md:19; "direct-Edit cards + batch manifest + INDEX.md (hybrid-file allowlist)" SKILL.md:65–66. | **PASS** — initial audit found five prescriptive matches in `references/{phase-6-canon-safety-check.md, phases-2-5-classify-score-reject.md}` to retired monolithic files (`INVARIANTS.md`, `MYSTERY_RESERVE.md`, `GEOGRAPHY.md`, `INSTITUTIONS.md`, `PEOPLES_AND_SPECIES.md`, `CANON_LEDGER.md`). All five resolved 2026-04-26 by translating each to atomic-record retrieval calls (`search_nodes(node_type='invariant' \| 'mystery_record' \| 'canon_fact' \| 'section')` then `get_record`); re-grep returns zero matches. See §Audit Findings Requiring Follow-Up F1 (resolved). | **PASS** — `<HARD-GATE>` at SKILL.md:21; gates every file write on Phase 6 Canon Safety Check (incl. 6d Diegetic-to-World laundering sub-tests) + Phase 7 + Phase 8 deliverable approval. | **PASS** — "6b Mystery Reserve firewall" + "6d Diegetic-to-World laundering" SKILL.md:22; "complete Mystery Reserve firewall audit, an invariant-conformance trace, and a Diegetic-to-World laundering audit" SKILL.md:130. |
| propose-new-characters | **PASS** *(proposal-class)* — explicit direct-Edit-on-hybrid pattern with Hook 3 allowlist citation: SKILL.md:16; "direct-Edit cards + batch manifest + INDEX.md (hybrid-file allowlist)" SKILL.md:62–63. | **PASS** — single match in `references/preflight-and-prerequisites.md:80` is an explicit deprecation notice ("`MAGIC_OR_TECH_SYSTEMS.md` is no longer a primary-authored file post-SPEC-13 — its content lives as `SEC-MTS-*` atomic records") that redirects the agent to `search_nodes(node_type='section', filters={file_class: 'magic-or-tech-systems'})` then `get_record`. Permitted per Pattern 2's "quoted historical evidence" / deprecation-notice carve-out — the reference disclaims the file rather than prescribing a read. | **PASS** — `<HARD-GATE>` at SKILL.md:18; gates every file write on Phase 10 Canon Safety Check + Phase 15 + Phase 16 deliverable approval. | **PASS** — "10b Per-seed Mystery Reserve Firewall (every M record consulted; expand via `search_nodes(node_type='mystery_record')` if a seed implicates an M not in the packet)" SKILL.md:94; "Phase 8 (first Rule-7 gate), Phase 10b (formal firewall), and Phase 10d (joint-closure) are the three Rule 7 enforcement points" SKILL.md:125. |
| continuity-audit | **PASS** *(audit-class)* — explicit direct-Edit-on-hybrid pattern with Hook 3 allowlist citation: "Direct-`Edit` write — Hook 3 allows `audits/` because the file lives outside `_source/`" SKILL.md:76; "Direct-Edit allowed under `audits/`. Hook 3 only blocks `_source/*.yaml` writes; audit reports, retcon-proposal cards, and INDEX.md are direct-`Edit`. No engine op required for these files" SKILL.md:155. | **PASS** — zero matches in SKILL.md or `references/`. | **PASS** — `<HARD-GATE>` at SKILL.md:18; gates every file write on Phase 9 self-check + Phase 12 validation + Phase 13 deliverable approval. | **PASS** — "mystery corruption" as one of the eight audit categories (SKILL.md:16); "Rule 7 (Preserve Mystery Deliberately) — Phase 4h + Phase 4i" SKILL.md:148; `mystery_reserve_interactions` and `mystery_resolution_safety` vocabulary lookup at Phase 1 (SKILL.md:92, 98). |

**Summary**: 32 / 32 cells PASS after the 2026-04-26 CFDA references refresh (see §Audit Findings Requiring Follow-Up F1). At initial audit time the table was 31 / 32 with one FAIL on canon-facts-from-diegetic-artifacts Pattern 2; the underlying prose was rewritten the same day.

## §Validator gate

Command run from repo root:
```
node tools/validators/dist/src/cli/world-validate.js animalia --json
```

Output:
```json
{
  "run_mode": "full-world",
  "world_slug": "animalia",
  "started_at": "2026-04-26T16:31:04.055Z",
  "finished_at": "2026-04-26T16:31:04.380Z",
  "verdicts": [],
  "summary": {
    "fail_count": 0,
    "warn_count": 0,
    "info_count": 0,
    "validators_run": [
      "yaml_parse_integrity",
      "id_uniqueness",
      "cross_file_reference",
      "record_schema_compliance",
      "touched_by_cf_completeness",
      "modification_history_retrofit",
      "rule1_no_floating_facts",
      "rule2_no_pure_cosmetics",
      "rule4_no_globalization_by_accident",
      "rule6_no_silent_retcons",
      "rule7_mystery_reserve_preservation"
    ],
    "validators_skipped": [
      {
        "name": "rule5_no_consequence_evasion",
        "reason": "pre-apply-only"
      }
    ]
  }
}
```

**Verdict**: zero findings. Subsumes `record_schema_compliance` (the SPEC-14 acceptance criterion), `id_uniqueness`, `cross_file_reference`, `touched_by_cf_completeness`, `modification_history_retrofit`, `yaml_parse_integrity`, plus Rules 1, 2, 4, 6, 7. Rule 5 is pre-apply-only and is exercised by the patch-engine and validators test suites under §Test-suite gate. **PASS** — animalia's post-rewrite atomic-source state is validator-clean.

## §Test-suite gate

Each `tools/<package>/` `npm test` was run; pass counts captured below.

| Package | Tests | Pass | Fail |
|---|---|---|---|
| `tools/world-mcp` | 137 | 137 | 0 |
| `tools/patch-engine` | 40 | 40 | 0 |
| `tools/validators` | 54 | 54 | 0 |
| `tools/hooks` | 17 | 17 | 0 |
| `tools/world-index` | 55 | 55 | 0 |
| **Total** | **303** | **303** | **0** |

**Verdict**: full pass across all five packages. Hook 3 enforcement (the `tools/hooks` suite includes `hook5 only surfaces the four spec-listed validators`), engine atomicity, validator coverage, and MCP retrieval all green. **PASS**.

## §Audit Findings Requiring Follow-Up

### F1. canon-facts-from-diegetic-artifacts `references/` retain prescriptive references to retired monolithic files — RESOLVED 2026-04-26

**What**: Two reference files inside `.claude/skills/canon-facts-from-diegetic-artifacts/references/` contained prescriptive instructions to consult `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `GEOGRAPHY.md`, `INSTITUTIONS.md`, `PEOPLES_AND_SPECIES.md`, and `CANON_LEDGER.md` — all eleven of which are retired monolithic files post-SPEC-13.

**Where (initial audit)**:
- `references/phase-6-canon-safety-check.md:11` — "Test against every invariant in INVARIANTS.md."
- `references/phase-6-canon-safety-check.md:17` — "Iterate every entry in MYSTERY_RESERVE.md ..."
- `references/phase-6-canon-safety-check.md:29` — "cross-referenced in GEOGRAPHY.md or INSTITUTIONS.md ..."
- `references/phase-6-canon-safety-check.md:53` — "Consult PEOPLES_AND_SPECIES.md ... GEOGRAPHY.md ... INSTITUTIONS.md ..."
- `references/phases-2-5-classify-score-reject.md:7` — "cross-referencing against CANON_LEDGER.md + INVARIANTS.md + domain files."

**Provenance**: both files were last touched in commit `7face4b` ("Did many things"), which predates SPEC06SKIREWPAT-006 (commit `865e8f4`). SPEC06SKIREWPAT-006 §Files to Touch listed `.claude/skills/canon-facts-from-diegetic-artifacts/references/` as `(modify — refresh retrieval-mechanism files)`, but the implementing commit only refreshed `preflight-and-prerequisites.md`. The two affected files retained pre-rewrite prose at initial audit time.

**Resolution (2026-04-26)**: each of the five prescriptive references was translated in-place into the atomic-record retrieval idioms already used by SKILL.md and `preflight-and-prerequisites.md`:
- 6a invariant iteration → `search_nodes(node_type='invariant')` + `get_record(<INV-id>)`.
- 6b Mystery Reserve iteration → `search_nodes(node_type='mystery_record')` + `get_record(<M-id>)`.
- 6c distribution discipline cross-reference → `SEC-GEO-*` / `SEC-INS-*` via `search_nodes(node_type='section', filters={file_class: 'geography' | 'institutions'})` + `get_record`; `hard_canon` `why_not_universal` citations explicitly accept `SEC-*` atomic-record prose.
- 6d.1 evidence-breadth cross-reference → CF records via `search_nodes(node_type='canon_fact', filters={domain: ...})` + `get_record`; `SEC-*` atomic-record prose via `search_nodes(node_type='section', filters={file_class: ...})` + `get_record`.
- 6d.2 epistemic-horizon consultation → `SEC-PAS-*` / `SEC-GEO-*` / `SEC-INS-*` via `search_nodes(node_type='section', filters={file_class: ...})` + `get_record` selectively.
- Phase 2 classification grounding → CF + INV + `SEC-*` retrieval via the same atomic-record idioms.

Re-grep `grep -nE "CANON_LEDGER\.md|INVARIANTS\.md|MYSTERY_RESERVE\.md|OPEN_QUESTIONS\.md|TIMELINE\.md|EVERYDAY_LIFE\.md|INSTITUTIONS\.md|MAGIC_OR_TECH_SYSTEMS\.md|GEOGRAPHY\.md|ECONOMY_AND_RESOURCES\.md|PEOPLES_AND_SPECIES\.md"` against `canon-facts-from-diegetic-artifacts/references/` returns zero matches. The static audit table P2 cell for canon-facts-from-diegetic-artifacts is now PASS.

## §Cross-Spec Follow-Ups

Inherited from SPEC06SKIREWPAT-001..008 §Out of Scope:

### CS1. SPEC-07 Part B: drop `phase-15a-checkpoint-grep-reference.md` reference — RESOLVED 2026-04-26 (line 160); KEEP AS-IS (line 225)

**Source**: SPEC06SKIREWPAT-001 §Out of Scope — "SPEC-07 Part B coordination on the deleted `phase-15a-checkpoint-grep-reference.md` (cross-spec follow-up; SPEC-07 must be re-reassessed to drop the reference)".

**Resolution (line 160)**: the parenthetical pointing at the deleted file path inside the prescriptive Markdown block (lines 152–161 of `specs/SPEC-07-docs-updates.md`) was rewritten on 2026-04-26 to reference "earlier `canon-addition` reference material" without naming the dead path. The surrounding 3-tier-engine-ordering prescription is left intact pending the broader Part B execution discussed under §Open Sub-Item below.

**Decision (line 225)**: `specs/SPEC-07-docs-updates.md:225` lists `phase-15a-checkpoint grep` among the "deprecated patterns" to surface in doc-consistency grep sweeps. After re-reading: the grep target there is the *pattern name*, not the file path — it's a stale-prose flag, not a pointer to a live file. The line still functions correctly post-deletion (any prose that talks about the pattern should be replaced with a forward pointer to SPEC-03 engine atomicity). Keeping line 225 as-is is the right call; the audit's initial framing of it as "a grep for the deleted file" was imprecise. No edit.

**Open sub-item (separate from CS1) — RESOLVED 2026-04-26**: SPEC-07 Part B's prescriptive Markdown block at lines 152–161 still described a 3-tier engine write order whose third tier named `CANON_LEDGER.md`. Post-SPEC-13, canon facts are atomic `_source/canon/CF-NNNN.yaml` records and `CANON_LEDGER.md` no longer exists. Additionally, `docs/HARD-GATE-DISCIPLINE.md:72` still described the old `CANON_LEDGER.md`-append-last recovery model — Part B's "§Why write order matters rewrite for 3-tier engine ordering" had not been executed against the live doc. **Resolution**: SPEC-07 Part B was implemented and SPEC-07 archived 2026-04-26 at `archive/specs/SPEC-07-docs-updates.md`. `docs/HARD-GATE-DISCIPLINE.md` §Why write order matters now describes the post-SPEC-13 3-tier engine ordering (create-all → update-all → adjudication) verbatim against `tools/patch-engine/src/commit/order.ts`, plus two-phase commit semantics and the per-world write lock, with explicit deletion of the phase-15a inter-step grep checkpoints; §Execution pattern step 6 routes through `mcp__worldloom__submit_patch_plan(plan, approval_token)`. `CLAUDE.md` §Non-Negotiables HARD-GATE bullet was refined to acknowledge Hook 3 + approval-token structural enforcement (with prose retained for absent-mechanism cases); the `_source/` engine-only-surfaces bullet was refined to distinguish Hook-3-blocked `_source/<subdir>/*.yaml` from prescriptively-engine-routed hybrid artifacts. SPEC-07 archived spec preserves the original draft block under §Part B for traceability; the as-shipped doc is the current truth.

## §Retired verification gates pointer

The following SPEC-06 §Verification gates were retired on 2026-04-26 alongside this ticket and are intentionally not exercised by this capstone:

- **Token reduction ≥80%** — retired as a runtime verification gate. Architectural gains from atomic-record retrieval still motivate the rewrites but are not quantified.
- **Reasoning preservation** — historical-adjudication re-runs retired. Mitigation survives structurally as judgment-reference-file preservation.
- **Role split (Localizer–Editor–Auditor) instrumented dispatch** — retired as a measured gate. Pattern remains as implementation guidance in SPEC-06 §Agent role split.

These retirements are recorded in `archive/specs/SPEC-06-skill-rewrite-patterns.md` §Retired verification gates (and the corresponding Phase 2 token-reduction pointers in `archive/specs/SPEC-08-migration-and-phasing.md` and `archive/specs/IMPLEMENTATION-ORDER-2026-04-27.md`). This audit report intentionally does not re-litigate them; consult that section if the question of "why isn't the audit measuring tokens?" comes up later.

## §Capstone verdict

**SPEC-06 Phase 2 static-acceptance gate**: PASS.

- §Validator gate: zero findings on animalia.
- §Test-suite gate: 303 / 303 across 5 packages.
- §Static audit table: 32 / 32 cells PASS after the 2026-04-26 CFDA references refresh (initial audit was 31 / 32; F1 below records the resolution).
- §Cross-Spec Follow-Ups: CS1 line-160 dead-file reference resolved; CS1 line 225 kept as a deprecated-pattern flag (correct as-is). The CS1 open sub-item (broader SPEC-07 Part B execution gap on the live `docs/HARD-GATE-DISCIPLINE.md` 3-tier rewrite) was resolved 2026-04-26 by landing SPEC-07 Part B and archiving the spec.

The surviving SPEC-06 §Verification surface — structural patterns inside each rewritten `SKILL.md`, validator pass on the post-rewrite animalia state, `record_schema_compliance` end-to-end, Hook 3 enforcement (covered by `tools/hooks`) — is satisfied. The retired runtime bullets are recorded under §Retired verification gates pointer so the 2026-04-26 scope narrowing remains auditable.
