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
Do NOT write `SKILL.md`, any templates, or any examples until (a) the user has approved the design section-by-section AND (b) the FOUNDATIONS conformance check passes with zero blocking findings. A skill that would emit canon-touching behavior without declared World-State Prerequisites, without the right Validation Rules, or without a HARD-GATE (when canon-mutating) MUST NOT be written.
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

## Procedure

1. Read context, mode-detect, and classify the pipeline. Load `references/context-and-classification.md` (covers Step 1 read-context, Step 2 mode detection + pipeline classification, and the Classification Heuristics applied when class is ambiguous). Announce mode and classification to the user before advancing.

2. **Fresh mode only** (`topic` provided without `reference_path`): run the discovery interview and write `brainstorming/<slug>.md` before continuing. Load `references/fresh-mode-proposal.md` for the required-section list and the interview rules. Skip this step in compile mode.

3. Run the gap-filler interview. Load `references/gap-filler-interview.md` (covers Protocol, Mandatory Gaps to Close, Out-of-scope concerns raised during interview, Starting Confidence in compile mode). One substantive question per message; target 95% confidence; announce the transition when reached.

4. Draft the skill design section-by-section. Load `references/skill-design-drafting.md` (covers the Generated SKILL.md Template, Section Order for Presentation, Presentation Format with Notes-on-the-shape rationale, FOUNDATIONS Alignment N/A Rows). Gather user approval per section/batch.

5. Run the FOUNDATIONS conformance check. Load `references/foundations-conformance-check.md` (covers Universal Checks, canon-mutating / canon-reading / meta-tooling additional checks, Reporting Format with N/A accounting). Loop back to the design-drafting step on any blocking finding — writes are blocked until the audit is clean.

6. **Write files (Commit phase / HARD-GATE fires).**

   Only reachable if the conformance check is clean AND every design section was user-approved.

   **Reconciliation precondition** (before any file write): Reconcile any meaning-drift surfaced during the design-drafting step's section approvals. If a section's content was corrected or refined during a later section's review (e.g., a Process Flow ASCII sub-check was renamed in a Notes-on-the-shape rationale at Section 6 review time, or a phase's purpose was sharpened during Validation Rules review without redrafting Section 3), the file writes MUST reflect the resolved meaning, NOT the section's as-originally-presented text. The user's approvals are interpreted as encompassing the corrections noted in subsequent Notes-on-the-shape rationale; the SKILL.md write is the single authoritative artifact and must be internally consistent. Document the reconciliation in the post-write report ("Reconciled: <Section N> §<sub-element> updated per <Section M> review notes") so a future skill-audit can trace the resolution path. The conformance-check step's Process Flow consistency check should have caught most ASCII-vs-body drift, but a final reconciliation pass at write time is the backstop.

   Write order:

   1. Write `.claude/skills/<slug>/SKILL.md`.
   2. Write `.claude/skills/<slug>/templates/*.yaml` for each Canon Fact Record or Change Log Entry schema the skill references. **Start from skill-creator's own `.claude/skills/skill-creator/templates/canon-fact-record.yaml` and `.claude/skills/skill-creator/templates/change-log-entry.yaml`** — these are the canonical generic references (already loaded into context at the read-context step). Do NOT start from a sibling skill's templates (e.g., `create-base-world/templates/*.yaml`) — those are specialized copies that have drifted from the generic by design, and re-deriving from them propagates per-sibling comments into new skills. Copy the generic, then trim fields that do not apply and adjust phase references to match the new skill's numbering.
   3. Write `.claude/skills/<slug>/templates/<output-type>.md` (or `.yaml`) if the skill has a primary output format that is neither a Canon Fact Record nor a Change Log Entry — e.g., a character dossier, a diegetic artifact, a proposal card, an adjudication report, a triage file. These are NOT copies of skill-creator's generic CF/Change-Log references (those apply only when the skill emits CF records or Change Log Entries directly — covered by the previous sub-step). Three sub-classes with different authoring disciplines:
      - **(a) Templates structurally parallel to a sibling skill's downstream input format** — e.g., a proposal card that `canon-addition` consumes (CF-schema parity), a retcon-proposal card, a character proposal card that `character-generation` consumes (character-brief-schema parity), or any candidate-record whose fields a downstream sibling will field-copy at parse time. **Derive from that sibling's template**: copy the structure, adjust phase references to match the new skill's numbering, add skill-specific fields, and **preserve the downstream sibling's parse-time field schema byte-for-byte** so downstream acceptance is a field-copy rather than a field-re-derivation. The specific fields to preserve depend on the consumer: for `canon-addition` consumers, preserve CF-schema parity (`type`, `scope` / `recommended_scope`, `domains_affected` / `domains_touched`, `distribution`, `source_basis`); for `character-generation` consumers, preserve its Phase 0 required+optional input fields (`current_location`, `place_of_origin`, `date`, `species`, `age_band`, `social_position`, `profession`, `kinship_situation`, `religious_ideological_environment`, `major_local_pressures`, `intended_narrative_role`, + optional `central_contradiction` / `desired_emotional_tone` / `desired_arc_type` / `taboo_limit_themes`); for other siblings, preserve whatever schema their parse-time step consumes. Document the parity intent + named consumer in a frontmatter comment so future maintainers preserve it across schema evolution. Examples: `propose-new-canon-facts/templates/proposal-card.md` (canon-addition consumer), `canon-facts-from-diegetic-artifacts/templates/proposal-card.md` (canon-addition consumer), `propose-new-characters/templates/proposal-card.md` (character-generation consumer).
      - **(b) Templates for output formats unique to this skill** — no downstream sibling consumer, no parse-time parity obligation. **Authored from scratch** against the skill's Output specification. Examples: `character-generation/templates/character-dossier.md`, `diegetic-artifact-generation/templates/diegetic-artifact.md`.
      - **(c) Templates anticipating a future, not-yet-shipping downstream sibling** — applies when the gap-filler step's §"Future-sibling parity" gap (per `references/gap-filler-interview.md`) elicited Shape (a) "inline-with-seams". The downstream sibling does not yet exist on disk (verified at gap-filler time by checking `.claude/skills/<sibling>/` is absent), so byte-for-byte parity cannot be enforced and sub-class (a) does not apply. **Authored from scratch** against the source proposal's schema sketch with two seam disciplines: (i) every field whose schema may shift when the future sibling ships carries an explicit comment `# Seam: refactor when <sibling> ships its production schema` (or equivalent marker preserving the future-sibling name and the parity intent); (ii) the generated skill's Guardrails section names the future sibling AND the parity intent (e.g., "When `branching-story-page-cycle` ships, refactor SE schema to its production op vocabulary"). Distinct from sub-class (a) because no shipping sibling exists to derive from at generation time; distinct from sub-class (b) because a future sibling IS expected to consume the output and the seam discipline anticipates that consumption. Examples: `branching-story-bootstrap/templates/story-records.yaml` (SE-record-schema seam to `branching-story-page-cycle`, SLT-storylet-schema seam to `storylet-pool-authoring`).

      Canon-reading skills with in-world outputs that have no downstream-sibling consumer need sub-class (b) (e.g., character dossiers, diegetic artifacts written for world-level storage); canon-reading skills producing candidate records consumed by a NAMED EXISTING downstream sibling need sub-class (a) (whether the consumer is `canon-addition` for CF proposals, `character-generation` for character proposal cards, or any other sibling currently shipping with a parse-time schema); canon-reading skills producing records whose downstream sibling is referenced by the proposal but DOES NOT YET EXIST on disk need sub-class (c) (with the seam annotations + Guardrails parity-intent statement defined above); canon-mutating skills may need any combination of (a)/(b)/(c) in addition to the CF/Change-Log templates. Sibling derivation (sub-class a) is the correct pattern whenever the template's consumer is a named existing downstream skill; "from scratch" applies to sub-classes (b) and (c), with (c) carrying additional seam discipline that (b) does not need.
   4. Write `.claude/skills/<slug>/examples/*.md` for approved worked examples (max 2). Skip if none were selected. **Skeletal-to-hybrid expansion**: If the source proposal's example is in a skeletal register (YAML-only, frontmatter-only, prose-fragment-only, or structured-fields-without-body) and the generated skill's output format is richer (hybrid frontmatter + markdown body, multi-section, multi-file), expand the example faithfully — derive body prose from the skeletal fields plus the proposal's phase definitions, preserving the example's semantic content and scaling each field into the section or subsection that field maps to. Flag the expansion in the example's header comment ("Adapted from the source proposal's <NNNN> example: YAML-only source expanded to hybrid format per this skill's Phase <N> output schema") so a maintainer can trace derived-from-source. Do NOT invent new semantic content during expansion — limit additions to what the skeletal source implies or what the skill's own phase definitions dictate.
   5. **Pipeline-level supporting files**: Two sub-classes, each gated on a different gap-filler decision. Skip the entire sub-step only when BOTH gates are absent (no supporting-file-bootstrap approved AND no deferred-integration tickets approved).
      - **(a) Runtime-consumed supporting files (gated on the gap-filler step's §"Supporting-file bootstrap" gap)**: If the gap elicited explicit user approval for expanded scope, write the approved supporting files at their declared pipeline-level paths (e.g., `tickets/_TEMPLATE.md`, `tickets/README.md`, `docs/archival-workflow.md`, validator fixtures, hook scripts) — files the generated skill READS at runtime. Batch these writes in the same parallel tool call as the skill writes from the previous sub-steps where possible. Ensure parent directories exist via `mkdir -p` before writing (e.g., `mkdir -p tickets` before writing `tickets/*.md`). Supporting-file content bundled in the source proposal must be stripped of source-repo-specific terminology before writing, applying the same stripping discipline that applies to the generated skill itself (e.g., when adapting from another repo, remove crate names, runtime-specific references, macro sites, and other concepts that do not translate to the target pipeline).
      - **(b) Deferred-integration tickets (gated on the gap-filler step's §"Deferred-integration tickets" gap)**: If §Deferred-infrastructure architecture selected Shape A or Shape C and the §Deferred-integration tickets gap approved per-integration ticket filing, write each approved ticket at `tickets/<NAMESPACE>-<NNN>-<slug>.md` against `tickets/_TEMPLATE.md`. Each ticket's content is derived from the source proposal's infrastructure references audited against the current state of `tools/` and `.claude/skills/`: name the affected files, the precedent-setting prior tickets if any (per existing namespace history in `tickets/` + `archive/tickets/`), the FOUNDATIONS principle motivating the integration, the verification layers proving the integration landed, and the skill-revert-after-landing follow-up so the generated skill can be upgraded once the ticket lands. Ticket numbering is allocated by scanning `tickets/` + `archive/tickets/` for the next free integer in the chosen namespace (e.g., MCPENH-NNN, HOOK-NNN, PATCHENG-NNN per existing precedent). Distinct from sub-class (a): tickets are forward-work artifacts the generated skill NAMES in its Guardrails but does NOT consume at runtime — the one-to-one mapping between deferred-debt disclosures in the generated skill's Guardrails and ticket files in `tickets/` is what skill-creator enforces here, parallel to how skill-creator enforces conformance-check completeness at generation time. A deferred-debt disclosure in the generated skill's Guardrails without a corresponding ticket file produces a phantom-ticket failure mode (a future maintainer reads the skill, looks for the ticket, doesn't find it, doesn't know whether to file one or whether the disclosure is stale); this sub-class prevents that failure mode. Batch these writes in the same parallel tool call as sub-class (a) writes and the previous sub-steps' skill writes where possible.
   6. **Compile mode only**: move the source file from `brainstorming/` to `archive/brainstorming/` **preserving its original filename** — do NOT rename on archival even if the final skill slug differs from the source filename (the source filename is a separate identifier from the skill slug, and preserving it keeps the authored-name audit trail intact). If `archive/brainstorming/` does not yet exist, run `mkdir -p archive/brainstorming/` first. Choose the move command by tracked-state:
      - **When the source is tracked**: use `git mv brainstorming/<source-filename> archive/brainstorming/<source-filename>` — it preserves rename history so the proposal-to-skill lineage stays legible in `git log --follow`.
      - **When the source is untracked** (the common case for fresh brainstorming files produced by the `brainstorm` skill or authored outside git's index): use plain `mv brainstorming/<source-filename> archive/brainstorming/<source-filename>`. An untracked file has no rename history to preserve, and `git mv` will fail with `fatal: not under version control`.
      - **Detection pattern**: `git ls-files --error-unmatch brainstorming/<source-filename>` exits zero when tracked. On non-zero exit, fall back to plain `mv`. Alternatively, try `git mv` first and fall back to `mv` on the specific "not under version control" error — both patterns are acceptable.

      In fresh mode the proposal stays in `brainstorming/` as the durable spec.
   7. Report paths written. Do NOT commit.

7. Present the next-steps menu. Load `references/closeout-menu.md` (covers the menu template and the conditional out-of-scope-concern option). If the user invokes a sibling skill, the session ends cleanly — skill-creator does not chain.

## Guardrails

Load-bearing rules — apply on every invocation. Full Guardrails list and the FOUNDATIONS Alignment table for skill-creator itself live in `references/governance-and-foundations.md`.

- The HARD-GATE at the top of this skill is absolute. No `Write` or `Edit` to skill files until design approval AND conformance-check pass. Auto Mode does not override the gate.
- Write authority is bounded to `.claude/skills/<slug>/*` plus the write-files step's archival move. skill-creator NEVER edits `docs/FOUNDATIONS.md` and NEVER writes world-state files. Pipeline-level supporting files (e.g., `tickets/_TEMPLATE.md`) only when the gap-filler interview's "Supporting-file bootstrap" gap elicited explicit user approval.
- The generated `SKILL.md` must be self-contained — a reader should not need skill-creator to run it. Do NOT duplicate FOUNDATIONS.md content inline; cross-reference instead.
- No scope inflation: generate one skill per invocation. If the user asks for a suite, confirm each individually.
- One question per message during interviews. Routine confirmable assumptions under auto mode may accompany a single substantive question — see the gap-filler interview's protocol §Auto mode compression.
- Worktree discipline: if in a worktree, all paths resolve from the worktree root.

## Final Rule

A generated worldloom skill is not ready until it declares: what world-state it reads, what canon it may produce or mutate, which Validation Rules it upholds, and what its output records look like. A skill that cannot answer those four questions is a prose sketch, not a tool — and skill-creator must refuse to write it.
