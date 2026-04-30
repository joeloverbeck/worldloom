# Gap-Filler Interview (Step 4)

The proposal (from compile mode or the fresh-mode proposal step) answers *what the pipeline does*. This step answers *what the runnable skill needs that the proposal didn't specify*.

## Protocol

One question per message. After each user answer, display:

```
Confidence: X%
Gaps: [list of remaining unknowns]
```

Target 95%. Announce the transition when reached: "I'm at 95% confidence. Moving to design."

**Auto mode compression**: Under auto mode, routine gaps (slug, user-invocable flag, sibling interop names, INDEX semantics, examples yes/no, conventional argument naming, character-slug derivation rule, and similar operational-not-substantive choices) may be pre-filled as confirmable assumptions alongside a single substantive question — the user can override any assumption in the same reply. This honors "one substantive question per message" while respecting auto mode's "minimize interruptions" directive. Non-routine gaps (Validation Rules subset, HARD-GATE policy, output schema, Canon Safety Check shape, prerequisite-file list, world-scope declaration) stay strict single-question.

## Mandatory Gaps to Close

Ask about every gap that has not already been answered by the proposal or prior context:

- **Slug** — kebab-case, matches the intended `.claude/skills/<slug>/` directory.
- **user-invocable** — true/false. Most canon-mutating skills should be invocable; some meta-tooling skills run only as callees.
- **World-State Prerequisites (mandatory per FOUNDATIONS)** — exact list of files read before the skill acts. Examples: `WORLD_KERNEL.md`, `INVARIANTS.md`, `CANON_LEDGER.md`, `MYSTERY_RESERVE.md`, specific domain files. This is non-negotiable per FOUNDATIONS §Tooling Recommendation. **Bootstrap-skill carve-out**: for skills that create initial world state from nothing (pipeline heads like `create-base-world`), the block declares: (a) `docs/FOUNDATIONS.md`, (b) any pre-flight existence/collision checks on the target directory, (c) the user-input file if applicable. The absence of prior state IS the prerequisite, and this framing satisfies the "lists real files (not vague)" conformance check.
- **World scoping** — declare exactly one of {single-world, all-worlds, meta, meta-with-multi-world-read}. This gap closes a class of silent-global-write bugs that would otherwise hit every future canon-mutating and canon-reading skill.
  - **single-world** (canon-mutating or canon-reading): required `world_slug` argument identifies the target; ALL world-file reads and writes rooted at `worlds/<world-slug>/` — never at repo root.
  - **bootstrap** (subset of single-world): world-slug derived from a `world_name` argument; target directory must NOT already exist.
  - **meta-with-multi-world-read** (typically canon-reading or meta-tooling, not canon-mutating): no `world_slug` argument; reads scoped per-world via `mcp__worldloom__get_context_packet(world_slug=<each>, task_type='propose_new_worlds_from_preferences', ...)` when generating world proposals, another registered task-specific type when the generated skill matches an existing profile, or `task_type='other'` only for genuinely unclassified future skills. Writes land at a declared root-level surface (e.g., `world-proposals/`); rationale for the hybrid scope declared in the generated skill's Guardrails; empty-worlds case (no existing worlds yet) handled as a degraded-mode path with an explicit user-visible flag at the HARD-GATE deliverable.
- **Sibling interop** — which existing skills produce inputs this skill consumes; which will consume this skill's outputs. Name them explicitly.
- **Validation Rules applied** — which of FOUNDATIONS' 7 Validation Rules this skill enforces, and at which phase. At least 3 must be named for canon-mutating skills. For canon-reading skills whose output carries in-world knowledge, beliefs, or capabilities, at least Rule 7 is required; name additional Rules (2/3/4/5) wherever they are structurally or procedurally enforced. Rule 1 (No Floating Facts), when enforced structurally by required output-schema fields rather than a dedicated phase, should appear in the FOUNDATIONS Alignment table rather than in the Validation Rules list.
- **HARD-GATE need** — required for canon-mutating; recommended for canon-reading and meta-tooling whose deliverable exceeds ~3 files or requires explicit user review before write; optional otherwise.
- **Change-log policy** — canon-mutating skills must emit Change Log Entries (see `templates/change-log-entry.yaml`).
- **Canon Fact Record usage** — canon-mutating skills that emit new facts must produce records matching FOUNDATIONS §Canon Fact Record Schema.
- **Batch vs single-artifact output** — if the skill emits multiple artifacts per invocation (a batch), ask: (a) batch size default + user override semantics; (b) fill-priority order when requested size is below slot count; (c) empty-slot policy (preserve empty as a diagnostic signal, or substitute from another slot); (d) batch-manifest file vs inline-batch file; (e) batch-level safety check as a peer of per-artifact checks, not a replacement.
- **Examples** — select 1-2 concrete worked inputs (optional, but usually worth it for complex pipelines).
- **Supporting-file bootstrap** — does the proposal bundle required content for files outside `.claude/skills/<slug>/` that the generated skill consumes at runtime (e.g., `tickets/_TEMPLATE.md`, `tickets/README.md`, `docs/archival-workflow.md`, validator fixtures, hook scripts)? If yes, these are pipeline-level supporting files the generated skill depends on — distinct from both world-state files (which skill-creator NEVER writes per Guardrails) and from FOUNDATIONS.md (which skill-creator NEVER edits). Elicit user approval to expand scope before drafting; on approval, write them at the write-files step alongside the skill writes. On refusal, present the bundled content for the user to paste at the closeout next-steps menu.
- **Generated skill's supporting files** — split into two concerns:
  - **(a) Runtime-read supporting files** — any non-world files the generated skill reads at runtime beyond `docs/FOUNDATIONS.md` (templates, configs, hook scripts, validator fixtures, archival-policy docs)? Each must appear in the generated skill's Pre-flight Check as a readability precondition with a clear abort-on-missing error, parallel to the World-State Prerequisites block but distinct in origin (pipeline infrastructure rather than world canon). Closes the failure mode where a generated skill silently fails at first use because a required supporting file was never written or was moved.
  - **(b) First-run bootstrap supporting files** — repository infrastructure the generated skill writes once at first invocation (e.g., `<output-dir>/.gitkeep`, a two-line append to repo-root `.gitignore`, a README placeholder)? Common when the skill emits to a new root-level directory that the existing `briefs/*` + `worlds/*` gitignore pattern would otherwise miss. Each bootstrap surface must appear in the generated skill's Commit phase as a gated write (HARD-GATE-conditional, idempotent — detect-then-skip on subsequent runs); Pre-flight detects bootstrap state and records it on the batch manifest as `bootstrap_writes_required: true|false` so the user sees the deferred infrastructure write at the HARD-GATE deliverable. The bootstrap is performed by the generated skill itself at first invocation, NOT by skill-creator at the write-files step — skill-creator's supporting-file writes are limited to the §"Supporting-file bootstrap" gap (the proposal-bundled-content case). This sub-bullet covers the orthogonal case where the generated skill bootstraps its own output directory's tracking infrastructure.

## Out-of-scope concerns raised during interview

If the user raises a concern during the gap-filler interview that names a downstream sibling skill's behavior as a risk factor (e.g., "my worry is that `<sibling>` will drop this content," "I'm concerned `<sibling>`'s schema won't preserve X"), and the concern is out-of-scope for this skill (per the one-skill-per-invocation guardrail), (a) document the concern in the generated skill's Guardrails as a "Known concern to surface to maintainers" note naming the downstream sibling + the specific risk + why this skill's design minimizes but does not eliminate the risk, and (b) surface it at the closeout next-steps menu as an explicit follow-up option ("Run `skill-audit` on `<sibling>` to address the <risk>"). This keeps out-of-scope concerns auditable rather than scattered, and makes the interop contract maintainable by naming the sibling that needs attention.

## Starting Confidence (compile mode)

Before asking the first gap-filler question, compute initial confidence from the reference proposal:

**Base**: 80%

**Deduct 5% for each fully-missing item; deduct 2% for each partially-present item** (list below). Judgment rule: an item is PARTIAL when the proposal gestures at the element but doesn't satisfy the runnable-skill bar — e.g., a quality checklist where numbered validation tests were specified; rules stated in some phases but not others; a record schema sketched in prose rather than as YAML; or a **delegation-by-reference** where the proposal names a concrete existing artifact (a shipping sibling SKILL.md, a published schema, or a referenced file path) whose content IS the missing element. Delegation-by-reference counts as PARTIAL (not MISSING) because the element is knowable — the executor can load the referenced artifact — but the proposal still didn't restate it, so a gap-filler is still required to confirm adoption. Example: a proposal saying "the output format aligns with how `propose-new-canon-facts` produces proposal cards" delegates the schema legitimately → PARTIAL, not MISSING. Name each partial call explicitly ("Validation tests: PARTIAL — proposal has Artifact Quality Checklist but no numbered tests; deducting 2%") so the user can override before the first gap-filler question.

Items:
- Record or artifact schema(s) for outputs the skill emits — YAML for structured records (Canon Fact Records, Change Log Entries, candidate records consumed by downstream siblings), markdown templates for prose artifacts (ticket files, design docs, triage reports), JSON schema for validator configs. Applies equally to canon-reading skills whose outputs are structured candidate records consumed by downstream skills (e.g., proposal cards consumed by `canon-addition`). A bullet-list template where YAML frontmatter would be needed for downstream parsing counts as PARTIAL; a prose sketch where a markdown template with required sections would be needed for downstream template-fidelity enforcement also counts as PARTIAL.
- Numbered phase list with per-phase scope
- Validation / rejection tests
- Per-phase rules or FOUNDATIONS cross-references

**Add 5% for each of these present** (max +10%; bonus items do not take half-credit — they are either present or absent):
- At least one fully-worked example (input → output)
- A single-sentence Final Rule stating the pipeline's discipline

Each item — deduction OR bonus — is independently earned.

**Floor**: 50%. **Ceiling**: 90%. (95% is reached via gap-filler answers, never from the proposal alone.)

Announce the computed starting confidence to the user in the first gap-filler message. When the proposal is unusually thorough (≥85% starting), close only the remaining operational gaps (slug, interop, examples) — do not re-ask what the proposal already answers.
