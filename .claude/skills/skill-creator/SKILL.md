---
name: skill-creator
description: "Use when turning a brainstorming/*.md proposal into a runnable worldloom skill, or when designing a new content pipeline from scratch. Produces: .claude/skills/<slug>/SKILL.md (plus optional templates and examples). Enforces FOUNDATIONS.md alignment structurally at generation time so every generated skill is canon-safe by construction."
user-invocable: true
arguments:
  - name: reference_path
    description: "Path to a brainstorming/*.md proposal. If provided, enters compile mode (the proposal is authoritative). If omitted, enters fresh mode (a proposal is written first)."
    required: false
  - name: topic
    description: "Short description of the pipeline. Required if reference_path is absent. Optional with reference_path to refine focus."
    required: false
---

# Skill Creator

Turns a worldloom pipeline idea into a runnable skill whose structure enforces FOUNDATIONS.md discipline by construction. Two modes: **compile** (from a brainstorming/*.md proposal) and **fresh** (interview-first, proposal generated as a durable intermediate).

<HARD-GATE>
Do NOT write `SKILL.md`, any templates, or any examples until (a) the user has approved the design section-by-section AND (b) the FOUNDATIONS conformance check (Step 6) passes with zero blocking findings. A skill that would emit canon-touching behavior without declared World-State Prerequisites, without the right Validation Rules, or without a HARD-GATE (when canon-mutating) MUST NOT be written.
</HARD-GATE>

## Process Flow

```
Step 1: Read context (FOUNDATIONS.md + reference + siblings)
         |
         v
Step 2: Mode detect + pipeline classification (announce to user)
         |
    +----+----+
    |         |
  fresh     compile
    |         |
    v         |
Step 3: Interview → write brainstorming/<slug>.md
    |         |
    +----+----+
              |
              v
Step 4: Gap-filler interview (confidence 95%)
              |
              v
Step 5: Draft skill design section-by-section (approval gates)
              |
              v
Step 6: FOUNDATIONS conformance check (blocks on fail → loop to Step 5)
              |
              v
Step 7: Write .claude/skills/<slug>/SKILL.md [+ templates/, examples/]
              |
              v
Step 8: Next-steps menu
```

## Step 1: Read Context

1. **FOUNDATIONS.md — always.** Read the whole file. You will cite specific sections during drafting (Canon Layers, Validation Rules, Canon Fact Record Schema, Tooling Recommendation).
2. **Reference proposal — if `reference_path` provided.** Read fully. Extract: Purpose, Inputs (Required/Optional), Output, Phase list, Rules, Validation/Rejection tests, YAML schemas, Final Rule. Note which sections are missing — those become gap-filler targets in Step 4.
3. **skill-creator's own reference templates — when the target pipeline is canon-mutating and may emit Canon Fact Records or Change Log Entries.** Read `.claude/skills/skill-creator/templates/canon-fact-record.yaml` and `.claude/skills/skill-creator/templates/change-log-entry.yaml`. These are the canonical generic references that Step 7.2 copies into every new skill's `templates/` directory. Sibling skills (e.g., `create-base-world`) ship specialized copies of these templates with per-skill phase references and comments — treat those as illustrative, not as ancestors. Step 7.2's "copy and trim" must land against these generic references, not against any sibling's specialization.
4. **Sibling skills.** List `.claude/skills/`. For each existing skill, note its inputs, outputs, and interop hooks — the new skill likely consumes or feeds one of them.
5. **Exemplar proposals — fresh mode only.** Read 1-2 proposals from `brainstorming/` whose classification matches the target. They are structural templates, not content sources.

Summarize what you found in 2-3 sentences before advancing.

## Step 2: Mode Detection & Pipeline Classification

### Mode
- `reference_path` provided → **compile mode**
- `topic` only → **fresh mode**
- Both provided → compile mode, topic refines focus

Announce the mode to the user in one sentence.

### Pipeline Classification

Classify the target pipeline into exactly one class:

| Class | Behavior | Triggers classification |
|---|---|---|
| **canon-mutating** | Writes or alters world files, `CANON_LEDGER.md`, `INVARIANTS.md`, `WORLD_KERNEL.md`, or other world-state files. | Pipeline output includes world-file updates; pipeline accepts/rejects/revises canon facts; pipeline creates initial world state. |
| **canon-reading** | Consumes world-state; produces artifacts that are NOT world-level canon (diegetic texts, characters, option cards, event seeds). | Pipeline output is downstream artifacts, proposals, or candidates requiring separate adjudication before they reach canon. |
| **meta-tooling** | Operates on canon structure (audits, linters, retcon management). Produces reports and recommendations; never writes canon by its own authority. | Pipeline output is findings, severity reports, repair menus. |

State the classification to the user explicitly and wait for acknowledgment (`ok`, `agree`, `proceed`, or — under auto mode — silence after one beat is acceptable). If the user pushes back, reclassify before advancing — classification drives Step 6 enforcement.

**Edge case**: If a pipeline spans classes (e.g., produces both a report AND conditional canon writes), classify by its *strongest* action. A pipeline that may write canon is canon-mutating, even if it often only reports.

## Step 3: Fresh Mode — Proposal Generation

Skip this step in compile mode.

Run a discovery interview to produce a `brainstorming/<slug>.md` file matching the structural DNA of existing proposals. Required sections to elicit:

1. **Purpose** — one paragraph. What does this pipeline do and what does it explicitly NOT do?
2. **Inputs** — Required vs Optional. Type each input.
3. **Output** — specific artifacts. Include record schemas if applicable.
4. **Phase 0..N** — numbered phases with scoped subtasks.
5. **Rules** — invariants the pipeline must uphold (per phase where relevant).
6. **Validation / Rejection Tests** — end-stage checks.
7. **Final Rule** — one-sentence discipline.
8. **Mandatory LLM Roles** (optional) — specialized passes if the pipeline benefits from multiple critics.

Interview rules: one question per message, confidence block after each answer (see Step 4 protocol), target 90%+ for the proposal before writing. Write to `brainstorming/<slug>.md`. Show the user the written proposal and get explicit confirmation before advancing to Step 4.

## Step 4: Gap-Filler Interview

The proposal (from compile mode or Step 3) answers *what the pipeline does*. This step answers *what the runnable skill needs that the proposal didn't specify*.

### Protocol

One question per message. After each user answer, display:

```
Confidence: X%
Gaps: [list of remaining unknowns]
```

Target 95%. Announce the transition when reached: "I'm at 95% confidence. Moving to design."

### Mandatory Gaps to Close

Ask about every gap that has not already been answered by the proposal or prior context:

- **Slug** — kebab-case, matches the intended `.claude/skills/<slug>/` directory.
- **user-invocable** — true/false. Most canon-mutating skills should be invocable; some meta-tooling skills run only as callees.
- **World-State Prerequisites (mandatory per FOUNDATIONS)** — exact list of files read before the skill acts. Examples: `WORLD_KERNEL.md`, `INVARIANTS.md`, `CANON_LEDGER.md`, `MYSTERY_RESERVE.md`, specific domain files. This is non-negotiable per FOUNDATIONS §Tooling Recommendation. **Bootstrap-skill carve-out**: for skills that create initial world state from nothing (pipeline heads like `create-base-world`), the block declares: (a) `docs/FOUNDATIONS.md`, (b) any pre-flight existence/collision checks on the target directory, (c) the user-input file if applicable. The absence of prior state IS the prerequisite, and this framing satisfies the "lists real files (not vague)" conformance check.
- **World scoping** — does this skill operate on a single scoped world (under `worlds/<world-slug>/`), on all worlds, or on the canon-pipeline meta-level (ignoring specific worlds)? For single-world canon-mutating or canon-reading skills, a required `world_slug` argument identifies the target world, and ALL world-file reads and writes MUST be rooted at `worlds/<world-slug>/` — never at repo root. For bootstrap skills, the world-slug is derived from a `world_name` argument and the target directory must not already exist. This gap closes a class of silent-global-write bugs that would otherwise hit every future canon-mutating and canon-reading skill.
- **Sibling interop** — which existing skills produce inputs this skill consumes; which will consume this skill's outputs. Name them explicitly.
- **Validation Rules applied** — which of FOUNDATIONS' 7 Validation Rules this skill enforces, and at which phase. At least 3 must be named for canon-mutating skills.
- **HARD-GATE need** — required for canon-mutating; optional for others.
- **Change-log policy** — canon-mutating skills must emit Change Log Entries (see `templates/change-log-entry.yaml`).
- **Canon Fact Record usage** — canon-mutating skills that emit new facts must produce records matching FOUNDATIONS §Canon Fact Record Schema.
- **Examples** — select 1-2 concrete worked inputs (optional, but usually worth it for complex pipelines).

### Starting Confidence (compile mode)

Before asking the first gap-filler question, compute initial confidence from the reference proposal:

**Base**: 80%

**Deduct 5% for each missing**:
- YAML record schema(s) for outputs the skill emits
- Numbered phase list with per-phase scope
- Validation / rejection tests
- Per-phase rules or FOUNDATIONS cross-references

**Add 5% if both present**:
- At least one fully-worked example (input → output)
- A single-sentence Final Rule stating the pipeline's discipline

**Floor**: 50%. **Ceiling**: 90%. (95% is reached via gap-filler answers, never from the proposal alone.)

Announce the computed starting confidence to the user in the first gap-filler message. When the proposal is unusually thorough (≥85% starting), close only the remaining operational gaps (slug, interop, examples) — do not re-ask what the proposal already answers.

## Step 5: Draft Skill Design (Section-by-Section)

Present the draft in this order. Get user approval per section. After 2 consecutive approvals under auto mode (3 otherwise), batch remaining sections into groups of 2-3. Keep any substantially higher-risk section standalone.

**Phase breakdown exception**: The section order (below) lists "Phase breakdown" as a single item, but canon-mutating pipelines routinely have 10+ phases plus branch logic. When the phase breakdown exceeds ~8 phases OR contains explicit branch logic (e.g., accept / non-accept), split it into at most 2 presentations (e.g., pre-adjudication phases vs post-adjudication + branches). Use a natural pipeline seam as the split boundary (pre/post escalation gate, pre/post adjudication), not an arbitrary phase number.

### Generated SKILL.md Template

```
---
name: <slug>
description: "Use when <concrete trigger>. Produces: <artifacts>. Mutates: <files or 'none'>."
user-invocable: <bool>
arguments:
  - name: <arg>
    description: "<purpose>"
    required: <bool>
---

# <Title>

<One-sentence purpose>

<HARD-GATE>   [canon-mutating only]
Do NOT <specific write action> until <user-approval condition>.
</HARD-GATE>

## Process Flow
<ASCII diagram — phases as boxes>

## Inputs
### Required
- <name> — <type> — <purpose>
### Optional
- <name> — <type> — <purpose>

## Output
- <artifact> — <format>
- <canon record> — matches FOUNDATIONS §Canon Fact Record Schema   [if canon-mutating]
- <change log entry> — matches templates/change-log-entry.yaml     [if canon-mutating]

## World-State Prerequisites            [mandatory — every class]
Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):
- <file> — <why this skill needs it>
- ...

## Pre-flight Check                      [canon-mutating — before Phase 0]
<Precondition checks that run before any pipeline phase:
 - load docs/FOUNDATIONS.md into working context
 - for single-world skills: resolve `worlds/<world-slug>/` from the world_slug argument
 - for bootstrap skills: verify the target `worlds/<world-slug>/` does NOT exist
 - for non-bootstrap canon-mutating skills: verify the target world state DOES exist and required files are readable
 - parse any user input files
If any precondition fails, the skill aborts before Phase 0.>

## Phase 0..N
<Phases lifted from the proposal. Each phase includes a "Rule" subsection
where the proposal specifies one, and FOUNDATIONS cross-references inline
where a Validation Rule enforcement lives.>

## Phase N+1: Commit / Write            [canon-mutating — after final validation phase]
<The HARD-GATE enforcement point. This phase:
 - presents the complete deliverable summary to the user
 - waits for explicit user approval (HARD-GATE fires here)
 - on approval: atomic write of all output files under `worlds/<world-slug>/` (or the declared scope)
 - emits the Change Log Entry per `templates/change-log-entry.yaml`
 - reports paths written; does NOT commit to git>


## Validation Rules This Skill Upholds
- Rule <N>: <name> — enforced at Phase <M> — <mechanism>
- ...

## Record Schemas                        [if applicable]
- Canon Fact Record → see `templates/canon-fact-record.yaml`
- Change Log Entry → see `templates/change-log-entry.yaml`
- <custom> → see `templates/<name>.yaml`

## FOUNDATIONS Alignment
| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| ...       | ...   | ...       |

## Guardrails
- <cross-skill discipline>
- <scope limits>
- <worktree discipline if applicable>

## Final Rule
<One-sentence discipline the skill enforces.>
```

### Section Order for Presentation

1. Frontmatter + Title + one-line purpose
2. HARD-GATE (if applicable)
3. Process Flow
4. Inputs / Output
5. World-State Prerequisites
6. Phase breakdown
7. Validation Rules upheld + Record Schemas
8. FOUNDATIONS Alignment table
9. Guardrails + Final Rule

### Presentation Format (per section)

Each section presentation must end with a short `**Notes on the shape:**` bullet list (2-4 bullets) explaining *why* the concrete choices were made — especially:
- deviations from sibling skills (what was borrowed vs what was changed and why)
- design decisions that fell out of gap-filler answers (cite the question number or topic)
- rationales that would not be obvious from the section text alone

This makes approval gating substantive rather than ceremonial. The user should be able to accept or push back on each design decision, not just on the wording. A section presented without rationale notes is an invitation to rubber-stamp approval — avoid it.

## Step 6: FOUNDATIONS Conformance Check

Before any file is written, audit the draft against class-specific requirements. If any check fails, surface the specific gap to the user and loop back to Step 5 for the affected section. **Writing is blocked until the audit is clean.**

### Universal Checks (all classes)

- [ ] Frontmatter declares `name`, `description`, `user-invocable`, `arguments`.
- [ ] Description names triggers, produces, and mutates explicitly.
- [ ] `## World-State Prerequisites` block exists and lists real files (not vague). **Bootstrap exception**: for skills that create initial world state from nothing, the block legitimately declares `docs/FOUNDATIONS.md` + pre-flight existence/collision checks + user-input files; the absence of prior state is itself the prerequisite and passes this check.
- [ ] Final Rule is a single, enforceable sentence.

### canon-mutating Additional Checks

- [ ] `<HARD-GATE>` block prevents writes before user approval.
- [ ] References `templates/canon-fact-record.yaml` (or emits records matching FOUNDATIONS §Canon Fact Record Schema inline).
- [ ] References `templates/change-log-entry.yaml` (enforces Rule 6: No Silent Retcons).
- [ ] Names at least 3 of the 7 Validation Rules explicitly with the phase that enforces each.
- [ ] Includes a Scope Detection phase (Rule 4: No Globalization by Accident).
- [ ] Includes a Consequence Propagation phase with at least first- and second-order consequences (Rule 5: No Consequence Evasion).
- [ ] Includes a required-updates list for affected world files (FOUNDATIONS §Change Control Policy).
- [ ] Includes a **Pre-flight Check** section *before* Phase 0 that loads `docs/FOUNDATIONS.md` and performs target-state existence/collision checks (bootstrap: verify `worlds/<slug>/` absent; non-bootstrap: verify required world files readable).
- [ ] Includes an explicit **Commit / Write phase** *after* the final validation phase — this is where the HARD-GATE fires on user approval, atomic writes happen, and the Change Log Entry is emitted.
- [ ] **World-scope declaration**: the skill names exactly one of {single-world, all-worlds, meta} as its operating scope. If single-world, a required `world_slug` (or derived-from-`world_name`) argument is declared, and all world-file reads/writes are rooted at `worlds/<world-slug>/` — never at repo root.

### canon-reading Additional Checks

- [ ] Contains an explicit rule: "This skill MUST NOT write to world files, `CANON_LEDGER.md`, or `INVARIANTS.md`."
- [ ] If diegetic (produces in-world texts): includes a Canon Safety Check phase preventing accidental mystery resolution, restricted-knowledge leaks, or silent canon creation (Rule 7: Preserve Mystery Deliberately).
- [ ] If proposal-generating (produces candidate facts): explicit note that output is NOT canon until it passes the canon-addition skill.
- [ ] **World-scope declaration**: the skill names exactly one of {single-world, all-worlds, meta} as its operating scope. If single-world, a required `world_slug` argument is declared, and all world-file reads are rooted at `worlds/<world-slug>/` — never at repo root.

### meta-tooling Additional Checks

- [ ] Output is report-shaped (findings, severity tables, repair menus) — not canon-write-shaped.
- [ ] Contains an explicit rule: "This skill proposes changes; it does not apply them."
- [ ] If audit-class: uses severity levels (Cosmetic → Canon Break) matching FOUNDATIONS §Continuity or locally defined.

Report results in this format:

```
FOUNDATIONS Conformance Check — <slug> — class: <class>
✅ Universal: <N>/<N>
✅ Class-specific: <N>/<N>
❌ Blocking findings:
  - <section>: <specific gap>
```

## Step 7: Write Files

Only reachable if Step 6 passes clean AND all design sections were user-approved.

1. Write `.claude/skills/<slug>/SKILL.md`.
2. Write `.claude/skills/<slug>/templates/*.yaml` for any record schemas the skill references. **Start from skill-creator's own `.claude/skills/skill-creator/templates/canon-fact-record.yaml` and `.claude/skills/skill-creator/templates/change-log-entry.yaml`** — these are the canonical generic references (already loaded into context at Step 1). Do NOT start from a sibling skill's templates (e.g., `create-base-world/templates/*.yaml`) — those are specialized copies that have drifted from the generic by design, and re-deriving from them propagates per-sibling comments into new skills. Copy the generic, then trim fields that do not apply and adjust phase references to match the new skill's numbering.
3. Write `.claude/skills/<slug>/examples/*.md` for approved worked examples (max 2). Skip if none were selected.
4. **Compile mode only**: move the source `brainstorming/<slug>.md` to `archive/brainstorming/<slug>.md`. If `archive/brainstorming/` does not yet exist, run `mkdir -p archive/brainstorming/` first. Then `git mv brainstorming/<slug>.md archive/brainstorming/<slug>.md`. Using `git mv` preserves rename history so the proposal-to-skill lineage stays legible in `git log --follow`. In fresh mode the proposal stays in `brainstorming/` as the durable spec.
5. Report paths written. Do NOT commit.

## Step 8: Next-Steps Menu

```
Skill written to .claude/skills/<slug>/SKILL.md
<list any templates/examples written>
<note archive move if applicable>

What would you like to do next?
1. Invoke the new skill to test it on real input
2. Create another skill from a different proposal
3. Run `skill-audit` on the new skill (structural audit, no invocation)
4. Done for now — I'll review the skill file later
```

If the user invokes a sibling skill, the session ends cleanly — skill-creator does not chain.

## Classification Heuristics

When the pipeline's class is ambiguous, apply these heuristics in order:

1. **Does the output include file writes to any of `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `CANON_LEDGER.md`, or named world-state files?** → canon-mutating.
2. **Does the output include new Canon Fact Record entries (even candidates)?** → If the skill itself applies them: canon-mutating. If it only proposes them for separate adjudication: canon-reading.
3. **Does the output include diegetic artifacts (in-world texts)?** → canon-reading. Diegetic texts are NOT canon; they are voices from within canon.
4. **Does the output include only reports, severity findings, or repair menus?** → meta-tooling.
5. **Does the skill accept/reject/revise existing canon?** → canon-mutating, even if its typical output is rejection.

## Guardrails

- The generated `SKILL.md` must be self-contained — a reader should not need skill-creator to run it.
- Do NOT duplicate FOUNDATIONS.md content inline. Cross-reference: "see FOUNDATIONS.md §Validation Rules".
- Keep generated `SKILL.md` under ~400 lines. If a proposal is long (e.g., 500+ lines), push verbose phase prose into `templates/` or trim to the enforceable core; the skill file is a runtime contract, not a recapitulation of the proposal.
- skill-creator NEVER edits `docs/FOUNDATIONS.md`. FOUNDATIONS lives outside this tool's authority.
- skill-creator NEVER writes world-state files (`WORLD_KERNEL.md` etc.). Those are the jobs of canon-mutating skills, not the meta-skill.
- No scope inflation: generate one skill per invocation. If the user asks for a suite, confirm each individually.
- Worktree discipline: if in a worktree, all paths resolve from the worktree root.
- One question per message during interviews. Never batch.
- Respect early exit ("just go", "that's enough"): announce current confidence, list assumptions, proceed. Mark assumptions in the design so the user can correct them during section approval.
- The HARD-GATE at the top of this skill is absolute. No `Write` or `Edit` to skill files until design approval AND conformance-check pass.

## FOUNDATIONS Alignment of skill-creator Itself

| Principle | How skill-creator honors it |
|-----------|-----------------------------|
| Tooling Recommendation (§"non-negotiable") | Every generated skill is forced to declare `## World-State Prerequisites` (with a bootstrap-skill carve-out recognizing that pipeline heads have no prior state to read) |
| Rule 1: No Floating Facts | canon-mutating skills are forced to emit full Canon Fact Records (domain, scope, prerequisites, limits, consequences) |
| Multi-world directory discipline | canon-mutating/canon-reading skills are forced to declare world scope {single-world, all-worlds, meta} and, for single-world skills, to root all file operations at `worlds/<world-slug>/` |
| Rule 4: No Globalization by Accident | canon-mutating skills are forced to include a Scope Detection phase |
| Rule 5: No Consequence Evasion | canon-mutating skills are forced to include Consequence Propagation with ≥2 orders |
| Rule 6: No Silent Retcons | canon-mutating skills are forced to emit Change Log Entries |
| Rule 7: Preserve Mystery Deliberately | diegetic canon-reading skills are forced to include a Canon Safety Check |
| Canon Layering | Classification step forces explicit posture on canon mutation |
| Change Control Policy | Change log template bundled and referenced |

## Final Rule

A generated worldloom skill is not ready until it declares: what world-state it reads, what canon it may produce or mutate, which Validation Rules it upholds, and what its output records look like. A skill that cannot answer those four questions is a prose sketch, not a tool — and skill-creator must refuse to write it.
