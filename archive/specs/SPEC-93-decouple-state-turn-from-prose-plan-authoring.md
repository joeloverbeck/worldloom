# SPEC-93 — Decouple the State Turn from Prose-Plan Authoring; Remove Plan-Hash Coupling

**Status:** draft
**Date:** 2026-05-28
**Classification:** story-canon-related (changes `branching-story-bootstrap`/`branching-story-turn-cycle` state-turn flow, the `PG` schema and its state-hash payload, the nine shared hard gates, six page-plan-era validators, Hook 6/7, `branching-story-prose-attach`; amends FOUNDATIONS §Story Bundles §4/§4a/§7/§9, Rule 1, Rule 7, and the shared story state contract §7/§8).
**Depends on:** **SPEC-92** (the scene render layer must exist to carry prose before page-plan authoring is removed). Land SPEC-92 first.
**Related:** `specs/IMPLEMENTATION-ORDER.md`, `archive/specs/SPEC-92-scene-range-prose-rendering-layer.md`; supersedes the deferral in **archived SPEC-72 §3** ("Removing `plan_hash` from `PG` or from the `state_hash` payload … would force a `snapshot_replay_equality` discontinuity clause").
**Source:** triage of `reports/scene-prose-planning-first-iteration.md` (2026-05-28), Approach B. User clarifications: (a) as sole author they want plans freely editable with zero state coupling and get no value from plan hashes ([[feedback-author-rejects-hash-coupling]]); (b) in practice the model authors the page plan *first* and reads the prior page's prose **plan** (not the authoritative story records) to compute the state delta — real contamination of state reasoning by a render artifact.

---

## 1. Context & Motivation

With SPEC-92 in place, external prose is planned and rendered at the **scene** level. The per-`PG` page plan is therefore no longer needed as a render artifact — and keeping it actively harms the state engine:

- **Contamination (the primary motive).** Although the formal turn-cycle phase order resolves causal state (Phases 0–6) *before* authoring the page plan (Phase 7), in practice the page plan's existence makes the model (a) author the plan first and (b) compute the next state delta by reading the prior page's prose **plan** rather than the authoritative story records. That is "operating on prose" where FOUNDATIONS §Tooling Recommendation requires operating on records. Removing the render plan from the state turn forces the delta to be computed from the prior `PG`'s story records (`state_snapshot.active_records`, beliefs, obligations, etc.) via MCP retrieval. As the author predicts, *which records get created or superseded may shift materially* once the plan crutch is gone — this is a correctness improvement, not only a cost/UX one.
- **Cost.** The 19-section plan (with verbatim §2/§3/§19, STCHAR packets, full state context) is authored on every turn. Removing it removes that per-turn authoring cost; scene plans (SPEC-92) carry the render burden once per scene.
- **Plan-hash coupling (author ergonomics).** SPEC-72 already made `plan_hash` advisory; SPEC-72 §3 deferred *removing* `plan.plan_hash`/`prose_plan_path`, assuming the removal "would force a `snapshot_replay_equality` discontinuity clause." That assumption was conservative. `computePgStateHash` (`tools/world-index/src/hash/content.ts`) hashes *exactly the PG fields present on the record* (excluding only `state_hash`), so the legacy/new split is already emergent from field presence — **no discontinuity clause and no change to `content.ts` are required** (see §3). With page plans gone, both fields are meaningless for new `PG`s (they point at / hash a non-existent page plan). The author wants them gone (no value in their workflow). This spec makes them optional, has new `PG`s omit them, and grandfathers existing records.

This spec is the **subtractive** half of the Approach-B pair. The `PG`/`SE`/`CHC` causal state engine, branch/fork mechanics, and the `state_hash` fork-replay chain are **retained** — only the render-plan artifact, its hash coupling, and its dedicated validators/hooks are removed, with the two record-validating gates rehomed.

## 2. Scope

### In scope

1. **turn-cycle**: remove the page-plan authoring phase; the state turn outputs `SE` + `PG` snapshot + `CHC` + validation trace only. The skill explicitly retrieves the parent `PG`'s story records to compute the delta. Remove the page-plan HARD-GATE precondition and the `page_plan_drafts` argument to `validate_patch_plan`/`submit_patch_plan`.
2. **bootstrap**: remove root page-plan authoring; state only.
3. **`PG` schema**: make `plan.plan_hash` and `prose_plan_path` **optional** (grandfather existing records; new `PG`s omit them). New `PG`s that omit both fields are automatically absent from the `state_hash` payload, because `computePgStateHash` hashes only the fields present on the record; legacy `PG`s that retain both fields keep them in their payload. The legacy/new payload split is therefore **emergent from field presence — no `content.ts` change and no explicit epoch-keyed selector are required**. `PG`s authored before SPEC-93 verify under the field set they carry (with `prose_plan_path`); `PG`s authored after verify under the reduced field set (without). Retain the `state_hash`/`state_hash_parent` chain and the `computePgStateHash`-from-stored-fields tamper check **entirely** unchanged.
4. **Rehome gates 7 & 9** (of the nine shared hard gates, `story-state-contract.md §7`):
   - **Gate 7 (plan grounding)** → **state-delta grounding**: validates that the `PG` record's `state_snapshot` + `SE.state_delta` + emitted choices are grounded in active records / the selected `SLT` / loaded canon — operating on the `PG`/`SE` records, not a markdown plan.
   - **Gate 9 (turn-driver lawfulness)** → validates the `SE`/`PG` driver fields (`driver_records[]`, `pov_visibility`, driver kind) directly. Retain the record-based driver-consistency and POV-observer-firewall logic; retire only the plan-markdown-dependent portions (e.g. the page-plan active-pressure disposition-table check).
5. **Retire page-plan-era surfaces** (build scene equivalents first — they exist after SPEC-92):
   - Validators whose input is the page-plan **markdown** or the page prose-receipt: `page_plan_verbatim_section_integrity`, `page_plan_stchar_packet_integrity`, `page_plan_body_engine_vocabulary_cleanliness`, the plan-markdown portion of `page_plan_turn_driver_consistency` (incl. `page_plan_active_pressure_table_missing`), `prose_receipt_hash_integrity`, `prose_receipt_stchar_integrity`, plus their support modules (`page-plan-section-parser`, `page-plan-verbatim-canonical-sources` once SPEC-92 retargets its own copy, `prose-receipt-schema-compliance`).
   - **Hook 6** (`hook6-guard-story-markdown-hash`) and **Hook 7** (`hook7-guard-prose-receipt-hash`) — both guard hashes that no longer exist on new artifacts.
   - **`branching-story-prose-attach`** and the `pages-prose-receipts/` + `prose-receipt.schema.json` page-receipt path (superseded by SPEC-92's `branching-story-scene-prose-attach` + `scene-prose-receipt.schema.json`).
   - `compute-pg-hashes` CLI: drop the `--plan`→`plan_hash` stamping/coupling; PG hashing becomes `state_hash`-only.
6. **Contract & FOUNDATIONS amendments** (see §4, §5).

### Out of scope (and where it lives / why)

- The scene render layer itself → **SPEC-92**.
- **Scene-first Story Explorer** → deferred. **Constraint:** SPEC-93 must NOT break Story Explorer's existing page-plan/page-prose **read** paths (`tools/story-explorer/src/server/routes/prose.ts`, `read/page-detail.ts`, `web/.../PlanProseTab.tsx`). Those continue serving legacy bundles; for new (planless) `PG`s they render a graceful "no page plan" state. Story Explorer is otherwise untouched.
- Removing the `PG` `state_hash` chain. **Kept** — it protects causal fork-replay determinism (an engine property the author never edits), distinct from the rejected plan-byte hashes. Flagged as an open question only (§7).
- Rewriting existing committed `PG` records (red-bunny). Grandfathered; never mutated (append-only).
- Migrating existing page-prose/page-plan files to scenes.

## 3. Migration & grandfathering

- Existing `PG` records keep their `plan.plan_hash` + `prose_plan_path` (append-only YAML; not rewritten). Their stored `state_hash` stays valid because `computePgStateHash` rehashes the fields the record actually carries — including `prose_plan_path` — and reproduces the stored value. New `PG`s authored after SPEC-93 omit both fields, so those fields are simply absent from the rehashed payload.
- **Why no `content.ts` change.** `computePgStateHash` (`content.ts`) iterates the PG record's present fields and excludes only `state_hash`; the per-record payload is thus self-describing. A legacy `PG` recomputes (with `prose_plan_path`) to its stored hash; a new `PG` recomputes (without) to its stored hash — each verifies against itself with zero external state and no code edit. The rejected alternative — adding `prose_plan_path` to `PG_STATE_HASH_EXCLUDED_FIELDS` to "remove it from the payload" — would recompute every grandfathered `PG` *without* `prose_plan_path`, producing a hash mismatch and a false `state_hash` FAIL on all legacy records. That is why this spec changes the schema (optional fields) and the authoring skills (omit the fields), **not** the hashing function.
- Existing `pages-prose-plans/`, `pages-prose/`, `pages-prose-receipts/` artifacts remain on disk as legacy and remain enumerated/readable (Story Explorer + world-index read paths preserved); they are simply no longer produced for new pages.

## 4. Contract changes (`.claude/skills/_shared-templates/`)

- **`story-record-schemas.md`**: `plan.plan_hash` and `prose_plan_path` → optional; document that new `PG`s omit both fields and that the `state_hash` payload is field-presence-driven (legacy `PG`s carry the fields and hash with them; new `PG`s do not — no separate payload-definition machinery); the `compute-pg-hashes` mandate narrows to `state_hash`-only.
- **`story-state-contract.md` §7**: gate 7 redefined (state-delta grounding on the `PG`/`SE` record); gate 9 redefined (driver lawfulness on `SE`/`PG` driver fields). §8 (page-plan 19-section enumeration) is retired and replaced by a pointer to SPEC-92's scene-plan structure; the "plan + (optional) prose-attach" pipeline note is rewritten so state is authoritative at `PG`-record commit and prose is rendered at scene level.

## 5. FOUNDATIONS changes (`docs/FOUNDATIONS.md`)

- **§Story Bundles §4 ("Pipeline shape")**: the comprehensive `pages-prose-plans/PG-<integer>.md` is no longer authored at bundle/turn commit; state is authoritative at `PG`-record commit; prose is planned/rendered at scene level (SPEC-92). `branching-story-turn-cycle` advances from any committed `PG` snapshot, reasoning from story records.
- **§Story Bundles §4a ("Plan-Authority Boundary")**: reword so authority anchors on the `PG` record; "rendered prose is a rendering of committed state" generalizes to scene prose; no page-plan render artifact is part of the state turn; the "prose deviating from plan is routed by `branching-story-prose-attach`" sentence reroutes to scene-prose deviation handled by `branching-story-scene-prose-attach`.
- **Rule 1 page-plan paragraph**: the load-bearing engine artifact is the `PG` record's state delta (grounded in records via gate 7), not a markdown page plan. Remove the "plan grounding is gate 7 at page-plan commit" framing; grounding applies to the `PG` record.
- **Rule 7 mystery-firewall paragraph**: gate 3 (mystery/invariant firewall) is unchanged and stays the authoritative plan-time firewall now on the `PG` record; remove page-plan §11 ("forbidden mystery resolutions" plan section) references. The rendered-prose firewall moves to scene attach (`scene_range_forbidden_mystery_resolution`, SPEC-92).
- **§Story Bundles §9**: drop the page-plan §2/§3/§19 hosting language; the verbatim contract blocks are hosted in scene plans (SPEC-92); also drop `branching-story-prose-attach` from the §9 Skill-Category-2c scope roster (the same 10-skill roster is enumerated at both §7 and §9 — both drop prose-attach, leaving 9). **Verbatim-sections note:** the cold-context verbatim-inlining decision ([[feedback-page-plan-verbatim-sections]]) is **preserved, not reversed** — §2/§3/§render-time still inline verbatim into every render artifact; the artifact is now the scene plan rather than the page plan.
- **§Story Bundles §7**: `branching-story-prose-attach` leaves the Skill Category 2c roster, taking it from ten skills to nine (SPEC-92 already added `branching-story-scene-plan` + `branching-story-scene-prose-attach`). The identical drop applies to the §9 roster enumeration above.

## 6. Files to touch

(Source files; colocated tests + fixtures follow each. `dist/` is build output — not edited.)

- **Skills:** `branching-story-turn-cycle/SKILL.md` + `references/{phase-6-page-snapshot, phase-7-page-plan, phase-9-validation-gates, governance-and-foundations}.md`; `branching-story-bootstrap/SKILL.md` + `references/{phase-7-root-event-and-page, phase-8-9-page-plan-and-choices, phase-10-validation, governance-and-foundations}.md`; retire `branching-story-prose-attach/SKILL.md`; update `branching-story-health-audit/SKILL.md` (page-plan audit references → scene/PG); update cross-references in `skill-audit/references/cross-skill-consistency.md` — **fully reconcile its Category 2c roster**: remove `branching-story-prose-attach` **and** add the two SPEC-92 scene skills it is currently missing (`branching-story-scene-plan`, `branching-story-scene-prose-attach`), fix the "eight story-pipeline skills per §7" count/claim (now nine, matching FOUNDATIONS §7), and update shared-surface bullet (v) so the content-policy-inlining note points at the scene-plan Content Policy section rather than `pages-prose-plans/…§2` / page-plan §8 — `commitment-block-authoring/references/governance-and-foundations.md`, `mcp-integration-audit/SKILL.md` (drop the `page_plan_drafts` required-argument reference), `story-fact-promotion-to-canon/SKILL.md`.
- **Shared templates:** `_shared-templates/story-record-schemas.md`, `_shared-templates/story-state-contract.md`.
- **Validators:** retire `page-plan-verbatim-section-integrity.ts`, `page-plan-stchar-packet-integrity.ts`, `page-plan-body-engine-vocabulary-cleanliness.ts`, `page-plan-section-parser.ts`, `prose-receipt-hash-integrity.ts`, `prose-receipt-stchar-integrity.ts`, `prose-receipt-schema-compliance.ts`, `schemas/prose-receipt.schema.json`; split `page-plan-turn-driver-consistency.ts` + `page-plan-active-pressure.ts` (retire plan-markdown checks, rehome record-based gate-9 logic); retain record-operating `turn-driver-pov-observer-firewall.ts`; update `schemas/story-page.schema.json` (optional `plan_hash`/`prose_plan_path` — remove both from the top-level `required` array and `plan_hash` from `plan.required`); registry + `_engine-vocabulary-tokens.ts` cleanup; drop the validator-framework `RunOptions.pagePlanDrafts` plumbing (`tools/validators/src/public/index.ts`) that the retired page-plan validators consumed.
- **world-mcp:** `cli/compute-pg-hashes.ts` (state-only), `tools/verify-pg-state-hash.ts` (drop the `recorded_plan_hash`/`computed_plan_hash`/`plan_hash_match` output fields and the `server.ts` "SPEC-72 advisory" `plan_hash_match` comment), `server.ts` + `tools/validate-patch-plan.ts` + `cli/{submit,validate}-patch-plan.ts` (drop `page_plan_drafts`, incl. the `PagePlanDraft` type + `validatePagePlanDraftsShape` helper), `tools/plan-story-state-maintenance.ts` (stop generating the maintenance page-plan body; stop stamping `plan_hash`/`prose_plan_path`; emit a planless maintenance `PG`), `README.md`.
- **world-index:** `src/hash/content.ts` — **no change** (`computePgStateHash` already hashes only the fields present on the record; the legacy/new split is emergent from field presence). Add a regression test asserting (a) a legacy `PG` carrying `prose_plan_path`/`plan` verifies, (b) a planless new `PG` verifies, (c) `content.ts` is not modified to exclude `prose_plan_path`. `enumerate.ts` keeps legacy page directories for read (no removal).
- **Hooks:** retire `tools/hooks/src/hook6-guard-story-markdown-hash.ts` + `hook7-guard-prose-receipt-hash.ts`; update `.claude/settings.json.example` + `tools/hooks/README.md`.
- **Docs:** `docs/FOUNDATIONS.md`, `docs/WORKFLOWS.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/REPOSITORY-MAP.md`, `docs/prose-renderer-contract/README.md`.
- **Story Explorer:** **preserve** read paths; verify graceful handling of planless `PG`s (no deletion). Adjust only tests that assert page-plan authoring still happens.

## 7. FOUNDATIONS Alignment

| Principle | Stance | Rationale (mechanism @ surface) |
|---|---|---|
| §Story Bundles §4 / §4a (Plan-Authority Boundary) | tensions → **amended** | State authority re-anchors on the `PG` record (not a page plan); the spec rewrites §4/§4a so the render artifact leaves the state turn @ schema + skill prose. |
| §Tooling Recommendation | aligns | The state turn now computes the delta from the prior `PG`'s story records via MCP retrieval instead of from a prose plan @ skill prose. |
| Rule 1 (No Floating Facts) | tensions → **amended** | Grounding rehomes from the markdown plan to the `PG` record's state delta (gate 7); the spec rewrites the Rule 1 page-plan paragraph @ validator gate. |
| §Story Bundles §5b (Schema-Minimalism) | aligns | Removes the now-non-load-bearing `plan_hash`/`prose_plan_path` fields from new `PG`s @ schema constraint. |
| Rule 6 (No Silent Retcons) | N/A | No canon mutation; existing records are append-only and grandfathered, not rewritten; the field-presence payload rule and the "no `content.ts` change" decision are documented, not silent. |
| Rule 7 (Preserve Mystery Deliberately) | aligns | Gate 3 (mystery/invariant firewall) stays authoritative on the `PG` record; the rendered-prose firewall moves to scene attach @ validator gate. |
| §Story Bundles §6b (Observer Firewall) | aligns | Record-operating POV/driver firewall (gate 9) is retained and rehomed; only plan-markdown checks retire @ validator gate. |

## 8. Acceptance criteria

1. `branching-story-turn-cycle` produces no `pages-prose-plans/PG-<n>.md`; `branching-story-bootstrap` produces no `pages-prose-plans/PG-1.md`; the `plan_story_state_maintenance` MCP tool produces a planless maintenance `PG` (no page-plan body, no `plan_hash`/`prose_plan_path` stamping). The page-plan HARD-GATE precondition and `page_plan_drafts` argument are gone.
2. turn-cycle computes the state delta from the parent `PG`'s story records — the skill's flow contains the retrieval calls (`get_record`/`get_records`/`get_context_packet` with `story_slug`) and no instruction to read a prior prose plan for delta reasoning.
3. New `PG` records carry no `plan.plan_hash`/`prose_plan_path`; `story-page.schema.json` makes both optional; a new `PG`'s `state_hash` payload therefore omits both fields *by their absence* (no `content.ts` edit); the field-presence payload rule is documented and a regression test guards that `content.ts` was not modified to exclude `prose_plan_path`.
4. Existing pre-SPEC-93 `PG`s still verify (their stored `state_hash` rehashes from the fields they carry, including `prose_plan_path`); a new `PG`'s `state_hash` is byte-identical across re-runs; tamper detection (hand-edited `PG` state field → FAIL) is retained.
5. The six page-plan-era validators + their support modules, `prose-receipt.schema.json`, Hook 6, Hook 7, and `branching-story-prose-attach` are retired with no zombie gates. A broad-scope sweep (below) shows no remaining *required* references in skills/tools/docs.
6. Gates 7 and 9 validate the `PG`/`SE` record (not a markdown plan); the `PG.validation_trace` is still populated for all nine gates with one-line rationales.
7. FOUNDATIONS §4/§4a/Rule 1/Rule 7/§9/§7 and story-state-contract §7/§8 are amended consistently; no dangling page-plan contract references remain (verified by the sweep).
8. Story Explorer still builds + serves legacy page plans/prose and handles planless new `PG`s gracefully (no crash, "no page plan" state).
9. Affected `tools/` packages build + test green.

**Removal-completeness sweep (acceptance command, broad scope):**
```
grep -rn "pages-prose-plans\|prose_plan_path\|page_plan_\|prose_receipt_\|hook6-guard-story-markdown-hash\|hook7-guard-prose-receipt-hash\|branching-story-prose-attach\|page_plan_drafts" \
  .claude/skills/ tools/*/src/ tools/*/tests/ docs/ \
  | grep -v "scene-\|SPEC-93\|SPEC-92\|legacy\|grandfather"
```
Remaining hits must be intentional legacy-read references (Story Explorer read paths, world-index legacy enumeration, archived-spec/triage mentions) — each annotated, none a live authoring/validation dependency.

## 9. Test plan

Per-package (per-package npm, no workspace — verified): from each package dir run `npm run build` (tsc = typecheck) then `npm test`; `tools/patch-engine` also `npm run test:integration`.

- `tools/validators`: retired validators removed from the registry and their suites deleted; gate 7 (state-delta grounding) + gate 9 (record-based driver lawfulness) fixtures pass on records with no page plan present; `story-page.schema.json` accepts a `PG` lacking `plan`/`prose_plan_path` and still accepts a legacy `PG` carrying them. PASS rationale per fixture.
- `tools/world-index`: field-presence `state_hash` — legacy `PG` (with `prose_plan_path`) verifies; new planless `PG` (without) verifies; a regression test asserts `content.ts` was not changed to exclude `prose_plan_path`. PASS rationale: each record rehashes from the fields it carries and reproduces its own stored hash; no selector or epoch marker is implemented, so there is nothing to false-FAIL.
- `tools/world-mcp`: `compute-pg-hashes` emits `state_hash` only (no `plan_hash` stamping); `verify-pg-state-hash` reports only `state_hash` (no `plan_hash_match`); patch submission accepts no `page_plan_drafts`; `plan_story_state_maintenance` emits a planless maintenance `PG`.
- `tools/hooks`: Hook 6 + Hook 7 suites removed; remaining hooks green; `.claude/settings.json.example` no longer wires the two retired hooks.
- `tools/patch-engine`: `PG` create op accepts records without plan fields; append-only + ordering retained.
- Skill contract checks: turn-cycle/bootstrap SKILL.md no longer reference page-plan authoring, `page_plan_drafts`, or reading a prior prose plan for the delta; the parent-record-retrieval step is present.
- Regression: an end-to-end bootstrap → turn-cycle → scene-plan (SPEC-92) → scene-prose-attach (SPEC-92) flow commits state with no page plan and renders prose at scene level.

## 10. Open questions (defaulted; user may override on review)

1. **Keep the `PG` `state_hash` chain?** Default: **keep** — it protects fork-replay determinism (engine correctness, author never edits it), distinct from the rejected plan-byte hashes. If the author later wants it gone too, that is a separate, larger replay-determinism decision.
2. **Retire the legacy page directories from world-index enumeration once no bundle uses them?** Default: **keep enumerating for read** while any legacy bundle (red-bunny) retains page artifacts; a future janitorial spec can drop the enumeration when the last legacy bundle is gone or migrated.
