# Brainstorm Skill Adaptation — Design

## Brainstorm Context

**Original request**: Adapt `.claude/skills/brainstorm-worldwake/SKILL.md` (a confidence-driven brainstorm skill ported from another repository) to a new worldloom-local skill at `.claude/skills/brainstorm/SKILL.md`. Strip anything extraneous to worldloom. Delete the reference skill afterward.

**Reference files read**:
- `.claude/skills/brainstorm-worldwake/SKILL.md` (the source skill, ~37KB, heavily tied to a Rust simulation engine)
- `docs/FOUNDATIONS.md` (worldloom's canon-management framework)
- `brainstorming/create-base-world.md`, `brainstorming/canon-addition.md` (existing pipeline/feature design proposals)
- Repository structure (greenfield, single initial commit)

**Key interview insights**:
- User selected forward-looking deliverable scope: keep spec/ticket branches even though `specs/`, `tickets/`, `docs/spec-drafting-rules.md`, and `tickets/_TEMPLATE.md` don't yet exist — handle missing references with graceful fallbacks.
- User chose "surgical strip" adaptation strategy over ground-up rewrite or maximum preservation.

**Final confidence**: 95% (no remaining gaps after section approvals).

**Assumptions**: None unresolved.

---

## 1. Overview

A repository-local `.claude/skills/brainstorm/SKILL.md` that preserves brainstorm-worldwake's confidence-driven interview, plan-mode handling, recovery brainstorms, and deliverable-pivot logic — while replacing all worldwake-specific (Rust simulation engine) machinery with worldloom-appropriate equivalents. Reduces ~37KB to ~25-30KB primarily by deletion. Same frontmatter (`name: brainstorm`, same description, same `request`/`reference_path` arguments, `user-invocable: true`).

## 2. Topic Classification Taxonomy

Replaces worldwake's `implementation-related / implementation-adjacent / non-implementation` taxonomy (defined in terms of "simulation behavior") with worldloom-appropriate categories:

- **canon-related**: Designs that affect the world model itself or the canon-handling logic that operates on it — new pipelines (e.g., `brainstorming/canon-addition.md`-style), changes to how canon facts are validated/derived/scoped, new world-file types, modifications to invariants/ontology/relation handling, anything that produces or mutates files like `WORLD_KERNEL.md`, `INVARIANTS.md`, `CANON_LEDGER.md`. **Must read FOUNDATIONS.md and validate against it.**
- **tooling-adjacent**: Project tooling that doesn't change canon semantics — CLI cosmetics, doc generators, build/test scripts, dev ergonomics. FOUNDATIONS.md read is optional.
- **non-implementation**: Process, workflow, skill design, configuration. No FOUNDATIONS.md read required (unless the topic directly concerns canon principles).

The skill must state the classification to the user in one short sentence after Step 1, allowing redirection before downstream decisions.

## 3. Deletions and Replacements

### Stripped from worldwake (and not replaced)
- `.ron` scenario files, `golden_*.rs` test files, scenario+golden-tests deliverable type
- "Permille", "SystemFn Integration", "Component Registration", "FND-26", profile-driven parameters
- Rust crate / workspace member / dev-tooling crate deliverable type
- "Adjunct Wave" sections in `IMPLEMENTATION-ORDER.md`
- Engine-investigation-driven hybrid deliverables (observer runs, planner trace capabilities, observer-improvements + evidence-driven fixes pattern)
- "1-3-1 rule" CLAUDE.md reference (worldloom CLAUDE.md doesn't exist / doesn't have this)
- Mentions of "simulation behavior", "engine architecture", "planner changes", "action handlers", "component logic"

### Reframed (kept with graceful fallbacks)
- **Spec deliverable**: References `docs/spec-drafting-rules.md` **if it exists**. Fallback: write spec with sensible default sections (Problem Statement, Approach, FOUNDATIONS Alignment, Verification) and note in the spec that the rules file is absent.
- **Ticket deliverable**: References `tickets/_TEMPLATE.md` and `tickets/README.md` **if they exist**. Fallback: write a minimal ticket with Title, Context, Acceptance Criteria, Verification.
- **`specs/IMPLEMENTATION-ORDER.md` update**: Conditional on the file existing. If absent, the spec write still completes; the skill notes the missing index file.

### Preserved (general-purpose machinery)
- HARD-GATE on implementation before approval
- Confidence-driven interview loop targeting 95%, with the same scoring guide
- Interview rules (one question at a time, prefer multiple-choice via `AskUserQuestion`, probe motivations, challenge premature specificity, name uncertainty, respect expertise, handle delegation, present empirical findings before questions)
- Plan mode handling (whole-plan approval via `ExitPlanMode`, fast-track when confidence ≥85%, fast-track assumption disclosure)
- Recovery/Reset brainstorm guidance (validate diagnosis, focus on "what's actually broken?", always include a radical option)
- Early exit handling
- Deliverable-pivot rule (rewrite plan/design when user redirects deliverable type mid-brainstorm)
- Auto mode interaction (batching threshold shifts to 2 consecutive approvals; HARD-GATE never relaxed)
- Step 6 next-steps menu with deliverable-type variants
- Initial-confidence calibration from reference material, request text, and prior conversation context
- Interview skip threshold (≥95% before interview = skip Step 2)
- Directed design question carve-out (85-94% confidence + enumerated alternatives = skip discovery)
- External research integration (launch research agents before interview when topic requires domain knowledge beyond codebase)

## 4. Deliverable Types

| Type | Output location | Trigger |
|------|-----------------|---------|
| Design doc | `docs/plans/YYYY-MM-DD-<topic>-design.md` | Default for tooling-adjacent and non-implementation work |
| Skill file | `.claude/skills/<name>/SKILL.md` | When the topic IS a skill (deliverable IS the skill file; skip `docs/plans/`) |
| Skill modification | Existing skill file(s) | When topic modifies/reconciles existing skills (edits ARE the design) |
| Pipeline / feature proposal | `brainstorming/<topic>.md` | New worldloom canon-pipeline designs (matches existing files like `canon-addition.md`, `create-base-world.md`) |
| Spec | `specs/<Name>.md` | Architectural change requiring formal spec; graceful fallback if `docs/spec-drafting-rules.md` absent |
| Ticket | `tickets/<id>-<slug>.md` | Bounded fix to existing code; graceful fallback if `tickets/_TEMPLATE.md` absent |
| Triage doc | `docs/triage/YYYY-MM-DD-<topic>-triage.md` | Only when triage produces ≥2 specs or ≥3 tickets |
| Hybrid (plan + artifacts) | Plan file + listed artifacts | Plan describes implementation sequence; line budget ~100 + 20*(N-1) lines |

The deliverable-pivot rule, fast-track plan-mode flow, "design doc IS the deliverable" rules, and Step 6 menu variants are preserved with the same conditional logic — just stripped of worldwake-specific items.

## 5. FOUNDATIONS.md Validation Reframe

Worldwake's FOUNDATIONS validation was about engine architecture principles. Worldloom's `docs/FOUNDATIONS.md` is about canon discipline. The skill's FOUNDATIONS-alignment requirement becomes:

For **canon-related** topics, the design must include a "FOUNDATIONS Alignment" section addressing the relevant subset of:
- Canon layer assignment (hard / derived / soft / contested / mystery reserve)
- Validation Rule conformance (no floating facts, no pure cosmetics, no specialness inflation, no globalization by accident, no consequence evasion, no silent retcons, deliberate mystery preservation)
- Invariant impact (ontological, causal, distribution, social, aesthetic/thematic)
- Required world-file updates (which of the mandatory files change: `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, `MYSTERY_RESERVE.md`)
- Whether the change creates new story engines or narrows/expands the Mystery Reserve

For **tooling-adjacent** topics, FOUNDATIONS alignment is optional — include only if the tooling touches canon-handling logic or canon artifacts. For **non-implementation**, omit (unless the topic directly concerns canon principles).

The "If implementation-related" branch in Step 3 (approach proposal) becomes "If canon-related" with the same Foundations alignment / tension format.

## 6. File Operations

1. **Create** `.claude/skills/brainstorm/SKILL.md` with the adapted content. Frontmatter unchanged from worldwake (name `brainstorm`, same description, `user-invocable: true`, same `request` and optional `reference_path` arguments).
2. **Delete** `.claude/skills/brainstorm-worldwake/` (entire directory).
3. **Verify** no other files reference `brainstorm-worldwake`. None expected (greenfield, single skill present), but grep to confirm.
4. **Do NOT commit** the new skill or the deletion (leave for user review per `brainstorm-worldwake`'s own convention). The design doc itself IS committed per superpowers:brainstorming skill convention.

## Edge Cases

- **`docs/spec-drafting-rules.md` absent at spec-write time**: Skill writes spec with default-section template and adds a top-of-file note: `<!-- spec-drafting-rules.md not present; using default structure. -->`.
- **`tickets/_TEMPLATE.md` absent at ticket-write time**: Same pattern — minimal ticket with Title/Context/Acceptance Criteria/Verification, top-of-file note.
- **`specs/IMPLEMENTATION-ORDER.md` absent at spec-write time**: Skill writes the spec, omits the IMPLEMENTATION-ORDER update step, notes the omission in the Step 6 menu summary.
- **`brainstorming/<topic>.md` collision**: If a target filename already exists, the skill prompts for confirmation before overwriting (worldloom existing files like `canon-addition.md` may be the *target* of a brainstorm).
- **Topic spans both canon-related and tooling-adjacent**: Treat as canon-related (more demanding classification wins).

## Verification

After implementation:
1. New skill file at `.claude/skills/brainstorm/SKILL.md` exists, parses as valid skill (frontmatter + markdown body).
2. `.claude/skills/brainstorm-worldwake/` no longer exists.
3. Grep finds zero references to `brainstorm-worldwake` in the repo.
4. Grep finds zero references to stripped worldwake-only terms (Permille, SystemFn, FND-26, "Adjunct Wave", `.ron`, `golden_*.rs`, "planner changes", "action handlers") in the new skill.
5. Skill file size is materially smaller than the worldwake source (~25-30KB target).
6. Manual skim confirms preserved sections (HARD-GATE, confidence loop, recovery brainstorms, plan mode, deliverable pivot, auto mode) read coherently.

## Out of Scope

- Creating `docs/spec-drafting-rules.md`, `tickets/_TEMPLATE.md`, `tickets/README.md`, or `specs/IMPLEMENTATION-ORDER.md` (the skill handles their absence gracefully).
- Updating worldloom CLAUDE.md (none currently exists).
- Adapting the existing `brainstorming/*.md` pipeline files.
- Any additional skills or settings changes.
