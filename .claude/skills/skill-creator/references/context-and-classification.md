# Context, Mode Detection, and Pipeline Classification

Covers Step 1 (read context), Step 2 (mode detection + pipeline classification), and the Classification Heuristics applied when the pipeline's class is ambiguous.

## Step 1: Read Context

1. **FOUNDATIONS.md — always.** Read the whole file. You will cite specific sections during drafting (Canon Layers, Validation Rules, Canon Fact Record Schema, Tooling Recommendation).
2. **Reference proposal — if `reference_path` provided.** Read fully. Extract: Purpose, Inputs (Required/Optional), Output, Phase list, Rules, Validation/Rejection tests, YAML schemas, Final Rule. Note which sections are missing — those become gap-filler targets in the gap-filler step.
3. **skill-creator's own reference templates — when (a) the target pipeline is canon-mutating and may emit Canon Fact Records or Change Log Entries, OR (b) the target is canon-reading and its output schema is intentionally parallel to the CF Record Schema for downstream canon-addition compatibility.** Read `.claude/skills/skill-creator/templates/canon-fact-record.yaml` and `.claude/skills/skill-creator/templates/change-log-entry.yaml` — the canonical generic references the write-files step copies into every new skill's `templates/`. Sibling skills (e.g., `create-base-world`) ship specialized copies; treat as illustrative only. The write-files step's derivation rule (copy from generic, never from sibling specialization) is authoritative.
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
| **canon-mutating** | Writes or alters `_source/<subdir>/*.yaml` records (CF / CH / INV / M / OQ / ENT / SEC) via the patch engine, OR alters `WORLD_KERNEL.md` / `ONTOLOGY.md`. | Pipeline output includes atomic-record creation or modification; pipeline accepts/rejects/revises canon facts; pipeline creates initial world state. |
| **canon-reading** | Consumes world-state; produces artifacts that are NOT world-level canon (diegetic texts, characters, option cards, event seeds). May operate in a **pre-world subclass mode** where the primary input is a user preference document and cross-world reading is for distinctness only — the skill emits IDs at pipeline scope, writes to a root-level surface (e.g., `world-proposals/`), and feeds `create-base-world` rather than `canon-addition`. | Pipeline output is downstream artifacts, proposals, or candidates requiring separate adjudication before they reach canon. |
| **meta-tooling** | Operates on canon structure and pipeline infrastructure (audits, linters, retcon management, spec/ticket/plan generation). Produces reports, recommendations, pipeline-level work artifacts, or HARD-GATE-gated mutations to existing pipeline files (skill prose, validator fixtures, hook configs); never writes world-level canon by its own authority. Sibling precedent: `skill-consolidate` (in-place SKILL.md rewrite) and `story-skill-internal-coherence` (HARD-GATE-gated correction of family-member skill files) are both legitimate meta-tooling skills under this row. | Pipeline output is findings, severity reports, repair menus, or pipeline-level work artifacts (tickets, specs, plans, triage files, validator configs). |

State the classification to the user explicitly and wait for acknowledgment (`ok`, `agree`, `proceed`, or — under auto mode — silence after one beat is acceptable). If the user pushes back, reclassify before advancing — classification drives the conformance-check step's enforcement.

**Edge case**: If a pipeline spans classes (e.g., produces both a report AND conditional canon writes), classify by its *strongest* action. A pipeline that may write canon is canon-mutating, even if it often only reports.

## Classification Heuristics

When the pipeline's class is ambiguous, apply these heuristics in order:

1. **Does the output include file writes to any of `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `_source/<subdir>/*.yaml` record (CF / CH / INV / M / OQ / ENT / SEC)?** → canon-mutating.
2. **Does the output include new Canon Fact Record entries (even candidates)?** → If the skill itself applies them: canon-mutating. If it only proposes them for separate adjudication: canon-reading.
3. **Does the output include in-world artifacts that are not world-level canon (diegetic texts, character data, faction profiles, option cards, event seeds, or other artifacts whose content could leak canon-adjacent state)?** → canon-reading. These artifacts are NOT canon; they are voices or instances from within canon.
4. **Does the output include reports, severity findings, repair menus, pipeline-level work artifacts (tickets, specs, plans, triage files, validator configs), or HARD-GATE-gated mutations to existing pipeline files (skill prose, validator fixtures, hook configs) — rather than world-level canon?** → meta-tooling.
5. **Does the skill accept/reject/revise existing canon?** → canon-mutating, even if its typical output is rejection.
6. **Does the skill operate BEFORE any world exists — i.e., its primary input is a user preference document and its output feeds `create-base-world` to bootstrap a new world?** → canon-reading in **pre-world subclass mode** (per the canon-reading row of the classification table). Pre-world canon-reading skills emit IDs at pipeline scope (e.g., NWP-<integer>), write to a root-level surface (e.g., `world-proposals/`), and may read existing worlds for distinctness only — see the gap-filler interview's §"World scoping" for the meta-with-multi-world-read scope label that pairs with this subclass. Distinct from meta-tooling (which produces reports rather than in-world content) and from standard canon-reading (which operates on an existing single world).
