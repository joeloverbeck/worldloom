# SPEC-94 — Decouple Scene Publication State from the Append-Only `SCN` Record

**Status:** draft
**Date:** 2026-05-28
**Classification:** story-canon-related (changes the `SCN` schema in `story-record-schemas.md §4.5.20`, the `story-scene.schema.json` validator schema, the `branching-story-scene-plan` and `branching-story-scene-prose-attach` skills, and INDEX/`previous_scene_id` consumption of scene status; touches FOUNDATIONS §Story Bundles only by reinforcing the existing "SCN is a render-membership record, not a publication record" principle — no new principle introduced).
**Depends on:** **SPEC-92** (scene render layer; `SCN` + scene-plan + scene-prose-attach). SPEC-92 and SPEC-93 are landed (COMPLETED 2026-05-28).
**Related:** archived `SPEC-92-scene-range-prose-rendering-layer.md`, archived `SPEC-93-decouple-state-turn-from-prose-plan-authoring.md`; supersedes the `SCN.status` publication-enum decision made in SPEC-92 §4.5.20. This is **phase 1 (contract)** of the second-iteration scene-first plan — see `specs/IMPLEMENTATION-ORDER.md`; SPEC-95..99 build the index/backend/frontend/search/MCP/docs on this contract.
**Source:** critical triage of `reports/scene-prose-planning-second-iteration.md` (ChatGPT-Pro, 2026-05-28) — the SCN-status defect at report §3 ("SCN exists, but its status model is suspect") + §10 ("SCN schema"), executive-verdict item 4; routed to this spec by the triage manifest `docs/triage/2026-05-28-scene-prose-second-iteration-triage.md` (Accepted row 1). The report's broader scene-first Story Explorer redesign **lands across sibling SPEC-95..99 this iteration** (it was deferred in the *first* iteration); this spec is the contract-first piece those build on. The report's `SCN.status` hash-fingerprint and publication-profile proposals are rejected — see §1 and §7. This spec settles only the verified, contract-level SCN.status defect.

---

## 1. Context & Motivation

`SCN` (story-record-schemas.md §4.5.20) is defined as a **render-unit membership record over committed `PG` records** — "not a causal-state record and not a narrative-shape record." Its own schema note states range/status changes flow through the patch engine's append-only supersession path, and that it "must not carry … a source-PG fingerprint field … or prose byte hashes."

The `status` field contradicts that role:

- **The enum has unreachable values.** `status: planned | rendered | attached` is marked required, but `branching-story-scene-plan` writes `planned` on **every** create *and* every refresh/supersede (SKILL.md Phase 2 / L138–139), and `branching-story-scene-prose-attach` is contractually forbidden from mutating `SCN` (SKILL.md L3/L25/L202–203 — it writes only the scene-prose receipt). **No workflow path writes `rendered` or `attached`.** Those two enum members are dead. In practice `SCN.status` is permanently `planned`.
- **A permanently-`planned` field actively misleads its consumers.** It is consumed by (a) INDEX rendering (scene-plan SKILL.md L237, "Update `INDEX.md` with the scene row/status"), which therefore displays every rendered, attached, passing scene as still "planned"; and (b) `previous_scene_id` resolution (scene-plan SKILL.md L111, "choosing the latest **attached**/planned scene"), which references a state that can never be reached, so the "attached" disjunct is inert.
- **It is a stale source of truth by construction.** Publication state (does prose exist? does a receipt exist? did the receipt pass?) is a function of **artifact presence and the receipt verdict**, all of which change out-of-band of the append-only `SCN` record. Encoding a snapshot of that volatile state inside an append-only membership record is precisely the stale-truth anti-pattern the architecture avoids: prose is non-authoritative and is *derived from* committed state, never a second state surface.

The fix is to stop storing publication status on `SCN` and instead **derive** a lightweight publication indicator at read time from artifact presence plus the receipt verdict. Because there are currently **zero `SCN` records anywhere in the repository** (verified: 0 `_source/scenes/*.yaml`, 0 story bundles with content), the change is **migration-free** — no grandfathering clause is required (contrast SPEC-93 §3, which had to grandfather existing `PG` records).

### What this spec deliberately does NOT do (rejected report proposals)

- **No hash/freshness fingerprints** on `SCN`, scene plans, scene prose, or receipts (report §10 "freshness fingerprints: SCN record hash, plan hash, prose hash"). This is hash coupling on editable artifacts, which the author has rejected ([[feedback_author_rejects_hash_coupling]]) and which SPEC-93 §8 removed for `PG`. The receipt's existing advisory `included_pages[].state_hash_at_attach` (a copy of committed `PG.state_hash`, i.e. **causal** state provenance, not a prose/plan byte hash) is retained unchanged.
- **No 8-state `ScenePublicationState` machine and no dedicated view-model** (report §10 enumerates `missing_plan | planned | prose_present_no_receipt | attached_pass | attached_warn | attached_fail | stale_receipt | superseded`). Its only consumer is the deferred scene-first Story Explorer (YAGNI). The live consumers need a minimal derived label only.
- **No changes to the scene-plan verbatim-section contract** (report §10/§13 "stop permanently inlining … use canonical contract references with version/hash"). Verbatim §2/§3/§render-time inlining is operationally load-bearing — the external renderer has no cross-plan state ([[feedback_page_plan_verbatim_sections]]) — and was explicitly preserved by SPEC-93 §64.

## 2. Scope

### In scope

1. **`SCN` schema (`story-record-schemas.md §4.5.20`):** remove the `status` field. Add a one-line note that scene publication state is **derived at read time** from scene-artifact presence (`prose_path` / `receipt_path` files) plus the scene-prose receipt `verdict`, and is never stored on the append-only `SCN`.
2. **`story-scene.schema.json`:** remove `"status"` from `required[]` and remove the `status` property/enum. The schema is `additionalProperties: false` (verified), so removing the property is sufficient: a stray `status` field on any `SCN` is then rejected at validation — no separate guard clause is needed (see §6).
3. **`branching-story-scene-plan`:** stop writing `status` into the `SCN` draft (Phase 2, L56; record draft L138–139). Reword the `previous_scene_id` resolution (L111) to choose the adjacent prior scene by **branch path + `end_page_id` adjacency on the same `branch_id`, excluding superseded `SCN`s** (per `supersedes`/supersession), with no reference to a publication status — consistent with the report's own observation that the previous pointer is "a convenience, not authority." Reword the INDEX update (L237) to render a **derived** publication indicator (see §3) rather than the `SCN.status` value.
4. **`branching-story-scene-prose-attach`:** remove the L107 abort precondition that checks `SCN.status` is one of `planned | rendered | attached` (the field is gone). Replace it with the still-valid preconditions that already gate attach: the `SCN` exists, is the latest non-superseded record for its id lineage, and its scene plan + prose pair are present. Attach continues to write only the receipt + INDEX (unchanged).
5. **Derived publication indicator (read-time helper):** define the minimal derivation used by INDEX rendering (and available to future read surfaces) in the shared contract — see §3. This is documentation + skill prose, not a new code surface; no validator, no patch op, no schema field.
6. **Contract & doc reconciliation:** update any live `.claude/skills/_shared-templates/story-state-contract.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/prose-renderer-contract/README.md`, and `docs/FOUNDATIONS.md` references that describe `SCN.status` as a stored publication field (enumerate via the §6 sweep).

### Out of scope (and where it lives / why)

- **Scene-first Story Explorer** (report §6–9, §14): dashboard, timeline, scene/unscened detail, x-ray, search, branch map → **SPEC-96/97/98** (sibling specs this iteration). This spec must NOT introduce a `ScenePublicationState` view-model — the explorer consumes the presence-based indicator (§3) via SPEC-95's coverage view, not a stored field.
- **World-index scene-coverage derived layer + MCP/context-packet scene surfaces** (report §13): **SPEC-95** (coverage layer) and **SPEC-99** (MCP packet) — they consume this spec's derived-indicator definition.
- **Removing `pages-prose*` from world-index inventory / retiring shared-schema §4.6 legacy receipt** (report §11, §13): **SPEC-95**, landed coherently with the explorer's page-prose-route removal (SPEC-96).
- **Renaming surviving PG causal validators** (`page-plan-turn-driver-consistency`, `page-affordance-integrity`, `page-plan-active-pressure`) away from "page-plan" vocabulary (report §13/§16): cosmetic, deferred.
- **SPEC-90 removal:** handled separately by the user this iteration; not part of this spec.
- **Hash/freshness fingerprints, publication profiles, verbatim-contract externalization:** rejected (see §1).
- **Any change to scene-range validators, the SE/PG/CHC engine, or the `state_hash` chain:** untouched.

## 3. Derived publication indicator

Read surfaces (INDEX rendering today; future explorer later) compute a scene's publication state with **no stored field and no hashing**, from facts already on disk:

| Indicator | Derivation (read-time) |
| --- | --- |
| `planned` | `prose_path` file absent. |
| `prose-present` | `prose_path` file present, `receipt_path` file absent. |
| `attached:PASS` / `attached:WARN` / `attached:FAIL` | `receipt_path` present; label carries the receipt's `verdict`. |
| `superseded` | the `SCN` is named in another `SCN`'s `supersedes` (i.e. not the latest in its lineage). |

This is presentational only. It is not a schema field, not validated, and not authoritative for any state turn. It deliberately omits any "stale" / freshness state, because detecting staleness would require hashing editable artifacts (rejected). If a scene plan or prose is later hand-edited, the indicator simply reflects current file presence + the last receipt verdict — which is the correct, coupling-free behavior for freely-editable artifacts.

## 4. Migration & grandfathering

None required. Verified: 0 `_source/scenes/*.yaml` records and 0 story bundles with content exist in the repository. No `SCN` record carries a `status` field that would need rewriting, and no INDEX currently renders one. (If any `SCN` is created between this spec's authoring and its implementation, it is append-only and would carry `status: planned` only; the implementation's schema change removes the field from new records, and the read-time indicator ignores a stray legacy `status` if present.)

## 5. Key decision: remove `status` (Option A) vs. redefine it (Option B)

- **Option A (recommended, this spec):** remove `status`; derive the indicator at read time. Most aligned with the §4.5.20 stated role ("membership record … must not carry [volatile/derived] fields") and with the architecture's derive-don't-store discipline. Zero unreachable enum members.
- **Option B (considered, not chosen):** keep `status` but change its enum from the publication values `planned | rendered | attached` to a **reachable** membership-lifecycle enum `active | superseded` (matching the SREL/`status: active | superseded | retired` convention at story-record-schemas.md L910), reachable via `supersede_scn_record`. Rejected as the primary fix because (a) publication state would *still* need read-time derivation (so the field saves nothing), and (b) supersession is already derivable from the `supersedes` pointer, making a parallel `status` field redundant. Option B is recorded here so a reviewer who prefers an explicit membership-lifecycle field can adopt it without re-deriving the trade-off; if chosen, §2 items 1–4 change to *redefine* rather than *remove* the enum, and §3's `superseded` row reads the field instead of the pointer.

## 6. Files to touch

(Source + colocated tests/fixtures follow each. Markdown skills/docs have no build step.)

- `.claude/skills/_shared-templates/story-record-schemas.md` — §4.5.20 (heading at L926): remove the `status` line (L933); add derived-publication note. Also reconcile the role note (L949) "**Range/status** changes use the patch engine's append-only supersession path" → "**Range** changes use…" (only the range can change now that status is gone).
- `.claude/skills/_shared-templates/story-state-contract.md` — reconcile any `SCN.status` references.
- `tools/validators/src/schemas/story-scene.schema.json` — remove `status` from `required[]` (L9) and the `status` property/enum (L27); confirm `additionalProperties` semantics.
- `tools/validators/` colocated tests/fixtures that assert `SCN.status` — update to assert its absence. The specific sites (each constructs an `SCN` with a `status` value, which `additionalProperties: false` will reject once the property is removed): `tests/structural/record-schema-compliance-story-scene.test.ts` (L19 `status: "planned"` **and L57 `parsed.status = "rendered"`** — L57 currently asserts a `rendered` SCN *validates*; it must be inverted to assert a stray `status` is *rejected*), `tests/structural/scene-range-integrity.test.ts` (L71), `tests/integration/spec92-scene-layer-capstone.test.ts` (L167 `"attached"`), `tests/structural/scene-prose-receipt-content.test.ts` (L110 `"attached"`, L135 `"forbidden"` negative case), `tests/structural/contract-schema-roundtrip.test.ts` (L217). Running `npm test` after the edits is the acceptance gate for this set.
- `tools/world-index` and `tools/world-mcp` SCN YAML test fixtures carry a now-removed `status: planned` line — `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (L110), `tools/world-mcp/tests/tools/list-records.test.ts` (L344), `tools/world-mcp/tests/server/dispatch.test.ts` (L370). Neither package schema-validates `SCN` (parse/retrieve only), so these do **not** break; drop the `status` line for contract hygiene. Note: the §6 completeness sweep below is scoped to `src` directories and deliberately excludes `tests/` — test fixtures are reconciled here and confirmed by running each package's suite, not by the sweep.
- `.claude/skills/branching-story-scene-plan/SKILL.md` — frontmatter `existing_scene_id` arg description (L19, "refreshing an existing scene range/status" → "…scene range"); Phase 2 (L56), SCN draft (L138–139): drop `status`; `previous_scene_id` (L111): reword to branch-path/end-page adjacency + supersession; INDEX (L237): derived indicator.
- `.claude/skills/branching-story-scene-prose-attach/SKILL.md` — L107 precondition: replace `status` check with existence/latest-non-superseded check.
- `.claude/skills/branching-story-scene-prose-attach/references/receipt-checks.md`, `references/write-and-validation.md` — reconcile any `scn_status`/SCN-status mention.
- `.claude/skills/branching-story-health-audit/SKILL.md` — reconcile any scene-status check.
- `docs/MACHINE-FACING-LAYER.md`, `docs/prose-renderer-contract/README.md`, `docs/FOUNDATIONS.md` — reconcile any `SCN.status` description.

**Completeness sweep (run before drafting acceptance criteria; re-run as an acceptance gate):**

```
grep -rn "planned | rendered | attached\|scn_status\|SCN\.status\|SCN status\|scene.*status" \
  .claude/skills/ docs/ tools/validators/src tools/world-index/src tools/world-mcp/src \
  | grep -v "archive/"
```

Triage each hit: SCN-publication-status references are in scope; entity/story/clock/thread `status` fields (STSTAT, STQ, CLK, etc.) and the STSTAT `status` directory mapping are **not** and must be left untouched.

## 7. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| Append-only `_source/` records; mutation only via supersession (FOUNDATIONS Core Rules; story-record-schemas §4.5.20) | **aligns** | Removing a field that can only ever hold one reachable value (`planned`) from the append-only `SCN` record (schema surface) eliminates a stored field masquerading as mutable workflow state. |
| Rendered prose is non-authoritative and derived from committed state, never a second state engine (story-state-contract §1; SPEC-92) | **aligns** | Publication state becomes a read-time projection of artifact presence + receipt verdict (read-surface/skill-prose surface), never stored, never a state input. |
| No prose/plan byte-hash coupling on editable artifacts ([[feedback_author_rejects_hash_coupling]]; SPEC-93 §8) | **aligns** | The derived indicator (§3) uses file presence + receipt verdict only; the spec explicitly rejects the report's hash-fingerprint proposal at the schema + receipt surfaces. |
| Verbatim render-contract inlining is load-bearing for the stateless external renderer ([[feedback_page_plan_verbatim_sections]]; SPEC-93 §64) | **aligns** | The spec explicitly excludes the report's verbatim-externalization proposal; the scene-plan verbatim contract surface is untouched. |
| YAGNI — surface elements need a named live consumer (CLAUDE.md / brainstorm guardrails) | **aligns** | The 8-state machine and `ScenePublicationState` view-model are excluded because their only consumer (the scene-first explorer, runtime-selection surface) is deferred; the live INDEX-render surface gets a minimal indicator only. |
| `SCN` is a render-membership record, not a narrative-shape record (story-record-schemas §4.5.20; `scn_no_narrative_shape_language` validator) | **N/A (not violated)** | No narrative-shape or arc field is added or removed; the validator-gate surface is untouched. Listed defensively because the change edits the same record. |

## 8. Build & test

- `tools/validators`: `npm run build && npm test` (after editing `story-scene.schema.json` and its tests/fixtures).
- `tools/world-index`: `npm run build && npm test` — regression only; verify `SCN` enumeration (parsed by id pattern `^SCN-[0-9]+$` + scene edges, not by `status`) is unaffected.
- `tools/world-mcp`: `npm run build && npm test` — regression only; world-mcp retrieves SCN records through the index without schema-validating them, so the change is non-breaking. Run after dropping the stale `status: planned` fixture lines (§6) so the fixtures match the post-change contract.
- Skills/docs are markdown — no build; verify by the §6 sweep returning only intentional, out-of-scope `status` hits.

## 9. Acceptance criteria

1. `SCN` schema (`story-record-schemas.md §4.5.20`) no longer lists a `status` field and documents read-time derivation of publication state.
2. `story-scene.schema.json` does not require or define `status`; `tools/validators` build + tests pass; a fixture/test asserts an `SCN` without `status` validates and one *with* a stray `status` is rejected (the schema's existing `additionalProperties: false` makes the rejection automatic).
3. `branching-story-scene-plan` writes no `status` on create or refresh; `previous_scene_id` resolution references branch-path/end-page adjacency + supersession, with no publication-status disjunct; INDEX rendering uses the derived indicator (§3).
4. `branching-story-scene-prose-attach` has no precondition that reads `SCN.status`; attach still writes only the receipt + INDEX and mutates no `_source` record.
5. The §6 completeness sweep returns **zero** in-scope `SCN`-publication-status references outside `archive/` (entity/story/clock/thread `status` hits explicitly excluded and documented).
6. No hash/freshness fingerprint field is added to `SCN`, scene plans, scene prose, or the receipt; the receipt's `included_pages[].state_hash_at_attach` is unchanged.
7. `tools/world-index` build + tests pass with `SCN` enumeration unaffected.
8. No scene-range validator, SE/PG/CHC engine surface, or `state_hash` chain behavior is changed.

## 10. Risks & Open Questions

- **Option A vs Option B (open for reviewer preference).** This spec implements Option A (remove `status`; derive at read time). A reviewer who prefers an explicit membership-lifecycle field may adopt Option B (`active | superseded`) per §5 without re-deriving the trade-off; if chosen, §2 items 1–4 change from *remove* to *redefine* and §3's `superseded` row reads the field instead of the `supersedes` pointer. Recommendation stands at Option A (the pointer already makes supersession derivable).
- **Stray legacy `status` is tolerated, not migrated.** Per §4, no `SCN` records exist, so the change is migration-free. If an `SCN` is created with `status: planned` between authoring and implementation, the schema change rejects the field on re-validation and the read-time indicator ignores any stray value — there is no grandfathering clause and none is needed.
- **Test fixtures, not the src sweep, gate the validator change.** The §6 completeness sweep is `src`-scoped; the validator test/fixture updates (§6) and a passing `npm test` are the actual gate for the schema removal. The `world-index` / `world-mcp` fixture `status` lines are non-breaking hygiene, not correctness blockers.
