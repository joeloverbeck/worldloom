# Brainstorm Skill Adaptation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adapt `.claude/skills/brainstorm-worldwake/SKILL.md` into a worldloom-local `.claude/skills/brainstorm/SKILL.md`, stripping all references to the source repo's Rust simulation engine while preserving the confidence-driven interview machinery. Then delete the source skill.

**Architecture:** Surgical strip approach (per approved design). Open the source SKILL.md and the design doc side-by-side. Build the new skill section-by-section, copying preserved sections verbatim and rewriting only the sections that contain worldwake-specific terminology or deliverable types. Use graceful fallbacks for `specs/`, `tickets/`, `docs/spec-drafting-rules.md`, and `specs/IMPLEMENTATION-ORDER.md` (none exist in worldloom yet).

**Tech Stack:** Markdown + YAML frontmatter only. No code, no tests in the executable sense — verification is via `Grep` checks for forbidden terms and a final manual skim.

**Reference documents:**
- Design: `docs/plans/2026-04-18-brainstorm-skill-adaptation-design.md`
- Source skill: `.claude/skills/brainstorm-worldwake/SKILL.md`
- Worldloom canon framework: `docs/FOUNDATIONS.md`

**Forbidden terms in the new skill** (verification grep target):
- `brainstorm-worldwake`
- `Permille`, `SystemFn`, `FND-26`, `Component Registration`
- `Adjunct Wave`, `IMPLEMENTATION-ORDER` (except inside conditional fallback prose)
- `.ron`, `golden_*.rs`, `golden test`
- `planner changes`, `action handlers`, `simulation behavior`, `engine architecture`, `component logic`
- `dev-tooling crate`, `workspace member`, `Rust crate`
- `1-3-1 rule`

---

### Task 1: Create new skill directory and scaffold SKILL.md frontmatter

**Files:**
- Create: `.claude/skills/brainstorm/SKILL.md`

**Step 1: Create the directory**

Run: `mkdir -p .claude/skills/brainstorm`
Expected: silent success.

**Step 2: Write the frontmatter and HARD-GATE block**

Write to `.claude/skills/brainstorm/SKILL.md`:

```markdown
---
name: brainstorm
description: "Use when starting a new feature, design, or architectural decision that needs requirements discovery before implementation. Triggers: vague requests, exploration keywords, uncertainty about what to build, need for external research before designing."
user-invocable: true
arguments:
  - name: request
    description: "The brainstorming topic or question (string). Can be a simple sentence or a detailed description."
    required: true
  - name: reference_path
    description: "Optional path to a reference file (report, brainstorming doc, analysis) to read as context before starting the interview."
    required: false
---

# Brainstorm

Confidence-driven collaborative brainstorming. Interviews you until it understands what you **actually want** — not what you think you should want — then proposes approaches, builds a design, and lets you choose what happens next.

<HARD-GATE>
Do NOT write any code, scaffold any project, invoke any implementation skill, or take any implementation action until you have presented a design and the user has explicitly approved it. This applies to EVERY topic regardless of perceived simplicity.
</HARD-GATE>

## Process Flow

```
Read context (reference file + detect topic type)
         |
         v
Confidence-driven interview loop (target: 95%)
         |
         v
Propose 2-3 approaches with tradeoffs
         |
         v
Present design section by section, get approval per section
         |
         v
[If canon-related] Validate against FOUNDATIONS.md
         |
         v
Write design doc to docs/plans/
         |
         v
Next-steps menu (user chooses)
```

**In plan mode**: design doc writes to the plan file instead of `docs/plans/`, and `ExitPlanMode` replaces the next-steps menu.
```

**Step 3: Verify the file exists and has valid frontmatter**

Run: `head -20 .claude/skills/brainstorm/SKILL.md`
Expected: shows the frontmatter with `name: brainstorm` and the HARD-GATE block.

**Step 4: Commit**

```bash
git add .claude/skills/brainstorm/SKILL.md
git commit -m "feat(brainstorm): scaffold new skill with frontmatter and process flow"
```

---

### Task 2: Append Step 1 (Read Context) with worldloom classification taxonomy

**Files:**
- Modify: `.claude/skills/brainstorm/SKILL.md` (append)
- Reference: `.claude/skills/brainstorm-worldwake/SKILL.md` lines covering "Step 1: Read Context"

**Step 1: Open both files for comparison**

Read the worldwake "Step 1: Read Context" block (sub-steps 1-7). The structure is preserved; only sub-step 2 (topic classification), sub-step 3 (FOUNDATIONS.md branching), and the simulation references in sub-step 7 change.

**Step 2: Write the adapted Step 1**

Append to `.claude/skills/brainstorm/SKILL.md`. Key changes from source:

- **Sub-step 2** (topic classification): replace the three categories with worldloom semantics:
  - `canon-related`: Designs that affect the world model itself or the canon-handling logic — new pipelines, changes to how canon facts are validated/derived/scoped, new world-file types, modifications to invariants/ontology/relation handling, anything that produces or mutates files like `WORLD_KERNEL.md`, `INVARIANTS.md`, `CANON_LEDGER.md`.
  - `tooling-adjacent`: Project tooling that doesn't change canon semantics — CLI cosmetics, doc generators, build/test scripts, dev ergonomics.
  - `non-implementation`: No code changes — process, workflow, strategy, skill design, tooling configuration.
- **Sub-step 3**: "If canon-related OR if the topic directly concerns FOUNDATIONS.md principles: Read `docs/FOUNDATIONS.md`. You will need it in Steps 3 and 4 to validate proposed approaches against canon principles. For tooling-adjacent topics, reading FOUNDATIONS.md is optional — only read it if the topic touches canon-handling logic or canon artifacts."
- **Sub-step 4** (calibration): keep verbatim except remove the worldwake-specific phrases "observer runs, code analysis, debugging" — replace with neutral "prior investigation, file analysis, debugging".
- **Sub-step 5** (skip threshold) and sub-step 6 (research): keep verbatim.
- **Sub-step 7** (project context): keep the structure but replace "specs and tickets" with "specs, tickets, brainstorming proposals, or world files" and remove the worldwake "remediation specs / planner / observer" references — replace with neutral "remediation attempts, escalating complexity, or accumulated workarounds".

**Step 3: Verify no forbidden terms slipped in**

Run: `Grep -n "Permille|SystemFn|FND-26|\.ron|planner|action handler|component logic|simulation" .claude/skills/brainstorm/SKILL.md`
Expected: no matches.

**Step 4: Commit**

```bash
git add .claude/skills/brainstorm/SKILL.md
git commit -m "feat(brainstorm): add Step 1 with worldloom topic classification"
```

---

### Task 3: Append Step 2 (Confidence-Driven Interview) verbatim

**Files:**
- Modify: `.claude/skills/brainstorm/SKILL.md` (append)

**Step 1: Copy the entire "Step 2: Confidence-Driven Interview" block from worldwake verbatim**

This includes: The Protocol, Interview Rules (rules 1-9), Confidence Scoring Guide table, Plan Mode Interview, Early Exit, Recovery/Reset Brainstorms.

**Worldwake-specific phrases to replace** (only these, nothing else):
- In Recovery/Reset → "structural (architecture) or tactical (configuration, scenario design, missing profiles)" → change to "structural (architecture) or tactical (configuration, content design, missing inputs)"

Everything else (rule wording, confidence ranges, plan-mode handling, fast-track plan-mode flow, fast-track assumption disclosure) ports verbatim.

**Step 2: Verify no forbidden terms**

Run: `Grep -n "Permille|SystemFn|FND-26|\.ron|golden|planner|action handler|component logic|simulation behavior|engine architecture" .claude/skills/brainstorm/SKILL.md`
Expected: no matches.

**Step 3: Commit**

```bash
git add .claude/skills/brainstorm/SKILL.md
git commit -m "feat(brainstorm): port Step 2 confidence-driven interview"
```

---

### Task 4: Append Step 3 (Propose Approaches) with canon-related reframing

**Files:**
- Modify: `.claude/skills/brainstorm/SKILL.md` (append)

**Step 1: Copy the "Step 3: Propose Approaches" block from worldwake**

Make these changes:

- **"If implementation-related (not implementation-adjacent)"** → **"If canon-related (not tooling-adjacent)"**
- The format example `Foundations: F1 (aligns), F8 (tensions — [reason])` stays — it's a generic format for citing FOUNDATIONS principles. Worldloom's FOUNDATIONS doesn't number principles, so soften: `Foundations: <principle name> (aligns), <principle name> (tensions — [reason])`. Example: `Foundations: Canon Layering (aligns), Validation Rule 3 — No Specialness Inflation (tensions — proposed feature adds exceptional capability without integrating consequences)`.
- Triage approval, multiple-deliverable handling, and "if the user challenges an option's dismissal" sections: port verbatim.
- The reference to `specs/IMPLEMENTATION-ORDER.md` in the "multiple deliverables" paragraph: keep the text but add a parenthetical: `(if the file exists; see Step 5 for fallback handling)`.

**Step 2: Verify no forbidden terms**

Run: `Grep -n "Permille|SystemFn|FND-26|\.ron|golden|planner|action handler|component logic|simulation behavior|engine architecture|implementation-related|implementation-adjacent" .claude/skills/brainstorm/SKILL.md`
Expected: no matches (the new file uses canon-related/tooling-adjacent terminology only).

**Step 3: Commit**

```bash
git add .claude/skills/brainstorm/SKILL.md
git commit -m "feat(brainstorm): port Step 3 with canon-related reframing"
```

---

### Task 5: Append Step 4 (Present Design) with canon-related reframing

**Files:**
- Modify: `.claude/skills/brainstorm/SKILL.md` (append)

**Step 1: Copy the "Step 4: Present Design" block from worldwake**

Make these changes:

- All `implementation-related` → `canon-related`
- All `implementation-adjacent` → `tooling-adjacent`
- In section 7 (FOUNDATIONS.md alignment): replace the worldwake-specific examples ("derived views, data persistence, debuggability surfaces") with worldloom-relevant ones: "canon-handling logic, world-file persistence, canon-validation surfaces, or other concepts mapped to specific FOUNDATIONS principles".
- The "Classification pivot check" example: replace "tooling configuration now requires a new Rust crate" with "tooling configuration now requires a new world-file type" and "spec now includes live code changes" stays.

Per-section approval rule, batching threshold, plan-mode whole-plan approval: port verbatim.

**Step 2: Verify no forbidden terms**

Run: `Grep -n "Permille|SystemFn|FND-26|\.ron|golden|planner|action handler|component logic|simulation behavior|Rust crate|implementation-related|implementation-adjacent" .claude/skills/brainstorm/SKILL.md`
Expected: no matches.

**Step 3: Commit**

```bash
git add .claude/skills/brainstorm/SKILL.md
git commit -m "feat(brainstorm): port Step 4 with canon-related reframing"
```

---

### Task 6: Append Step 5 (Write Design Doc) with stripped deliverable branches and graceful fallbacks

**Files:**
- Modify: `.claude/skills/brainstorm/SKILL.md` (append)

This is the largest revision. The worldwake Step 5 enumerates ~10 deliverable-type branches; the worldloom version keeps a curated subset.

**Step 1: Write the deliverable-classification branches**

In order:

1. **Skill design topic** → deliverable IS the skill file at `.claude/skills/<name>/SKILL.md`. Skip `docs/plans/`. Plan-mode + skill-deliverable rule: write the plan file first (under 120 lines), write the SKILL.md as the first implementation step after `ExitPlanMode`. Adjust Step 6 menu (omit "create a spec", offer "skill review" instead).
2. **Modifying/reconciling existing skills** → deliverable IS the modified skill file(s). Skip `docs/plans/`. If merging, deliverable includes new unified file, deletion of superseded directories, updated cross-references. Verbatim from worldwake.
3. **Replaces existing artifact** → replacement plan must include (a) confirming deletion, (b) checking cross-references in other skills/CLAUDE.md/MEMORY.md, (c) noting replacement in design doc. Verbatim.
4. **System spec** → deliverable IS the spec file in `specs/`. Skip `docs/plans/`. **Graceful fallback**: if `docs/spec-drafting-rules.md` exists, follow it; if absent, write the spec with default sections (Problem Statement, Approach, FOUNDATIONS Alignment, Verification, Out of Scope) and add a top-of-file note: `<!-- spec-drafting-rules.md not present; using default structure. -->`. Update `specs/IMPLEMENTATION-ORDER.md` only if it exists; otherwise note the omission in the Step 6 summary. Step 6 menu template (port verbatim from worldwake) but replace the Adjunct Wave paragraph with: "If `specs/IMPLEMENTATION-ORDER.md` exists, append the new spec to it under an appropriate heading. If absent, skip the index update and note this in the Step 6 summary."
5. **Triage producing ≥2 specs or ≥3 tickets** → additionally write `docs/triage/YYYY-MM-DD-<topic>-triage.md` (under 80 lines, accepted+dismissed+follow-up). Verbatim except remove the "Adjunct Wave" reference.
6. **Hybrid deliverables (code + spec)** → plan file describes full sequence. Plan line budget ~100 + 20*(N-1) lines. Verbatim.
7. **Pre-deliverable data-gathering** → if the deliverable requires data that doesn't yet exist (new instrumentation, diagnostics, or data-gathering tooling), the plan includes a pre-deliverable phase. Port verbatim — the rule is generic.
8. **Implementation tickets** → deliverable IS the ticket file(s) in `tickets/`. **Graceful fallback**: if `tickets/_TEMPLATE.md` and `tickets/README.md` exist, follow them; if absent, write a minimal ticket with Title, Context, Acceptance Criteria, Verification, and add a top-of-file note. Adjust Step 6 menu (omit "create a spec", offer "implement ticket" or "reassess ticket").
9. **Pipeline / feature proposal in `brainstorming/`** → NEW worldloom-specific branch. When the design produces a new worldloom canon-pipeline (similar to existing `brainstorming/canon-addition.md`, `brainstorming/create-base-world.md`), the deliverable IS the proposal file at `brainstorming/<topic>.md`. Skip `docs/plans/`. The proposal file follows the structure of existing files: Purpose, Inputs, Output Bundle (or equivalent), Process, Validation. Adjust Step 6 menu accordingly.

**Drop entirely** (do not include these worldwake-only branches):
- "Enhanced diagnostics or investigative tooling" (observer-improvements + evidence-driven fixes)
- "Scenario file with golden tests"
- "New dev-tooling crate, workspace member, or external-interface tool"

**Step 2: Write the deliverable-pivot rule**

Port verbatim: "If the user redirects the deliverable type mid-brainstorm, reclassify using the rules above and adjust the flow accordingly. In plan mode, rewrite the plan file to match the new deliverable type before calling ExitPlanMode. Do not ask the user to confirm the pivot — they just told you what they want."

**Step 3: Write the design-doc write rules**

Port verbatim: plan-mode → write to plan file; otherwise → `docs/plans/YYYY-MM-DD-<topic>-design.md`. Include "Brainstorm Context" header (original request, reference file, key interview insights, final confidence score, assumptions). "Do NOT commit the file."

**Step 4: Write the post-implementation plan-update rule**

Port verbatim.

**Step 5: Verify no forbidden terms**

Run: `Grep -n "Permille|SystemFn|FND-26|\.ron|golden|planner|action handler|component logic|simulation behavior|Rust crate|workspace member|Adjunct Wave|observer run|1-3-1" .claude/skills/brainstorm/SKILL.md`
Expected: no matches.

**Step 6: Commit**

```bash
git add .claude/skills/brainstorm/SKILL.md
git commit -m "feat(brainstorm): port Step 5 with worldloom deliverable types and fallbacks"
```

---

### Task 7: Append Step 6 (Next Steps Menu) verbatim

**Files:**
- Modify: `.claude/skills/brainstorm/SKILL.md` (append)

**Step 1: Copy the "Step 6: Next Steps Menu" block from worldwake**

```markdown
## Step 6: Next Steps Menu

Present the user with options for what to do next:

\```
Design doc written to docs/plans/YYYY-MM-DD-<topic>-design.md

What would you like to do next?
1. Write an implementation plan (invoke writing-plans skill)
2. Create a spec from this design (write to specs/)
3. Start implementing directly
4. Done for now — I'll review the design doc later
\```

Use AskUserQuestion when its schema is already available in the session. Inline numbered options (as shown above) are an acceptable fallback when AskUserQuestion is deferred and fetching its schema would add friction. If the user picks an option that invokes another skill, invoke it. If they pick "done", end the session.

**If plan mode is active**: Call `ExitPlanMode` instead of presenting the next-steps menu. The user will direct next steps after approving the plan.

**If implementation was completed inline**: If the task was simple enough that implementation was completed during or immediately after design approval, skip the menu and summarize what was done.
```

No worldwake-specific content in this section. Direct port.

**Step 2: Commit**

```bash
git add .claude/skills/brainstorm/SKILL.md
git commit -m "feat(brainstorm): port Step 6 next-steps menu"
```

---

### Task 8: Append Guardrails section with worldloom adaptations

**Files:**
- Modify: `.claude/skills/brainstorm/SKILL.md` (append)

**Step 1: Copy the "Guardrails" block from worldwake**

Make these changes:

- The `FOUNDATIONS.md is authoritative` bullet: replace "For implementation topics" with "For canon-related topics".
- The `Blocker discovery during implementation` bullet: drop the "1-3-1 rule" reference (worldloom CLAUDE.md doesn't have this rule). Rewrite as: "If implementation reveals a worldloom limitation or architectural issue that blocks the brainstorm's deliverable, present the blocker, options, and recommendation. If the fix is small enough to do inline (< 50 lines of change), fix it and continue. If the fix is a separate architectural concern, create a ticket and either (a) work around the limitation in the current deliverable with a documented constraint, or (b) implement the fix if the user approves the scope expansion. Update the plan file to reflect the expanded deliverable set."
- All other bullets (YAGNI, one question at a time, no implementation before approval, worktree discipline, no scope inflation, respect early exit, auto mode interaction): port verbatim.

**Step 2: Final forbidden-terms verification**

Run: `Grep -n "brainstorm-worldwake|Permille|SystemFn|FND-26|\.ron|golden_|planner change|action handler|component logic|simulation behavior|engine architecture|Rust crate|workspace member|Adjunct Wave|observer run|1-3-1" .claude/skills/brainstorm/SKILL.md`
Expected: no matches.

**Step 3: Verify file size is materially smaller than source**

Run: `wc -c .claude/skills/brainstorm/SKILL.md .claude/skills/brainstorm-worldwake/SKILL.md`
Expected: new file roughly 25,000–32,000 bytes; source is ~37,000.

**Step 4: Commit**

```bash
git add .claude/skills/brainstorm/SKILL.md
git commit -m "feat(brainstorm): port Guardrails with worldloom adaptations"
```

---

### Task 9: Manual coherence skim

**Files:**
- Read: `.claude/skills/brainstorm/SKILL.md` (full file)

**Step 1: Read the new SKILL.md end-to-end**

Confirm:
- HARD-GATE present at top.
- Process Flow diagram references "canon-related" not "implementation-related".
- All six numbered Steps present and in order.
- Each preserved subsection (Recovery/Reset, fast-track plan mode, fast-track assumption disclosure, deliverable pivot, post-implementation plan update, auto mode interaction) reads coherently.
- The graceful-fallback notes for `spec-drafting-rules.md`, `tickets/_TEMPLATE.md`, `IMPLEMENTATION-ORDER.md` are visible and correctly conditional.
- The new `brainstorming/` proposal deliverable branch is present.
- Frontmatter parses (no broken YAML).

**Step 2: If any incoherence found, fix and re-commit**

If a section reads broken (orphan reference, dangling pronoun, conflicting instruction), edit and commit with message `fix(brainstorm): <what was fixed>`.

**Step 3: If clean, no commit needed — proceed to Task 10.**

---

### Task 10: Delete the brainstorm-worldwake source skill

**Files:**
- Delete: `.claude/skills/brainstorm-worldwake/` (entire directory)

**Step 1: Verify nothing else references the old skill name**

Run: `Grep -rn "brainstorm-worldwake" . --glob '!.git/*'`
Expected: matches only inside `docs/plans/2026-04-18-brainstorm-skill-adaptation-design.md` (the design doc references the source by name, which is correct historical context — leave as-is) and `docs/plans/2026-04-18-brainstorm-skill-adaptation-plan.md` (this plan, also correct). Zero matches anywhere else (no settings, no other skills, no CLAUDE.md, no MEMORY.md).

**Step 2: Delete the directory**

Run: `rm -rf .claude/skills/brainstorm-worldwake`
Expected: silent success.

**Step 3: Verify deletion**

Run: `ls .claude/skills/`
Expected: shows `brainstorm/` but no `brainstorm-worldwake/`.

**Step 4: Stage the deletion**

Run: `git add -A .claude/skills/`
Expected: `git status` shows the deletion staged.

**Step 5: Commit**

```bash
git commit -m "chore(brainstorm): remove brainstorm-worldwake source skill"
```

---

### Task 11: Final cross-reference verification

**Files:**
- Read: repo-wide grep results

**Step 1: Confirm the new skill is the only `brainstorm` skill present**

Run: `ls .claude/skills/ | grep -i brainstorm`
Expected: single line `brainstorm`.

**Step 2: Confirm no orphan references to the old skill outside the design and plan docs**

Run: `Grep -rln "brainstorm-worldwake" . --glob '!.git/*'`
Expected: only the two `docs/plans/2026-04-18-brainstorm-skill-adaptation-*.md` files.

**Step 3: Confirm no orphan worldwake-specific terms in the new skill**

Run: `Grep -n "brainstorm-worldwake|Permille|SystemFn|FND-26|\.ron|golden_|planner change|action handler|simulation behavior|engine architecture|Rust crate|workspace member|Adjunct Wave|observer run|1-3-1 rule" .claude/skills/brainstorm/SKILL.md`
Expected: zero matches.

**Step 4: Confirm git log shows the expected commit sequence**

Run: `git log --oneline -15`
Expected: a clean sequence of `feat(brainstorm): ...` commits ending with `chore(brainstorm): remove brainstorm-worldwake source skill`.

**Step 5: No commit needed — verification only.** If any check fails, return to the offending task and fix.

---

## Done When

- `.claude/skills/brainstorm/SKILL.md` exists, parses, and contains the full adapted content.
- `.claude/skills/brainstorm-worldwake/` no longer exists.
- All forbidden-term grep checks return zero matches inside the new skill file.
- All commits are individually focused (one Step per commit, plus the final deletion).
- No orphan references to `brainstorm-worldwake` exist outside the historical design and plan docs.
