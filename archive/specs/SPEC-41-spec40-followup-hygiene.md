<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-41 — SPEC-40 Follow-up Hygiene Cluster

**Status**: COMPLETED
**Date**: 2026-05-17

## Problem Statement

Historical archived spec `archive/specs/SPEC-40-story-pipeline-eleventh-iteration-fixes.md` archived with four cross-spec follow-ups documented in its §Risks & Open Questions section: (1) validator-hardening-III spec for full F-02 indirect-cue mechanization; (2) repo-hygiene CI lints (`fixture_unpadded_id_lint_current_only` + `current_docs_do_not_cite_archive_as_authority`); (3) `story_local_seed_warning_for_pg_bel_se_da` follow-up test; (4) hook-deployment-currency parity check extending SPEC-40 D4's MCP-server pattern to `tools/hooks/dist/`. Reassessment against current main (post-merge of SPEC-40) confirms three of the four still warrant action and surfaces scope refinements for one. This spec batches those three accept-with-modification verdicts into a single follow-up hygiene cluster, with each deliverable executed by a dedicated ticket in the same brainstorm session.

Reassessment evidence (verified via parallel greps against current main at the SPEC-40 merge commit):

- **F1 validator-hardening-III**: `tools/validators/src/structural/expected-witness-coverage.ts` lines 17 and 164 confirm only the `INDIRECT_ACCESS_ROUTES` set + `indirectPropagationVerdicts` DA-anchored cue from SPEC-37 D2 exist. No multi-location supersession, STENT-death-with-SREL, STOBJ-as-independent-route, or environmental-change-via-STLOC-modification cues have landed. The structural-distinct deferral reason from SPEC-40 holds — these cues remain scope-distinct from SPEC-40's narrow scope and the eleventh-iteration audit itself characterized them as "remain authorial discipline and are not yet enforced." Recommend keeping deferred (`confirms-existing-position` verdict); no SPEC-41 deliverable.
- **F2.a fixture_unpadded_id_lint_current_only**: No CI script enforces fixture-ID conformance. `.github/workflows/` has 6 CI configs (`ci-hooks.yml`, `ci-patch-engine.yml`, `ci-validators.yml`, `ci-world-index.yml`, `ci-world-mcp.yml`, `codeql.yml`) but none lints fixture IDs against the unpadded-natural-integer convention. SPEC-35 D8 and SPEC-36 D3 both addressed fixture rot as recurring drift; a deterministic CI lint would prevent recurrence. Accept → D1.
- **F2.b current_docs_do_not_cite_archive_as_authority**: No CI script enforces this. SPEC-35 D9 fixed FOUNDATIONS.md citing archived specs; SPEC-36 D4 fixed `tools/validators/README.md` doing the same. A grep-based CI lint with a whitelist for legitimate historical citations (`**Supersedes**: archive/specs/SPEC-XX`, archive-as-context references) would prevent recurrence. Accept → D2.
- **F3 story_local_seed_warning_for_pg_bel_se_da**: Intake evidence showed `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` already had dedicated tests for PG/BEL/SE seed-types via the same pattern, plus generic story-local seed coverage. Only the DA seed-type test was missing from the audit's `PG/BEL/SE/DA` enumeration. Implementation later found the DA prefix was also absent from the live story-local seed filter, so D3 landed the minimal same-seam filter fix plus the test. Accept-with-modification → D3.
- **F4 hook-deployment-currency**: `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts` (from SPEC-40 D4) covers MCP `dist/` parity. No analogous check covers `tools/hooks/dist/` parity. Hooks are invoked freshly per Claude Code tool event, so stale dist on disk is loaded directly without process-restart warning. Accept → D4 (scope-path-A: src-vs-dist content-hash CI check, simpler than the spawned-process pattern; hooks are one-shot CLI invocations rather than persistent processes, so the runtime spawn pattern adds wall-clock cost without proportional value).

### Key design decisions

- **Considered producing this as 4 standalone tickets without a parent spec; chose spec+tickets (umbrella shape) `(structural)`.** Worldloom's existing pattern is each ticket has a parent spec for context; standalone tickets without a parent spec would break the convention and obscure the cluster's unifying theme (pipeline-hygiene cleanup after SPEC-40 archival). The spec is small (<200 lines) and primarily anchors the four deliverables in a single design context.

- **Considered scope-path-B (spawned-process tests per hook mirroring SPEC-40 D4); chose scope-path-A (src-vs-dist content-hash CI/local check) for D4 `(structural)`.** Hooks differ structurally from the MCP server: each hook is a short-lived CLI invocation spawned per Claude Code tool event, not a persistent process. The MCP-server spawned-process test catches stale `dist/` because the server runs across many requests; hooks load `dist/` fresh per event, so the failure mode is different — what matters is that an existing ignored runtime `dist/` matches `src/` at the build moment, not that a deployed process returns matching hashes. A dist-currency check (run `npm run build`, compare produced `dist/*` manifest against the current ignored runtime `dist/*` manifest when present; mismatch fails) covers this cleanly without the per-hook spawn cost.

- **Considered combining F2.a and F2.b into one "CI hygiene lints" ticket; chose two separate tickets `(structural)`.** The two lints target different surfaces (fixture-ID conformance vs archive-citation discipline), live in different lint scripts, and need different whitelist mechanisms. Combining them would obscure review boundaries and force one PR to land both — splitting keeps each ticket independently reviewable and lets either land first.

- **Considered including F1 (validator-hardening-III) in this spec; chose to defer per the unchanged structural reason `(structural)`.** The reassessment confirmed no new audit pressure has surfaced post-SPEC-40 archival; the deferred cues remain scope-distinct from the hygiene-cluster theme. Folding F1 in would mix structural-validator mechanization (a multi-deliverable, multi-week effort) with three small CI/test additions (a few hours each). The structural-distinct scope reason from SPEC-40 still loads; F1 remains in §Risks & Open Questions of this spec for visibility, awaiting a fresh external audit that surfaces specific live cases.

---

## Approach

Each deliverable targets a single named follow-up from SPEC-40's §Risks & Open Questions. The four deliverables fall into three architectural concerns:

- **CI hygiene lints** (D1, D2): two new grep-based lint scripts + CI workflow integration. Each catches a specific recurring drift channel (fixture-ID rot; archive-citation drift). Both are pure CI surface additions; neither modifies validators, hooks, or pipeline runtime.
- **Test-coverage extension** (D3): DA story-local seed filtering fix plus one new test case extending the existing PG/BEL/SE coverage. Reassessment found the live filter omitted the DA prefix, so D3 landed a minimal same-seam source fix, fixture row, and fixture-consumer expectation update.
- **Build-currency CI check** (D4): one new CI check script + workflow integration that verifies `tools/hooks/dist/` matches `tools/hooks/src/` at every CI run. Closes the parallel-to-SPEC-40-D4 gap for the hooks package.

Implementation phasing recommendation (independent, parallelizable; no inter-ticket Deps):

- All four tickets are independent of each other (`Deps: None`).
- Suggested implementation order (smallest first): D3 → D1 → D2 → D4. D3 was the smallest same-seam fix/test slice; D1/D2 share the same CI workflow modification skill; D4 introduces a new CI check pattern.

No new patch-engine ops, no new MCP retrieval surfaces, no new schema fields, no new validators, no new hooks. The blast radius is two new lint scripts + two CI workflow extensions (D1, D2), one DA story-local seed filter/test slice (D3), one new CI check script + one workflow extension (D4).

---

## Deliverables

Deliverables grouped by category (CI lints → test extension → CI build check). Each is self-contained and lands as its own ticket. All four tickets have `Deps: None`.

### D1 — `fixture_unpadded_id_lint_current_only` CI lint (P2, follow-up SPEC-40 F2.a)

**Problem**: No CI lint enforces the unpadded-natural-integer ID convention (FOUNDATIONS-002) on fixture files. SPEC-35 D8 and SPEC-36 D3 both addressed fixture rot reactively; a deterministic CI lint would prevent recurrence by failing CI on any padded ID literal (e.g., `PG-0001`, `CF-0001`) outside the `archive/` directory.

**Change**: Add a grep-based lint script (likely `tools/validators/scripts/check-fixture-id-padding.sh` or equivalent) that scans `tools/**/tests/**/*.{ts,json,yaml,yml}` (excluding `archive/`) for padded ID literals matching the pattern `<PREFIX>-0+[0-9]+` for each known ID prefix (PG, SE, BEL, SF, CHC, OBL, CNSQ, THR, SREL, STSTAT, STENT, STINT, STLOC, STOBJ, SLT, DA, BR, CF, CH, INV, M, OQ, ENT, SEC, PA, CHAR, AU, RP, SAU, SP, RSP). Fails with a non-zero exit code listing each offending file:line. Wire into `.github/workflows/ci-validators.yml` (or a new `ci-hygiene.yml`) as a CI gate.

**Implementation note (2026-05-17 / SPEC41FUP-001)**: Live implementation found the draft "current fixtures are clean" premise was false: `tools/**/tests/**` and `tools/**/src/**/*-fixture.ts` contained 1,192 existing padded-ID occurrences aggregated into 307 file/ID baseline entries. The accepted D1 shape is therefore baseline-aware forward enforcement: `check-fixture-id-padding.sh` fails on new occurrences beyond `fixture-id-padding-baseline.tsv` while preserving legacy fixture cleanup for a separate owner.

**Archived ticket**: `archive/tickets/SPEC41FUP-001.md` — completed; see ticket for full Files to Touch, Acceptance Criteria, Test Plan.

### D2 — `current_docs_do_not_cite_archive_as_authority` CI lint (P2, follow-up SPEC-40 F2.b)

**Problem**: No CI lint enforces archive-citation discipline. SPEC-35 D9 and SPEC-36 D4 both fixed current-doc citations to archived specs reactively; a CI lint would prevent recurrence.

**Change**: Add a grep-based lint script (likely `tools/validators/scripts/check-archive-citation-discipline.sh` or equivalent) that scans `docs/**/*.md`, `.claude/skills/**/*.md`, `specs/**/*.md`, `tools/**/README.md` (excluding `archive/`) for `archive/specs/SPEC-` or `archive/tickets/` citations that lack a whitelist marker. Whitelist patterns: `**Supersedes**: archive/specs/SPEC-`, `historical`-tagged citations, `archived-as-context` markers. Fails with non-zero exit code listing offending file:line + the offending citation. Wire into `.github/workflows/ci-validators.yml` (or `ci-hygiene.yml`) as a CI gate.

**Archived ticket**: `archive/tickets/SPEC41FUP-002.md` — completed; see ticket for full Files to Touch, Acceptance Criteria, Test Plan.

### D3 — DA seed-node filtering fix and test case for context-packet story-pipeline filtering (P2, follow-up SPEC-40 F3, scope narrowed)

**Problem**: At intake, `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` had dedicated test cases for PG/BEL/SE seed-nodes, but the DA seed-type case from the eleventh-iteration audit's `PG/BEL/SE/DA` enumeration was missing. Generic story-local seed coverage existed, but live implementation also found `STORY_LOCAL_SEED_NODE_PATTERN` omitted `DA`, so the DA case exposed a real filter gap rather than only a coverage gap.

**Change**: Add `DA` to the story-local seed prefix filter; add one `DA-1` story-local diegetic artifact fixture row; update the fixed story-bundle search expectation for the new fixture row; and add one test case `getContextPacket ignores DA seed nodes for story-pipeline task types` mirroring the existing PG/BEL/SE pattern.

**Archived ticket**: `archive/tickets/SPEC41FUP-003.md` — completed; see ticket for full Files to Touch, Acceptance Criteria, Test Plan, and same-seam deviations.

### D4 — Hook-deployment-currency CI check (P2, follow-up SPEC-40 F4, scope-path-A)

**Problem**: `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts` (from SPEC-40 D4) verifies the MCP server's deployed `dist/` matches source at runtime via spawned-process hash parity. No analogous check covers `tools/hooks/dist/`. Hooks are invoked freshly per Claude Code tool event from `tools/hooks/dist/src/hookN.js`; a stale dist directly executes against the wrong source.

**Change**: Add a CI/local check script (likely `tools/hooks/scripts/check-dist-currency.sh` or equivalent) that runs `npm run build` against `tools/hooks/`, captures the produced `dist/` manifest (SHA-256 per sorted relative file), and compares it against the current ignored runtime `dist/` manifest when `dist/` exists. If they differ, the script fails with a clear message instructing the implementer to rebuild `tools/hooks/dist/`. If `dist/` is absent, the script builds it and passes on build success. Wire into `.github/workflows/ci-hooks.yml` as a CI gate. Scope-path-A (content-hash check at build time) was chosen over scope-path-B (spawned-process per hook) per §Key design decisions because hooks are one-shot CLI invocations, not persistent processes. SPEC41FUP-004 reassessment corrected the draft "committed dist" wording: `tools/hooks/dist/` is intentionally gitignored by `.gitignore` (`tools/*/dist/`), so the check enforces local runtime-output currency rather than committed-artifact parity.

**Archived ticket**: `archive/tickets/SPEC41FUP-004.md` — completed; see ticket for full Files to Touch, Acceptance Criteria, Test Plan, and ignored-dist reassessment.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Tooling Recommendation (`docs/FOUNDATIONS.md:510`) | aligns | All four deliverables reinforce the CI/lint tooling discipline FOUNDATIONS endorses — three CI hygiene lints (D1, D2, D4) prevent recurring drift channels; the D3 filter/test slice closes the DA story-local seed filtering gap. None weakens existing tooling enforcement. |

Tooling-adjacent scope per Step 4 §FOUNDATIONS.md alignment rule — only §Tooling Recommendation is actively engaged; other FOUNDATIONS principles (Rules 1-7, Canon Layering, HARD-GATE) are not load-bearing here since the spec adds CI surface and package-local test/filter coverage without touching canon records, validators, hooks, or HARD-GATE surfaces.

---

## Verification

Per-deliverable verification (each acceptance criterion in the ticket is the load-bearing gate):

- **D1**: lint script fails on a fixture containing `PG-0001`; lint script passes on a fixture containing `PG-1`; CI workflow runs the lint and reports the failure.
- **D2**: lint script fails on a doc citing `archive/specs/SPEC-XX` without whitelist marker; lint script passes on a doc citing `archive/specs/SPEC-XX` with `**Supersedes**:` marker; CI workflow runs the lint.
- **D3**: `cd tools/world-mcp && npm test` passes with the DA prefix filter, fixture row, search expectation, and test asserting the DA seed-node is filtered and the warning is present.
- **D4**: dist-currency check fails when source is modified without rebuilding dist; passes when dist matches source; CI workflow runs the check.

Cross-spec verification:
- No `_source/` mutation paths taken (verifies story/world separation).
- No new validator names in `tools/validators/src/public/registry.ts`.
- No new patch-engine op kinds in `tools/patch-engine/src/envelope/schema.ts`.
- No new MCP tools in `tools/world-mcp/src/tool-names.ts`.
- No schema files under `tools/validators/src/schemas/` modified.

---

## Out of Scope

- **F1 validator-hardening-III mechanization** — multi-location supersession, STENT-death-with-SREL, STOBJ-as-independent route, environmental-change-via-STLOC-modification cues. Per §Risks & Open Questions below; deferred awaiting fresh external audit.
- **Whitelist mechanism for archive-citation lint beyond the markers named in D2** — D2 establishes the initial whitelist set; future legitimate citation patterns (e.g., a new "see archive for historical context" marker) can be added incrementally as they surface.
- **Spawned-process tests per hook** (D4 scope-path-B) — chose scope-path-A per §Key design decisions; the spawned-process pattern can be added in a future iteration if hook runtime drift becomes a documented issue.
- **CI hygiene workflow consolidation** — D1, D2 may each wire into an existing CI workflow (`ci-validators.yml`) or a new `.github/workflows/ci-hygiene.yml`. The workflow placement is a ticket-level decision; the spec does not mandate one over the other.

---

## Risks & Open Questions

- **F1 validator-hardening-III deferral `(structural)`**: The four broader indirect-witness cues (multi-location supersession + STENT-death-with-SREL + STOBJ-as-independent route + environmental-change-via-STLOC-modification) remain authorial discipline. SPEC-40's reassessment in this session confirmed the structural-distinct scope reason hasn't moved; the eleventh-iteration audit itself characterized them as "not yet enforced." Recommend deferring until a fresh external audit identifies specific live cases the current `expected-witness-coverage` validator silently passes. Under no-scope-constraint conditions where the additional cues become observable failure modes, a future validator-hardening-III spec would land them as 4 separate deliverables (one per cue family).

- **Whitelist-pattern recurrence for D2 `(pragmatic)`**: The archive-citation lint will need its whitelist updated whenever a new legitimate-historical-citation pattern emerges (e.g., a new spec that genuinely needs to cite an archived spec for context beyond `**Supersedes**:`). The lint failure mode is fail-loud (CI shows the offending line + the missing marker), so the recurrence is self-documenting; the cost is operator attention when adding new archive references. Acceptable cost — the alternative (no lint) reverts to the recurring-drift pattern SPEC-35 D9 and SPEC-36 D4 each fixed reactively.

- **CI wall-clock budget for D4 `(pragmatic)`**: The dist-currency check runs `npm run build` on every CI invocation of `ci-hooks.yml`, adding the build cost (~5-15s) to every PR's CI pipeline. Acceptable for the safety the check provides; if CI budget pressure surfaces, the check could be moved to a separate workflow that runs only on PRs touching `tools/hooks/src/` paths (path-filtered CI trigger).

---

## Implementation Order

Single-spec deliverable; `specs/IMPLEMENTATION-ORDER.md` not created (single spec, no sequencing across specs).

Recommended within-spec ticket ordering (smallest-first; all `Deps: None`):
1. **SPEC41FUP-003** — D3 DA seed-node filter/test slice (smallest same-seam slice)
2. **SPEC41FUP-001** — D1 fixture_unpadded_id_lint (small lint script + CI workflow extension)
3. **SPEC41FUP-002** — D2 archive-citation-lint (small lint script + CI workflow extension)
4. **SPEC41FUP-004** — D4 hook-deployment-currency CI check (introduces new CI check pattern)

## Outcome

Completed 2026-05-17.

All SPEC-41 deliverables are implemented and archived:

- `archive/tickets/SPEC41FUP-001.md` landed the baseline-aware fixture ID padding lint and wired it into `ci-validators.yml`.
- `archive/tickets/SPEC41FUP-002.md` landed the archive-citation discipline lint and wired it into `ci-validators.yml`.
- `archive/tickets/SPEC41FUP-003.md` landed the DA story-local seed filter/test slice in `tools/world-mcp`.
- `archive/tickets/SPEC41FUP-004.md` landed the hooks dist-currency check and wired it into `ci-hooks.yml`.

Final verification run 2026-05-17:

- `bash tools/validators/scripts/check-fixture-id-padding.sh` — passed.
- `bash tools/validators/scripts/check-archive-citation-discipline.sh` — passed.
- `cd tools/hooks && npm run check:dist-currency` — passed.
- `cd tools/world-mcp && npm test` — passed, 392/392 tests.
- Active ticket sweep confirmed no remaining `SPEC41FUP` tickets under `tickets/`.

Deviations from draft:

- D1 became baseline-aware because current fixtures already contained legacy padded IDs.
- D3 landed a real DA prefix filter fix in addition to the drafted test.
- D4 enforces ignored local runtime `dist/` currency rather than committed-artifact parity because `tools/hooks/dist/` is intentionally gitignored.
