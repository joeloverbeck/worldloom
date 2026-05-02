# Drafting the Skill Design (Step 5)

Present the draft in this order. Get user approval per section. After 2 consecutive approvals under auto mode (3 otherwise), batch remaining sections into groups of 2-3. Keep any substantially higher-risk section standalone. Under auto mode, after 5+ consecutive approvals with no substantive pushback, single-message batches covering all remaining sections are acceptable provided no section is higher-risk AND the Notes-on-the-shape discipline is preserved per section (rationale notes must still appear for each section in the batch). The "groups of 2-3" rule remains the default; the 5+-sustained-approval case is the explicit relaxation for prolonged agreement. The Phase breakdown exception below overrides this relaxation for Section 6 specifically — the two halves (pre/post seam) MUST be presented as a structured batch (either as a single message containing both halves clearly delineated as 6a + 6b, or as two consecutive standalone messages). Collapsing Section 6 + Sections 7–9 into one global single-message batch violates the higher-risk-section-standalone rule and is forbidden, because Section 6 is itself the highest-risk section per the Phase breakdown exception's existence; the relaxation rule's "no section is higher-risk" precondition is structurally not satisfiable when Section 6 is in the remaining batch.

**Phase breakdown exception**: Phase breakdowns routinely exceed 10 phases plus branch logic across all classes (canon-mutating consequence-propagation branches, canon-reading multi-sub-check Canon Safety phases, meta-tooling per-severity repair menus). When the phase breakdown exceeds ~8 phases OR contains explicit branch logic (accept/non-accept, pre/post-audit, pre/post Canon Safety Check), split into at most 2 presentations along a natural pipeline seam — pre/post Canon Safety Check [canon-reading with in-world output; canon-mutating], pre/post adjudication [canon-mutating], or pre/post escalation gate [canon-mutating with multi-critic phases]. Never split at an arbitrary phase number.

## Generated SKILL.md Template

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

<HARD-GATE>   [applicability per the gap-filler interview §HARD-GATE need]
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

[Choose one shape based on emission semantics. Default is the Flat-list shape; use the Table shape only when the skill emits multiple record classes per invocation with conditional emission semantics.]

[Flat-list shape — default; use when emission is unconditional (every invocation produces every named record) or when there is one primary artifact per invocation:]
- <artifact> — <format>
- <canon record> — matches FOUNDATIONS §Canon Fact Record Schema   [if canon-mutating]
- <change log entry> — matches templates/change-log-entry.yaml     [if canon-mutating]

[Table shape — use when the skill emits multiple record classes per invocation with conditional emission semantics (some classes always, some only when a triggering condition fires); the per-class conditionality is load-bearing for the runtime contract and a flat list buries it. The "Created when" column names the triggering condition explicitly:]
| Class | File path | Created when |
|---|---|---|
| <Always-class> | <path-template> | Always |
| <Conditional-class> | <path-template> | IF <triggering condition stated in skill phase prose> |

[Worked precedent: branching-story-page-cycle's §Output section uses the Table shape across 14+ classes ranging from "Always" (PG-NNNN, SE-NNNN, rendered prose) to "IF Phase 4 JIT expansion fired" (SLT-NNNN) to "IF a new story-local location is introduced this turn" (STLOC-NNNN) — Flat-list would have collapsed the per-turn conditionality that maintainers need to read off the runtime contract.]

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
 line-item entries, and lets the conformance-check step verify the aggregate
 was loaded. Omit this sub-section for skills with only flat-file prerequisites.>

## Pre-flight Check                      [canon-mutating; canon-reading skills with pipeline-scoped IDs, runtime-read supporting files, or first-run bootstrap surfaces; meta-tooling skills that read world state or allocate monotonic IDs — before Phase 0]
<Precondition checks that run before any pipeline phase:
 - load docs/FOUNDATIONS.md into working context
 - for single-world skills: resolve `worlds/<world-slug>/` from the world_slug argument
 - for bootstrap skills: verify the target `worlds/<world-slug>/` does NOT exist
 - for non-bootstrap canon-mutating skills: verify the target world state DOES exist and required files are readable
 - for meta-with-multi-world-read skills: enumerate `worlds/*/` and assemble the cross-world read aggregate; if empty, set the degraded-mode flag (e.g., `distinctness_enforced=false`) and surface the absent-distinctness-checks signal at the HARD-GATE deliverable per the skill's design
 - for skills with monotonic-ID outputs at pipeline scope (e.g., NWP-NNNN, NWB-NNNN, or any pipeline-scoped class whose output lives at root-level rather than under `worlds/<slug>/`): allocate via `mcp__worldloom__allocate_next_id(world_slug='__pipeline__', id_class=...)`; if the index does not yet support the `__pipeline__` sentinel, fall back to a manual scan of the pipeline-scoped output directory and increment
 - for skills with monotonic-ID outputs at sub-world scope (e.g., per-story-bundle classes like PG-NNNN / SE-NNNN / OBL-NNNN whose output lives nested under `worlds/<slug>/stories/<story-slug>/_source/<class>/` — uniqueness is per-bundle, not per-world or per-pipeline): allocate via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`. Distinct from world-scoped (e.g., CHAR-NNNN, AU-NNNN) which scans `worlds/<slug>/<class>/` and from pipeline-scoped (NWP-NNNN, NWB-NNNN) which uses the `__pipeline__` sentinel.
 - for skills with runtime-read supporting files declared at the gap-filler interview §"Generated skill's supporting files" (a): verify each supporting file exists and is readable (e.g., `tickets/_TEMPLATE.md`, `tickets/README.md`, validator fixtures, hook scripts) — abort with a clear missing-file error on fail
 - for skills with first-run bootstrap supporting files declared at the gap-filler interview §"Generated skill's supporting files" (b): detect bootstrap state (e.g., `<output-dir>/.gitkeep` presence, `.gitignore` containing the output-dir pattern); record `bootstrap_writes_required: true|false` in the batch manifest or equivalent; defer the bootstrap writes themselves to the gated Commit phase — never pre-write infrastructure before HARD-GATE approval
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
 - Invariant conformance (vs every INV record retrieved via `search_nodes(node_type='invariant')`) — record tested invariant ids
 - Mystery Reserve firewall (vs every M record retrieved via `search_nodes(node_type='mystery_reserve')`) — record every checked MR id, overlap or not
 - Distribution/scope conformance (vs capability CFs filtered by domain via `search_nodes(node_type='canon_fact', filters={domain: ...})`)
 Repair Sub-Pass on any fail; unrepairable → loop to earliest relevant phase.
 For batch-producing skills: add a batch-level check as a peer sub-phase catching
 cross-artifact collisions (e.g., two artifacts jointly resolving a Mystery Reserve
 entry that neither alone would).>

## Phase N+1: Commit / Write            [canon-mutating — after final validation phase; canon-reading with HARD-GATE — after final validation phase; meta-tooling with HARD-GATE — same shape as canon-reading-with-HARD-GATE: HARD-GATE fires at a named Commit phase after final validation]
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

## HARD-GATE drafting — numerical-citation discipline

When the HARD-GATE clause names a numerical count (e.g., "all N gates pass", "all M axes pass", "every one of N principles", "all P checks record PASS"), recount against the proposal's source enumeration BEFORE presenting Section 2. Numerical citations that drift from the proposal will be caught later by the conformance check's Process Flow consistency check (per `references/foundations-conformance-check.md` §Universal Checks) and by Procedure §6's reconciliation precondition (per `SKILL.md`), but catching at draft time avoids the reconciliation-at-write-time backstop firing for purely arithmetic drift. The recount discipline applies to gate counts (Phase N's per-storylet validation gates), axis counts (Phase M's batch-level diversity audit axes), principle counts (FOUNDATIONS Validation Rules cited), and any other enumerated quantity the HARD-GATE clause references — wherever the count is sourced from a proposal table or list, re-walk the source and tally explicitly rather than transcribing a previously-stated count. Worked precedent: storylet-pool-authoring's Section 2 / Section 3 initially said "8 Phase 4 gates"; Section 6b's gate-table draft re-tallied to 9 (the proposal's Phase 4 table enumerates Mystery firewall, Resolution-authority declaration, Invariant compatibility, Consequence capacity, Dedup, Content-intensity coherence, Predicate DSL parsability, Branch-contamination, and Schema completeness — 9 gates); the reconciliation precondition resolved the meaning at write time, but a draft-time recount would have produced the correct count at Section 2 presentation. Distinct from the reconciliation precondition (which is the recovery-side backstop catching drift at write time per `SKILL.md` Procedure §6); this discipline is the prevention-side draft-time check.

## Section Order for Presentation

1. Frontmatter + Title + one-line purpose
2. HARD-GATE (if applicable)
3. Process Flow
4. Inputs / Output
5. World-State Prerequisites
6. Phase breakdown
7. Validation Rules upheld + Record Schemas
8. FOUNDATIONS Alignment table
9. Guardrails + Final Rule

## Presentation Format (per section)

Each section presentation must end with a `**Notes on the shape:**` bullet list explaining *why* the concrete choices were made — especially:
- deviations from sibling skills (what was borrowed vs what was changed and why)
- design decisions that fell out of gap-filler answers (cite the question number or topic)
- rationales that would not be obvious from the section text alone

**Bullet count**: typically 2-4 bullets for short sections (frontmatter, HARD-GATE, short Guardrails). Expand to up to 8 bullets for sections presenting 5+ concrete design decisions — e.g., a phase breakdown with 6+ phases, a FOUNDATIONS Alignment table with multiple N/A rows, a dense Validation Rules section citing multiple enforcement phases per rule. The intent is one substantive rationale per non-obvious decision. Compression that hides reasoning to hit a bullet count defeats the purpose of the rule; padding to reach a minimum also defeats it. Match the count to the number of decisions made.

This makes approval gating substantive rather than ceremonial. The user should be able to accept or push back on each design decision, not just on the wording. A section presented without rationale notes is an invitation to rubber-stamp approval — avoid it.

## FOUNDATIONS Alignment N/A Rows

Some principles legitimately do not apply to a given skill's class — e.g., `Change Control Policy` for canon-reading skills (no Change Log Entry emitted); `Rule 5 (No Consequence Evasion)` for meta-tooling audit skills (no canon facts produced); `Rule 6 (No Silent Retcons)` for canon-reading skills. When a row is N/A, mark it explicitly in this form:

```
| Change Control Policy | N/A | Not applicable — canon-reading skill does not emit Change Log Entries; handoff to `canon-addition` for world-level canon changes. |
```

Never omit N/A rows silently — an empty row is indistinguishable from an oversight. The explicit `N/A + reason + sibling-handoff` form shows the reader that the principle was considered and deliberately skipped, and names the sibling skill that DOES honor it. This makes the alignment table a complete audit of all FOUNDATIONS principles, not a partial one.
