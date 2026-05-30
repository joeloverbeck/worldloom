# CBAUTH-012: Disambiguate the `dominant_action_families >= 40% threshold` denominator in pre-flight step 4(iii).4

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` (no validator, tool, hook, schema, or new patch-op surface)
**Deps**: CBAUTH-007 (defines the moment_signature shape this ticket clarifies)

## Problem

Pre-flight step 4(iii).4 (CBAUTH-007) computes the `forward_affordance_fingerprint.action_family_distribution` from the latest committed PG's just-emitted CHCs, then derives `dominant_action_families (>= 40% threshold)`. The threshold's **denominator is not explicitly stated** in the body prose; the working-memory shape's comment narrows it to `# >= 40% of CHC.action_families[] entries`, which is grammatically ambiguous in two ways:

- **Reading A** (pooled-entries denominator): "≥ 40% of the entries in the (pooled across all CHCs) `action_families[]` array". For PG-8's 5 CHCs containing a total of 14 action_family entries, 40% = 5.6 entries; no single family reaches that count, so `dominant_action_families: []` — a degenerate empty set.
- **Reading B** (per-CHC presence ratio): "≥ 40% of the CHC.action_families[] entries that contain the family", which most naturally reads as "≥ 40% of CHCs contain the family". For PG-8 that gives `communicate: 3/5=60%, protect: 3/5=60%, wait: 2/5=40%, bond: 2/5=40%` → `[communicate, protect, wait, bond]` — a useful four-family dominant set.

Observed on the 2026-05-30 red-bunny SLB-5 run: the operator picked Reading B for operational usefulness; Reading A under the same evidence yields the empty set and Pass B step 3 (which walks `dominant_action_family` × `active_high_salience_records` for moment-fit lanes) degenerates to a no-op. Two operators reading the spec strictly would produce different `dominant_action_families` sets, breaking the determinism property the moment_signature is supposed to provide.

The Pass B step 3 procedure explicitly consumes `dominant_action_family`: "For each `dominant_action_family` in `forward_affordance_fingerprint`, check pool SLTs whose `exit_options[].action_family` includes that family AND whose hard preconditions intersect the `active_high_salience_records` set." A degenerate-empty `dominant_action_families` silently disables Pass B step 3, so the threshold ambiguity is a determinism gap with downstream Pass B consequences.

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` step 4(iii).4 body (lines ~65-68) reads "compute `action_family_distribution` from `CHC.action_families[]`; compute `dominant_action_families` (>= 40% threshold) and `outlier_action_families`". Verified by direct Read this session. The body does not name the denominator.
2. The same file's working-memory shape (lines ~106-107) comments `dominant_action_families: [<action_family>, ...]   # >= 40% of CHC.action_families[] entries`. The comment is the closest the spec comes to specifying the denominator but is itself ambiguous between Reading A and Reading B.
3. Shared boundary under audit: the moment_signature → Pass B step 3 dataflow. Pass B step 3 ("For each `dominant_action_family` in `forward_affordance_fingerprint`...") at `phase-1-coverage-diagnosis.md` consumes `dominant_action_families` verbatim. A determinism gap at the producer site (4(iii).4) is also a determinism gap at the consumer site (Pass B step 3 emits or fails to emit lanes based on which reading the operator used).
4. FOUNDATIONS principle under audit: §Story Bundles §5c (Driver salience is local; the moment-signature is shape extraction, not a global drama manager). Determinism is the load-bearing property: two operators on the same parent_page must produce the same `dominant_action_families` set. Currently they would not.
5. Adjacent contradiction classification: this ticket clarifies a CBAUTH-007 ambiguity. Required-consequence follow-up to CBAUTH-007; not a separate bug uncovered in unrelated scope.
6. Out-of-scope creep guard: this ticket picks a single canonical reading (Reading B — per-CHC presence ratio) and documents it. It does NOT alter the working-memory shape's field name, the `forward_affordance_fingerprint` block structure, the consumption site at Pass B step 3, or the CHCs the step reads. The pick is operationally validated by the 2026-05-30 SLB-5 run.

## Architecture Check

1. Cleaner than alternatives: picking the per-CHC-presence-ratio reading (Reading B) and naming it explicitly in both the body prose and the working-memory shape comment is the minimum-blast-radius fix. The alternative — switching to pooled-entries denominator (Reading A) — is operationally degenerate for typical 5-CHC pages where action_family lists vary in length and no single family dominates ≥ 40% of pooled entries; Pass B step 3 would silently no-op on the common case. The alternative — leaving the spec ambiguous — perpetuates the determinism gap.
2. No backwards-compatibility aliasing/shims introduced: the moment_signature working-memory shape is consumed only within the skill's own Phase 1 flow (verified at CBAUTH-008 Assumption Reassessment item 6). No persisted record carries the value; no downstream consumer outside this skill reads it. The fix is a prose clarification, not a schema change.

## Verification Layers

1. Invariant: pre-flight step 4(iii).4 body prose names the denominator explicitly → codebase grep-proof (`pre-flight-and-prerequisites.md` step 4(iii).4 body contains a sentence like "`dominant_action_families` = families that appear in ≥ 40% of the parent page's CHCs (i.e., the family is present in `CHC.action_families[]` for at least `ceil(0.4 * len(parent_page_choices))` CHCs)").
2. Invariant: the working-memory shape comment matches the body prose → codebase grep-proof (the shape comment is rewritten from `# >= 40% of CHC.action_families[] entries` to `# >= 40% of parent_page CHCs contain this family (per-CHC presence ratio, not pooled-entry count)`).
3. Invariant: Pass B step 3 consumes the disambiguated set → manual review (re-read `phase-1-coverage-diagnosis.md` Pass B step 3 and confirm it does not depend on Reading A semantics; the step's "check pool SLTs whose `exit_options[].action_family` includes that family" prose works under Reading B as authored).

## What to Change

### 1. Body-prose disambiguation

In `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` step 4(iii).4, replace the line "compute `dominant_action_families` (>= 40% threshold) and `outlier_action_families`" with:

> compute `dominant_action_families` (a family is dominant when ≥ 40% of the parent page's CHCs contain it in their `action_families[]` list — i.e., the family appears in at least `ceil(0.4 * len(parent_page_choices))` distinct CHCs; the denominator is the CHC count, NOT the pooled count of action_family entries across CHCs) and `outlier_action_families` (a family is an outlier when it appears in exactly one CHC's `action_families[]` list, a singleton against the parent page's CHC set).

### 2. Working-memory shape comment

Update the `forward_affordance_fingerprint` block's `dominant_action_families` line comment from `# >= 40% of CHC.action_families[] entries` to `# >= 40% of parent_page CHCs contain this family (per-CHC presence ratio; denominator is the CHC count)`. Update the `outlier_action_families` line comment from `# singleton or near-singleton entries` to `# appears in exactly one CHC's action_families[] (singleton against the parent_page CHC set)`.

### 3. Worked example anchor

Below the working-memory shape, add a one-paragraph worked example grounded in the 2026-05-30 red-bunny SLB-5 PG-8 case to make the reading concrete:

> Worked example (red-bunny PG-8, 5 CHCs): CHC-36 [communicate, protect, wait]; CHC-37 [communicate, protect]; CHC-38 [perceive, bond, control]; CHC-39 [communicate, persuade, bond]; CHC-40 [evade, protect, wait]. Per-CHC presence: communicate 3/5=60%, protect 3/5=60%, wait 2/5=40%, bond 2/5=40%, perceive 1/5=20%, control 1/5=20%, persuade 1/5=20%, evade 1/5=20%. ⌈0.4 × 5⌉ = 2 CHCs threshold. `dominant_action_families: [communicate, protect, wait, bond]`. `outlier_action_families: [perceive, control, persuade, evade]`.

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` (modify)

## Out of Scope

- Any change to the `forward_affordance_fingerprint` block's field names, the `parent_page_choices` source, or the `action_family_distribution` derivation.
- Any change to Pass B step 3's consumption logic.
- Adoption of Reading A (pooled-entries denominator) — explicitly rejected by Architecture Check #1.
- Generalization to other distribution thresholds in the moment_signature (e.g., supersession-window count) — those are not currently ambiguous.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "denominator is the CHC count\|per-CHC presence ratio" .claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` returns the new clarifying language in both the body and the shape comment.
2. `grep -n "Worked example (red-bunny PG-8" .claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` returns the worked-example paragraph anchor.
3. Re-running `commitment-block-authoring` against red-bunny PG-8 produces a moment_signature whose `dominant_action_families` equals `[communicate, protect, wait, bond]` (the worked example), demonstrating that two operators reading the disambiguated spec produce the same set.

### Invariants

1. The producer site (4(iii).4) and the consumer site (Pass B step 3) agree on the denominator.
2. Determinism: same parent_page + same CHCs → same `dominant_action_families` regardless of operator.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "ceil(0.4\|denominator is the CHC count\|per-CHC presence ratio" .claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md`
2. Re-invoke `commitment-block-authoring --world_slug erotica-world --story_slug red-bunny --mode direct_batch --target_count 1 --focus '<probe>'` on red-bunny and confirm the deliverable summary's moment_signature echo lists `dominant_action_families: [communicate, protect, wait, bond]` per the worked example.
3. (No narrower verification surface needed — prose-only ticket; the determinism claim is verifiable by the worked example reproducing on the live bundle.)
