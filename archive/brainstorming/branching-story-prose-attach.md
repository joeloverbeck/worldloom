# branching-story-prose-attach

## Purpose

Validate and attach external rendered prose to an already-committed page in a branching-story bundle. The skill consumes the page's comprehensive prose plan (`pages-prose-plans/PG-NNNN.md`) plus the user-supplied rendered prose (`pages-prose/PG-NNNN.md`), runs deterministic checks plus an optional craft critic, and emits a structured prose receipt (`pages-prose-receipts/PG-NNNN.yaml`) recording the verdict.

**Prose-attach does NOT make a page real.** The page was made real by `branching-story-bootstrap` (PG-0001) or `branching-story-turn-cycle` (PG-NNNN, N>1) at page-plan commit per FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary). Prose-attach only creates the receipt and updates the bundle index. It does NOT mutate the `PG` record, does NOT create an `ARC_TRACE` record (the class is gone per the greenfield plan), and does NOT emit a state-changing `SE` event by default.

Prose-attach is the third skill in the rebuilt story-skill family per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`. The receipt schema is canonical at `.claude/skills/_shared-templates/story-state-contract.md` §4.5.

## Inputs

Required:

- `world_slug` — existing world directory slug under `worlds/`.
- `story_slug` — existing story bundle slug under `worlds/<world_slug>/stories/`.
- `page_id` — `PG-NNNN` whose plan + prose pair is being validated.

Optional:

- `strict` — `true | false`. Default: `false`. When `true`, a `FAIL` verdict blocks the page's publication marker in the bundle `INDEX.md`; receipt is still written.
- `run_craft_critic` — `true | false`. Default: `false`. When `true`, runs an LLM-based qualitative craft critic over the prose; verdict contributes to the receipt's `craft_critic` field.
- `accept_plan_drift` — `true | false`. Default: `false`. When `false`, a mismatch between the page's recorded `plan_hash` / `state_hash` and the freshly-computed hashes fails the receipt; when `true`, the drift is recorded in the receipt's `notes` field without forcing a fail.
- `emit_attach_event` — `true | false`. Default: `false`. When `true`, emit one `SE-NNNN` record with `event_kind: prose_attach` for the bundle's story event log; this is the ONLY way prose-attach mutates atomic story-bundle records, and it is opt-in.

## Output Bundle

Direct-write artifacts (no patch-engine submission by default):

- `worlds/<world_slug>/stories/<story_slug>/pages-prose-receipts/PG-NNNN.yaml` — the prose receipt (per shared contract §4.5 schema).
- `worlds/<world_slug>/stories/<story_slug>/INDEX.md` — bundle index updated to reflect the prose attach status (rendered + verdict).
- `worlds/<world_slug>/stories/<story_slug>/pages-prose-receipts/` directory — created on first-run if absent.

Optional patch-engine submission:

- `worlds/<world_slug>/stories/<story_slug>/_source/events/SE-NNNN.yaml` with `event_kind: prose_attach` — only when `emit_attach_event: true`. The SE event records the attach for downstream audit but does NOT alter the page's state.

## Pre-Flight

1. **Load FOUNDATIONS** — `docs/FOUNDATIONS.md`. The §Story Bundles §4a (Plan-Authority Boundary), §5b (Schema-Minimalism), and §9 (Prose Length Discipline) govern this skill.
2. **Load the shared contract** — `.claude/skills/_shared-templates/story-state-contract.md`. §4.5 prose receipt schema, §7 hard gates (mystery firewall — gate 3 — applies redundantly here as a prose-time check), §8 page plan minimum contract (the 19-section structure prose-attach validates against).
3. **Resolve the bundle** — `worlds/<world_slug>/stories/<story_slug>/` must exist. Abort with bundle-not-found error otherwise.
4. **Resolve the page** — `_source/pages/<page_id>.yaml` must exist; load it. Abort with page-not-found error otherwise.
5. **Verify the required artifact pair**:
   - `pages-prose-plans/<page_id>.md` must exist (the comprehensive prose plan; was written by bootstrap or turn-cycle).
   - `pages-prose/<page_id>.md` must exist (the user-supplied rendered prose).
   - Abort with missing-artifact error if either is absent.
6. **Create `pages-prose-receipts/` directory** if absent (first-run idempotent `mkdir -p`).
7. **Allocate id** for the optional `SE` event via `mcp__worldloom__allocate_next_id(world_slug, 'SE', story_slug=<story_slug>)` only when `emit_attach_event: true`. Skip otherwise — receipt writes do not need ID allocation.
8. **HARD-GATE deferral** — the HARD-GATE fires at Phase 6 (Commit / Write) AFTER the receipt is drafted in working memory. The user reviews the receipt verdict + checks summary before any write.

## Phases

### Phase 1: Pair plan, page, and prose

Load into working memory:

- The `PG-<page_id>` record from `_source/pages/<page_id>.yaml`.
- The page plan body from `pages-prose-plans/<page_id>.md` (all 19 sections per shared contract §8).
- The rendered prose body from `pages-prose/<page_id>.md`.
- The forbidden-mystery list from the plan's §11 frontmatter (`forbidden_resolutions[]`).
- The plan's §4 (world-canon excerpts) — the prose-attach reference for canon-claim-without-authority checks.
- The plan's §7 (selected event + state delta) and §8 (required beats) — for required-event-rendered and beat-coverage checks.
- The plan's §5 (active cast + entity statuses) — for entity-status-consistency checks.
- The `PG.state_snapshot.active_records` — the working state the prose must reflect.
- If `run_craft_critic: true`, optional prior 1–2 branch prose pages from `pages-prose/<recent>.md` for continuity checks.
- The recorded `plan.plan_hash` from the `PG` record + the recorded `state_hash` from the `PG` record.

Compute fresh hashes:

- `computed_plan_hash`: sha256 over the plan file's bytes.
- `computed_prose_hash`: sha256 over the prose file's bytes.

### Phase 2: Hash drift check

Compare:

- `PG.plan.plan_hash` vs `computed_plan_hash`.
- `PG.state_hash` vs `computed_state_hash` (if the skill recomputes state hash; alternatively, trust `PG.state_hash` as the at-commit value).

If either differs AND `accept_plan_drift: false`: record the drift in the receipt's `notes` field and fail the receipt early (verdict: `FAIL`, repair_recommendation: `revise_prose`).

If either differs AND `accept_plan_drift: true`: record the drift in `notes` but continue to Phase 3.

If both match: continue silently to Phase 3.

**Drift is recorded in the receipt, NOT in the `PG` record.** The PG is committed state and is not mutated by prose-attach.

### Phase 3: Deterministic checks

Run the six deterministic checks defined in the shared contract §4.5 receipt schema, each producing `PASS | WARN | FAIL` (or `PASS | FAIL` where the schema names only two states):

1. **engine_jargon_leak** (`PASS | WARN | FAIL`) — scan the prose for engine-vocabulary tokens (record IDs like `PG-NNNN`, `SE-NNNN`, `BEL-NNNN`, gate names, predicate-DSL terms, frontmatter field names). Hits are `WARN` if isolated; `FAIL` if pervasive. The closed engine-vocabulary list is maintained at `.claude/skills/_shared-templates/clothing-consistency-vocabulary.md`-style discipline (a separate vocabulary file may be authored under `_shared-templates/` if the closed list grows; for now, an inline list within the skill body is acceptable).
2. **forbidden_mystery_resolution** (`PASS | FAIL`) — scan the prose for surface-level resolutions of any mystery in the plan's §11 `forbidden_resolutions[]`. Use deterministic regex over the mystery's `denial_patterns` (or equivalent) defined in the world's Mystery Reserve. Any hit is `FAIL`.
3. **required_event_rendered** (`PASS | WARN | FAIL`) — the plan's §7 names the selected event; the prose must dramatize it. If the event is implied but ambiguous, `WARN`; if absent, `FAIL`.
4. **entity_status_consistency** (`PASS | WARN | FAIL`) — the plan's §5 enumerates active cast + entity statuses (life, agency, location). The prose must not contradict — e.g., a dead character speaking, an incapacitated character acting, a character in location X appearing in location Y mid-page without a transition beat.
5. **invented_structural_fact** (`PASS | WARN | FAIL`) — scan the prose for statements that would introduce a structural fact not present in the plan's §4 (canon excerpts), §5 (cast statuses), §7 (selected event), or `PG.state_snapshot`. Inventions that are decorative (a new minor object name, an unmentioned weather detail) are `WARN`; inventions that would change cast capability / location / faction-alignment are `FAIL`.
6. **canon_claim_without_authority** (`PASS | FAIL`) — scan the prose for assertions that would make a world-level canon claim (e.g., "the war ended in 1247" when the plan's §4 lists the war date as Mystery Reserve, or "magic is fundamentally entropic" when the plan's §4 lists no such claim). Any such assertion without corresponding `PG.SE.promotion_claims[]` evidence is `FAIL`.

### Phase 4: Optional craft critic

If `run_craft_critic: true`, run a qualitative critic over the prose. Produce a `PASS | WARN | FAIL` verdict on the `craft_critic` receipt field, with per-axis findings recorded in the receipt's `notes`:

- **Point-of-view stability** — does the POV stay close to the plan's §15 frontmatter POV declaration?
- **Sensory grounding** — does the prose anchor in concrete sensory detail rather than abstraction?
- **Character interiority** — does the prose surface the active cast's interior states (per `STENT.entity_status` + `STINT` + `BEL`)?
- **Rhythm / repetition** — does the prose vary sentence rhythm and avoid mechanical repetition?
- **Dialogue clarity** — does dialogue advance the scene and stay legible per speaker?
- **Continuity with recent prose** — if prior 1–2 pages of rendered prose are available, does this page maintain tonal continuity?
- **Choice handling** — does the prose stop at the commitment hinge named in the plan's §12 without over-explaining or hiding the emitted choices?

The craft critic does NOT mutate story state — it only contributes to the receipt's verdict.

If `run_craft_critic: false`, set `checks.craft_critic: NOT_RUN`.

### Phase 5: Compute verdict + repair_recommendation

Roll up the per-check verdicts to the top-level verdict:

- Any `FAIL` → `verdict: FAIL`.
- Otherwise any `WARN` → `verdict: WARN`.
- Otherwise → `verdict: PASS`.

Derive `repair_recommendation`:

- `verdict: PASS` → `none`.
- `verdict: WARN` only (no `FAIL`) → `revise_prose` (the prose is salvageable through revision; the structural state is intact).
- `verdict: FAIL` with `invented_structural_fact: FAIL` or `entity_status_consistency: FAIL` → `run_turn_cycle_repair` (the prose names structural state the bundle does not have; a repair turn is needed to add the supporting state OR the prose must be revised).
- `verdict: FAIL` with `canon_claim_without_authority: FAIL` → `run_story_fact_promotion_to_canon` (the prose asserts world-level canon; either promote the claim through the lawful path or revise the prose).
- `verdict: FAIL` with `forbidden_mystery_resolution: FAIL` → `revise_prose` (forbidden mysteries cannot be resolved by any path — the prose must be rewritten; this is the firewall's primary backstop on rendered text).

### Phase 6: Commit / Write — HARD-GATE fires

1. Draft the receipt YAML per shared contract §4.5:

   ```yaml
   page_id: <page_id>
   story_id: <story_id>
   plan_path: pages-prose-plans/<page_id>.md
   prose_path: pages-prose/<page_id>.md
   plan_hash: <computed_plan_hash>
   prose_hash: <computed_prose_hash>
   state_hash_at_plan_time: <PG.state_hash>
   checked_at: <iso8601 now>
   strict: <input strict flag>
   verdict: PASS | WARN | FAIL
   checks:
     engine_jargon_leak: ...
     forbidden_mystery_resolution: ...
     required_event_rendered: ...
     entity_status_consistency: ...
     invented_structural_fact: ...
     canon_claim_without_authority: ...
     craft_critic: ... | NOT_RUN
   notes: [<per-finding short string>]
   repair_recommendation: none | revise_prose | run_turn_cycle_repair | run_story_fact_promotion_to_canon
   ```

2. Present the deliverable summary to the user:
   - Page path + receipt path.
   - Per-check verdict table (6 deterministic checks + craft critic if run).
   - Roll-up verdict + `repair_recommendation`.
   - Strict-mode publication-blocking decision: if `strict: true` and `verdict: FAIL`, the bundle `INDEX.md` will mark the page as "rendered (FAILED receipt — publication blocked)"; otherwise as "rendered" with a warning glyph on `WARN` / `FAIL`.
   - If `emit_attach_event: true`, name the new `SE-NNNN` id and the patch op that will be submitted.

3. **HARD-GATE fires** — wait for explicit user approval.

4. On approval:
   - Write the receipt YAML to `pages-prose-receipts/<page_id>.yaml` (direct write; not patch-engine routed since the receipt is not a `_source/` record).
   - Update the bundle `INDEX.md` to reflect the page's prose status + receipt verdict.
   - If `emit_attach_event: true`, submit a patch plan with a single `create_se_record` op for the `prose_attach` event.

5. Report the receipt path + verdict to the user. Do NOT `git commit`.

**Failure behavior**: receipt-write fail (filesystem error) → surface to user with a one-paragraph diagnostic. INDEX.md update fail → receipt is already authoritative; the index can be repaired directly. `emit_attach_event` patch fail → receipt is still written and authoritative; the SE event is the audit-trail extra, not the verdict carrier.

## Validation Rules This Skill Upholds

- **Rule 7 (Preserve Mystery Deliberately)** — enforced at Phase 3 check 2 (`forbidden_mystery_resolution`). Mechanism: deterministic scan of the prose against the plan's §11 `forbidden_resolutions[]`; any hit is `FAIL`, locking publication when `strict: true`.

Rules 1 / 4 / 5 are upstream of prose-attach — they are enforced at page-plan commit by bootstrap and turn-cycle. Prose-attach is a downstream validator over rendered prose; its job is to confirm the prose respects the state, not to enforce state shape.

## What Is Intentionally NOT in This Skill

- No `PG` record mutation. The page snapshot is committed state per FOUNDATIONS §Story Bundles §4a; prose-attach never writes to `PG`.
- No `prose_status` field updates (the field never existed per the greenfield plan).
- No `ARC_TRACE` record emission (the class is removed per the greenfield plan).
- No deferred-gate resolution from bootstrap or turn-cycle (those skills validate at page-plan commit; prose-attach is a parallel-but-independent validator over rendered prose).
- No mode-dependent state mutation. `strict: true` blocks the INDEX publication marker; it does NOT alter the receipt's verdict, the PG record, or the patch-engine surface.
- No silent acceptance of prose inventions. Every structural-fact invention is routed through `repair_recommendation` to one of three lawful repair paths: revise prose, run a turn-cycle repair, or run promotion.
- No word-count enforcement (per FOUNDATIONS §Story Bundles §9). The craft critic axes are qualitative; word counts do not appear.

## References

- `.claude/skills/_shared-templates/story-state-contract.md` — §4.5 prose receipt schema (canonical); §7 hard gates (gate 3 mystery firewall, redundantly enforced here on rendered prose); §8 page plan minimum contract (the 19-section structure prose-attach reads).
- `docs/FOUNDATIONS.md` — §Story Bundles §4a (Plan-Authority Boundary), §5b (Schema-Minimalism), §9 (Prose Length Discipline) govern this skill.
- `reports/streamlined-story-pipelines/04-branching-story-prose-attach.md` — streamlined-pipeline source report.
- `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` §C.3 — blueprint summary.
- Upstream sibling skills:
  - `.claude/skills/branching-story-bootstrap/SKILL.md` — produces the root `PG-0001` and its `pages-prose-plans/PG-0001.md` plan.
  - `.claude/skills/branching-story-turn-cycle/SKILL.md` — produces `PG-NNNN` (N>1) and per-turn `pages-prose-plans/PG-NNNN.md` plans.
- Downstream sibling skills (future, not yet shipping):
  - `branching-story-health-audit` — `mode: prose` consumes prose receipts to check publication readiness. Schema parity is achieved via the shared contract §4.5 reference.
  - `story-fact-promotion-to-canon` — invoked separately by the user when `repair_recommendation: run_story_fact_promotion_to_canon` fires.

## Open decisions (deferrable)

None blocking. Optional features that may be deferred:

- A separate `_shared-templates/engine-vocabulary.md` closed-list for the `engine_jargon_leak` check. Currently the closed list can live inline in the skill body; a separate template makes sense if the list grows beyond ~30 tokens or if multiple skills consume it.
- A craft-critic axis taxonomy promoted to its own reference doc. Currently the 7 axes are listed inline; if they grow beyond 10 or want per-axis scoring rubrics, they may extract to `.claude/skills/branching-story-prose-attach/references/craft-critic-axes.md`.
