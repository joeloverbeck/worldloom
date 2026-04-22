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
3. **skill-creator's own reference templates — when (a) the target pipeline is canon-mutating and may emit Canon Fact Records or Change Log Entries, OR (b) the target is canon-reading and its output schema is intentionally parallel to the CF Record Schema for downstream canon-addition compatibility.** Read `.claude/skills/skill-creator/templates/canon-fact-record.yaml` and `.claude/skills/skill-creator/templates/change-log-entry.yaml`. These are the canonical generic references that Step 7.2 copies into every new skill's `templates/` directory. Sibling skills (e.g., `create-base-world`) ship specialized copies of these templates with per-skill phase references and comments — treat those as illustrative, not as ancestors. Step 7.2's "copy and trim" must land against these generic references, not against any sibling's specialization.
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

**Auto mode compression**: Under auto mode, routine gaps (slug, user-invocable flag, sibling interop names, INDEX semantics, examples yes/no, conventional argument naming, character-slug derivation rule, and similar operational-not-substantive choices) may be pre-filled as confirmable assumptions alongside a single substantive question — the user can override any assumption in the same reply. This honors "one substantive question per message" while respecting auto mode's "minimize interruptions" directive. Non-routine gaps (Validation Rules subset, HARD-GATE policy, output schema, Canon Safety Check shape, prerequisite-file list, world-scope declaration) stay strict single-question.

### Mandatory Gaps to Close

Ask about every gap that has not already been answered by the proposal or prior context:

- **Slug** — kebab-case, matches the intended `.claude/skills/<slug>/` directory.
- **user-invocable** — true/false. Most canon-mutating skills should be invocable; some meta-tooling skills run only as callees.
- **World-State Prerequisites (mandatory per FOUNDATIONS)** — exact list of files read before the skill acts. Examples: `WORLD_KERNEL.md`, `INVARIANTS.md`, `CANON_LEDGER.md`, `MYSTERY_RESERVE.md`, specific domain files. This is non-negotiable per FOUNDATIONS §Tooling Recommendation. **Bootstrap-skill carve-out**: for skills that create initial world state from nothing (pipeline heads like `create-base-world`), the block declares: (a) `docs/FOUNDATIONS.md`, (b) any pre-flight existence/collision checks on the target directory, (c) the user-input file if applicable. The absence of prior state IS the prerequisite, and this framing satisfies the "lists real files (not vague)" conformance check.
- **World scoping** — does this skill operate on a single scoped world (under `worlds/<world-slug>/`), on all worlds, or on the canon-pipeline meta-level (ignoring specific worlds)? For single-world canon-mutating or canon-reading skills, a required `world_slug` argument identifies the target world, and ALL world-file reads and writes MUST be rooted at `worlds/<world-slug>/` — never at repo root. For bootstrap skills, the world-slug is derived from a `world_name` argument and the target directory must not already exist. This gap closes a class of silent-global-write bugs that would otherwise hit every future canon-mutating and canon-reading skill.
- **Sibling interop** — which existing skills produce inputs this skill consumes; which will consume this skill's outputs. Name them explicitly.
- **Validation Rules applied** — which of FOUNDATIONS' 7 Validation Rules this skill enforces, and at which phase. At least 3 must be named for canon-mutating skills. For canon-reading skills whose output carries in-world knowledge, beliefs, or capabilities, at least Rule 7 is required; name additional Rules (2/3/4/5) wherever they are structurally or procedurally enforced. Rule 1 (No Floating Facts), when enforced structurally by required output-schema fields rather than a dedicated phase, should appear in the FOUNDATIONS Alignment table rather than in the Validation Rules list.
- **HARD-GATE need** — required for canon-mutating; recommended for canon-reading and meta-tooling whose deliverable exceeds ~3 files or requires explicit user review before write; optional otherwise.
- **Change-log policy** — canon-mutating skills must emit Change Log Entries (see `templates/change-log-entry.yaml`).
- **Canon Fact Record usage** — canon-mutating skills that emit new facts must produce records matching FOUNDATIONS §Canon Fact Record Schema.
- **Batch vs single-artifact output** — if the skill emits multiple artifacts per invocation (a batch), ask: (a) batch size default + user override semantics; (b) fill-priority order when requested size is below slot count; (c) empty-slot policy (preserve empty as a diagnostic signal, or substitute from another slot); (d) batch-manifest file vs inline-batch file; (e) batch-level safety check as a peer of per-artifact checks, not a replacement.
- **Examples** — select 1-2 concrete worked inputs (optional, but usually worth it for complex pipelines).

### Out-of-scope concerns raised during interview

If the user raises a concern during the gap-filler interview that names a downstream sibling skill's behavior as a risk factor (e.g., "my worry is that `<sibling>` will drop this content," "I'm concerned `<sibling>`'s schema won't preserve X"), and the concern is out-of-scope for this skill (per the one-skill-per-invocation guardrail), (a) document the concern in the generated skill's Guardrails as a "Known concern to surface to maintainers" note naming the downstream sibling + the specific risk + why this skill's design minimizes but does not eliminate the risk, and (b) surface it at Step 8 Next-Steps as an explicit follow-up option ("Run `skill-audit` on `<sibling>` to address the <risk>"). This keeps out-of-scope concerns auditable rather than scattered, and makes the interop contract maintainable by naming the sibling that needs attention.

### Starting Confidence (compile mode)

Before asking the first gap-filler question, compute initial confidence from the reference proposal:

**Base**: 80%

**Deduct 5% for each fully-missing item; deduct 2% for each partially-present item** (list below). Judgment rule: an item is PARTIAL when the proposal gestures at the element but doesn't satisfy the runnable-skill bar — e.g., a quality checklist where numbered validation tests were specified; rules stated in some phases but not others; a record schema sketched in prose rather than as YAML; or a **delegation-by-reference** where the proposal names a concrete existing artifact (a shipping sibling SKILL.md, a published schema, or a referenced file path) whose content IS the missing element. Delegation-by-reference counts as PARTIAL (not MISSING) because the element is knowable — the executor can load the referenced artifact — but the proposal still didn't restate it, so a gap-filler is still required to confirm adoption. Example: a proposal saying "the output format aligns with how `propose-new-canon-facts` produces proposal cards" delegates the schema legitimately → PARTIAL, not MISSING. Name each partial call explicitly ("Validation tests: PARTIAL — proposal has Artifact Quality Checklist but no numbered tests; deducting 2%") so the user can override before the first gap-filler question.

Items:
- YAML record schema(s) for outputs the skill emits — applies equally to canon-reading skills whose outputs are structured candidate records consumed by downstream skills (e.g., proposal cards consumed by `canon-addition`). A bullet-list template where YAML frontmatter would be needed for downstream parsing counts as PARTIAL.
- Numbered phase list with per-phase scope
- Validation / rejection tests
- Per-phase rules or FOUNDATIONS cross-references

**Add 5% for each of these present** (max +10%; bonus items do not take half-credit — they are either present or absent):
- At least one fully-worked example (input → output)
- A single-sentence Final Rule stating the pipeline's discipline

Each item — deduction OR bonus — is independently earned.

**Floor**: 50%. **Ceiling**: 90%. (95% is reached via gap-filler answers, never from the proposal alone.)

Announce the computed starting confidence to the user in the first gap-filler message. When the proposal is unusually thorough (≥85% starting), close only the remaining operational gaps (slug, interop, examples) — do not re-ask what the proposal already answers.

## Step 5: Draft Skill Design (Section-by-Section)

Present the draft in this order. Get user approval per section. After 2 consecutive approvals under auto mode (3 otherwise), batch remaining sections into groups of 2-3. Keep any substantially higher-risk section standalone. Under auto mode, after 5+ consecutive approvals with no substantive pushback, single-message batches covering all remaining sections are acceptable provided no section is higher-risk AND the Notes-on-the-shape discipline is preserved per section (rationale notes must still appear for each section in the batch). The "groups of 2-3" rule remains the default; the 5+-sustained-approval case is the explicit relaxation for prolonged agreement.

**Phase breakdown exception**: The section order (below) lists "Phase breakdown" as a single item, but pipelines routinely have 10+ phases plus branch logic regardless of class — canon-mutating pipelines grow from consequence-propagation branches, canon-reading skills grow from multi-sub-check Canon Safety phases, and meta-tooling audits grow from per-severity repair menus. When the phase breakdown exceeds ~8 phases OR contains explicit branch logic (e.g., accept / non-accept, pre/post-audit, pre/post Canon Safety Check), split it into at most 2 presentations (e.g., generation track vs validation+commit track, or pre-adjudication vs post-adjudication + branches). Use a natural pipeline seam as the split boundary — pre/post Canon Safety Check [canon-reading with in-world output; canon-mutating], pre/post adjudication [canon-mutating], or pre/post escalation gate [canon-mutating with multi-critic phases] — not an arbitrary phase number.

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

<HARD-GATE>   [required for canon-mutating; recommended for canon-reading and meta-tooling whose deliverable exceeds ~3 files or requires explicit user review]
Do NOT <specific write action(s)> until: (a) <pre-flight condition>;
(b) <validation-phase condition>; (c) <final-gate condition>;
(d) the user has explicitly approved the <deliverable> summary.
This gate is authoritative under Auto Mode or any other autonomous-execution
context — invoking this skill does not constitute approval of the deliverable summary.
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

<Multi-directory aggregate pattern — optional sub-section. If the skill's Pre-flight
 assembles a conceptual registry by reading across multiple sub-directories (e.g.,
 a Person Registry from `characters/` + `diegetic-artifacts/` + `adjudications/`;
 an Artifact Corpus from every `diegetic-artifacts/*.md`; a Retcon History from
 `adjudications/PA-NNNN-accept*.md` across all worlds), declare the registry as
 a peer sub-section to the flat world-file list, naming it explicitly (e.g.,
 "### Mandatory Person Registry — always loaded at Pre-flight"). This keeps
 multi-directory aggregates structurally visible rather than scattered across
 line-item entries, and lets the Step 6 conformance check verify the aggregate
 was loaded. Omit this sub-section for skills with only flat-file prerequisites.>

## Pre-flight Check                      [canon-mutating, and meta-tooling skills that read world state or allocate monotonic IDs — before Phase 0]
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
where a Validation Rule enforcement lives. For canon-reading skills whose
output carries in-world content, and for canon-mutating skills, a Canon
Safety Check phase (see below) fits as the last phase before Commit;
the generated skill numbers it concretely based on its own phase count.>

## Canon Safety Check phase             [canon-reading with in-world output; recommended for canon-mutating]
<Placed after the last operational phase and before Commit. Per-artifact sub-phases:
 - Invariant conformance (vs INVARIANTS.md) — record tested invariant ids
 - Mystery Reserve firewall (vs MYSTERY_RESERVE.md) — record every checked MR id, overlap or not
 - Distribution/scope conformance (vs CANON_LEDGER.md distribution blocks)
 Repair Sub-Pass on any fail; unrepairable → loop to earliest relevant phase.
 For batch-producing skills: add a batch-level check as a peer sub-phase catching
 cross-artifact collisions (e.g., two artifacts jointly resolving a Mystery Reserve
 entry that neither alone would).>

## Phase N+1: Commit / Write            [canon-mutating — after final validation phase; canon-reading with HARD-GATE — after final validation phase]
<The HARD-GATE enforcement point. This phase:
 - presents the complete deliverable summary to the user
 - waits for explicit user approval (HARD-GATE fires here)
 - on approval: atomic write of all output files under `worlds/<world-slug>/` (or the declared scope)
 - emits the Change Log Entry per `templates/change-log-entry.yaml`  [canon-mutating only]
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
| <Principle that does not apply to this skill's class> | N/A | Not applicable — <one-line reason + handoff path to the sibling skill that handles this>. |

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

Each section presentation must end with a `**Notes on the shape:**` bullet list explaining *why* the concrete choices were made — especially:
- deviations from sibling skills (what was borrowed vs what was changed and why)
- design decisions that fell out of gap-filler answers (cite the question number or topic)
- rationales that would not be obvious from the section text alone

**Bullet count**: typically 2-4 bullets for short sections (frontmatter, HARD-GATE, short Guardrails). Expand to up to 8 bullets for sections presenting 5+ concrete design decisions — e.g., a phase breakdown with 6+ phases, a FOUNDATIONS Alignment table with multiple N/A rows, a dense Validation Rules section citing multiple enforcement phases per rule. The intent is one substantive rationale per non-obvious decision. Compression that hides reasoning to hit a bullet count defeats the purpose of the rule; padding to reach a minimum also defeats it. Match the count to the number of decisions made.

This makes approval gating substantive rather than ceremonial. The user should be able to accept or push back on each design decision, not just on the wording. A section presented without rationale notes is an invitation to rubber-stamp approval — avoid it.

### FOUNDATIONS Alignment N/A Rows

Some principles legitimately do not apply to a given skill's class — e.g., `Change Control Policy` for canon-reading skills (no Change Log Entry emitted); `Rule 5 (No Consequence Evasion)` for meta-tooling audit skills (no canon facts produced); `Rule 6 (No Silent Retcons)` for canon-reading skills. When a row is N/A, mark it explicitly in this form:

```
| Change Control Policy | N/A | Not applicable — canon-reading skill does not emit Change Log Entries; handoff to `canon-addition` for world-level canon changes. |
```

Never omit N/A rows silently — an empty row is indistinguishable from an oversight. The explicit `N/A + reason + sibling-handoff` form shows the reader that the principle was considered and deliberately skipped, and names the sibling skill that DOES honor it. This makes the alignment table a complete audit of all FOUNDATIONS principles, not a partial one.

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
- [ ] If the output carries in-world knowledge, beliefs, or capabilities (diegetic texts, character data, faction profiles, event seeds, option cards, or any artifact whose content could leak Mystery Reserve forbidden answers): includes a Canon Safety Check phase preventing accidental mystery resolution, restricted-knowledge leaks, or silent canon creation (Rule 7: Preserve Mystery Deliberately). This gate matches the failure mode it catches: any artifact carrying in-world content, not only text artifacts.
- [ ] If proposal-generating (produces candidate facts): explicit note that output is NOT canon until it passes the canon-addition skill.
- [ ] If the output carries in-world content: Rule 7 is explicitly listed in the generated skill's "Validation Rules This Skill Upholds" section (the Canon Safety Check phase satisfies the structural check above; listing Rule 7 in the Validation Rules section is the separate documentation check).
- [ ] **Commit / Write phase (conditional on HARD-GATE)**: if the skill declares a HARD-GATE (recommended for canon-reading whose deliverable exceeds ~3 files or requires explicit user review), it must also declare an explicit **Commit / Write phase** *after* the final validation phase where the gate fires on user approval and atomic writes happen. A HARD-GATE without a named Commit phase has nowhere to fire and fails this check. Canon-reading skills without a HARD-GATE (rare — e.g., single-file generators with trivial deliverables) are exempt.
- [ ] **World-scope declaration**: the skill names exactly one of {single-world, all-worlds, meta} as its operating scope. If single-world, a required `world_slug` argument is declared, and all world-file reads are rooted at `worlds/<world-slug>/` — never at repo root.

### meta-tooling Additional Checks

- [ ] Output is report-shaped (findings, severity tables, repair menus) — not canon-write-shaped.
- [ ] Contains an explicit rule: "This skill proposes changes; it does not apply them."
- [ ] If audit-class: uses severity levels (Cosmetic → Canon Break) matching FOUNDATIONS §Continuity or locally defined.
- [ ] If the skill reads world state OR allocates monotonic IDs for output artifacts: includes a **Pre-flight Check** section before Phase 0 that loads `docs/FOUNDATIONS.md`, verifies required world files are readable, and allocates/reserves any monotonic IDs the skill emits.
- [ ] **World-scope declaration**: the skill names exactly one of {single-world, all-worlds, meta} as its operating scope. If single-world, a required `world_slug` argument is declared and all world-file reads are rooted at `worlds/<world-slug>/` — never at repo root.
- [ ] **ID allocation discipline** (if outputs use monotonic IDs like AU-NNNN, RP-NNNN): IDs allocated at pre-flight by scanning the existing output directory; collisions abort with a specific-id error; dropped IDs (from user drop-list at commit) become permanent gaps and are never reused.

Report results in this format:

```
FOUNDATIONS Conformance Check — <slug> — class: <class>
✅ Universal: <N>/<N>
✅ Class-specific: <N>/<N>
❌ Blocking findings:
  - <section>: <specific gap>
```

When the Blocking findings count is zero (the clean-audit case), replace the last two lines with a single `✅ No blocking findings.` line on its own. The `❌ Blocking findings:` bullet-list form is reserved for non-empty findings — using it with "none" creates a visual contradiction between the ❌ mark and the empty state.

## Step 7: Write Files

Only reachable if Step 6 passes clean AND all design sections were user-approved.

1. Write `.claude/skills/<slug>/SKILL.md`.
2. Write `.claude/skills/<slug>/templates/*.yaml` for each Canon Fact Record or Change Log Entry schema the skill references. **Start from skill-creator's own `.claude/skills/skill-creator/templates/canon-fact-record.yaml` and `.claude/skills/skill-creator/templates/change-log-entry.yaml`** — these are the canonical generic references (already loaded into context at Step 1). Do NOT start from a sibling skill's templates (e.g., `create-base-world/templates/*.yaml`) — those are specialized copies that have drifted from the generic by design, and re-deriving from them propagates per-sibling comments into new skills. Copy the generic, then trim fields that do not apply and adjust phase references to match the new skill's numbering.
3. Write `.claude/skills/<slug>/templates/<output-type>.md` (or `.yaml`) if the skill has a primary output format that is neither a Canon Fact Record nor a Change Log Entry — e.g., a character dossier, a diegetic artifact, a proposal card, an adjudication report, a triage file. These are NOT copies of skill-creator's generic CF/Change-Log references (those apply only when the skill emits CF records or Change Log Entries directly — covered by step 2). Two sub-classes with different authoring disciplines:
   - **(a) Templates structurally parallel to a sibling skill's downstream input format** — e.g., a proposal card that `canon-addition` consumes (CF-schema parity), a retcon-proposal card, a character proposal card that `character-generation` consumes (character-brief-schema parity), or any candidate-record whose fields a downstream sibling will field-copy at parse time. **Derive from that sibling's template**: copy the structure, adjust phase references to match the new skill's numbering, add skill-specific fields, and **preserve the downstream sibling's parse-time field schema byte-for-byte** so downstream acceptance is a field-copy rather than a field-re-derivation. The specific fields to preserve depend on the consumer: for `canon-addition` consumers, preserve CF-schema parity (`type`, `scope` / `recommended_scope`, `domains_affected` / `domains_touched`, `distribution`, `source_basis`); for `character-generation` consumers, preserve its Phase 0 required+optional input fields (`current_location`, `place_of_origin`, `date`, `species`, `age_band`, `social_position`, `profession`, `kinship_situation`, `religious_ideological_environment`, `major_local_pressures`, `intended_narrative_role`, + optional `central_contradiction` / `desired_emotional_tone` / `desired_arc_type` / `taboo_limit_themes`); for other siblings, preserve whatever schema their parse-time step consumes. Document the parity intent + named consumer in a frontmatter comment so future maintainers preserve it across schema evolution. Examples: `propose-new-canon-facts/templates/proposal-card.md` (canon-addition consumer), `canon-facts-from-diegetic-artifacts/templates/proposal-card.md` (canon-addition consumer), `propose-new-characters/templates/proposal-card.md` (character-generation consumer).
   - **(b) Templates for output formats unique to this skill** — no downstream sibling consumer, no parse-time parity obligation. **Authored from scratch** against the skill's Output specification. Examples: `character-generation/templates/character-dossier.md`, `diegetic-artifact-generation/templates/diegetic-artifact.md`.

   Canon-reading skills with in-world outputs that have no downstream-sibling consumer need sub-class (b) (e.g., character dossiers, diegetic artifacts written for world-level storage); canon-reading skills producing candidate records consumed by a downstream sibling need sub-class (a) (whether the consumer is `canon-addition` for CF proposals, `character-generation` for character proposal cards, or any future sibling with a parse-time schema); canon-mutating skills may need either or both in addition to the CF/Change-Log templates. Sibling derivation (sub-class a) is the correct pattern whenever the template's consumer is a named downstream skill — "from scratch" applies only to sub-class (b), not as a blanket rule.
4. Write `.claude/skills/<slug>/examples/*.md` for approved worked examples (max 2). Skip if none were selected. **Skeletal-to-hybrid expansion**: If the source proposal's example is in a skeletal register (YAML-only, frontmatter-only, prose-fragment-only, or structured-fields-without-body) and the generated skill's output format is richer (hybrid frontmatter + markdown body, multi-section, multi-file), expand the example faithfully — derive body prose from the skeletal fields plus the proposal's phase definitions, preserving the example's semantic content and scaling each field into the section or subsection that field maps to. Flag the expansion in the example's header comment ("Adapted from the source proposal's <NNNN> example: YAML-only source expanded to hybrid format per this skill's Phase <N> output schema") so a maintainer can trace derived-from-source. Do NOT invent new semantic content during expansion — limit additions to what the skeletal source implies or what the skill's own phase definitions dictate.
5. **Compile mode only**: move the source file from `brainstorming/` to `archive/brainstorming/` **preserving its original filename** — do NOT rename on archival even if the final skill slug differs from the source filename (the source filename is a separate identifier from the skill slug, and preserving it keeps the authored-name audit trail intact). If `archive/brainstorming/` does not yet exist, run `mkdir -p archive/brainstorming/` first. Choose the move command by tracked-state:
   - **When the source is tracked**: use `git mv brainstorming/<source-filename> archive/brainstorming/<source-filename>` — it preserves rename history so the proposal-to-skill lineage stays legible in `git log --follow`.
   - **When the source is untracked** (the common case for fresh brainstorming files produced by the `brainstorm` skill or authored outside git's index): use plain `mv brainstorming/<source-filename> archive/brainstorming/<source-filename>`. An untracked file has no rename history to preserve, and `git mv` will fail with `fatal: not under version control`.
   - **Detection pattern**: `git ls-files --error-unmatch brainstorming/<source-filename>` exits zero when tracked. On non-zero exit, fall back to plain `mv`. Alternatively, try `git mv` first and fall back to `mv` on the specific "not under version control" error — both patterns are acceptable.

   In fresh mode the proposal stays in `brainstorming/` as the durable spec.
6. Report paths written. Do NOT commit.

## Step 8: Next-Steps Menu

```
Skill written to .claude/skills/<slug>/SKILL.md
<list any templates/examples written>
<note archive move if applicable>

What would you like to do next?
1. Invoke the new skill to test it on real input
2. Create another skill from a different proposal
3. Run `skill-audit` on the new skill (structural audit, no invocation)
[N]. Run `skill-audit` on `<downstream-sibling>` to address <out-of-scope concern>   [conditional — only appears when out-of-scope concerns were raised during the interview per Step 4 §Out-of-scope concerns raised during interview]
<N+1>. Done for now — I'll review the skill file later
```

**Conditional out-of-scope-concern option**: If the user raised a concern about a downstream sibling skill during the gap-filler interview (per Step 4 §Out-of-scope concerns raised during interview), insert a menu item naming that sibling and the concern. The item's purpose is to give the user a concrete follow-up path without re-typing the concern from scratch. Omit the item entirely when no out-of-scope concerns were raised. The numbering shifts: "Done for now" is always the last item.

If the user invokes a sibling skill, the session ends cleanly — skill-creator does not chain.

## Classification Heuristics

When the pipeline's class is ambiguous, apply these heuristics in order:

1. **Does the output include file writes to any of `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `CANON_LEDGER.md`, or named world-state files?** → canon-mutating.
2. **Does the output include new Canon Fact Record entries (even candidates)?** → If the skill itself applies them: canon-mutating. If it only proposes them for separate adjudication: canon-reading.
3. **Does the output include in-world artifacts that are not world-level canon (diegetic texts, character data, faction profiles, option cards, event seeds, or other artifacts whose content could leak canon-adjacent state)?** → canon-reading. These artifacts are NOT canon; they are voices or instances from within canon.
4. **Does the output include only reports, severity findings, or repair menus?** → meta-tooling.
5. **Does the skill accept/reject/revise existing canon?** → canon-mutating, even if its typical output is rejection.

## Guardrails

- The generated `SKILL.md` must be self-contained — a reader should not need skill-creator to run it.
- Do NOT duplicate FOUNDATIONS.md content inline. Cross-reference: "see FOUNDATIONS.md §Validation Rules".
- Generated `SKILL.md` target sizes differ by class: ~300 lines for meta-tooling; ~400 lines for canon-reading without diegetic in-world content; ~500 lines for canon-reading with diegetic in-world content (Rule 7 firewall triples the safety-check surface) or canon-mutating. These are targets, not hard caps — a canon-mutating skill with consequence-propagation across many domains, OR an audit-class meta-tooling skill with many category sub-passes plus layered validation (e.g., 10+ sub-categories × severity classification × multi-phase validation gates), may reasonably land at 550+ lines. If a proposal is long (e.g., 500+ lines), push verbose phase prose into `templates/` or trim to the enforceable core; the skill file is a runtime contract, not a recapitulation of the proposal. Do NOT delete required structural elements (HARD-GATE, World-State Prerequisites, Validation Rules upheld, FOUNDATIONS Alignment table) to hit a target size.
- skill-creator NEVER edits `docs/FOUNDATIONS.md`. FOUNDATIONS lives outside this tool's authority.
- skill-creator NEVER writes world-state files (`WORLD_KERNEL.md` etc.). Those are the jobs of canon-mutating skills, not the meta-skill.
- No scope inflation: generate one skill per invocation. If the user asks for a suite, confirm each individually.
- Worktree discipline: if in a worktree, all paths resolve from the worktree root.
- One question per message during interviews. Never batch substantive questions. (Routine confirmable assumptions under auto mode may accompany a single substantive question — see Step 4 Protocol §Auto mode compression.)
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
