# FOUNDATIONS Conformance Check (Step 6)

Before any file is written, audit the draft against class-specific requirements. If any check fails, surface the specific gap to the user and loop back to the design-drafting step for the affected section. **Writing is blocked until the audit is clean.**

## Universal Checks (all classes)

- [ ] Frontmatter declares `name`, `description`, `user-invocable`, `arguments`.
- [ ] Description names triggers, produces, and mutates explicitly.
- [ ] `## World-State Prerequisites` block exists and lists real files (not vague). Bootstrap-skill carve-out (per the gap-filler interview §World-State Prerequisites): pipeline-head skills legitimately declare `docs/FOUNDATIONS.md` + pre-flight existence/collision checks + user-input files; the absence of prior state is itself the prerequisite and passes this check.
- [ ] Final Rule is a single, enforceable sentence.
- [ ] **Process Flow consistency**: every phase named in the phase-breakdown body appears in the Process Flow ASCII (and vice versa); branch labels, sub-check names, and phase numbers match between the two. This catches drift introduced when a phase's meaning is refined during design-drafting review (via a Notes-on-the-shape correction) without backfilling the Process Flow diagram. Treat any ASCII-vs-body mismatch as a blocking finding so the discrepancy is reconciled before write-files runs.

## canon-mutating Additional Checks

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

## canon-reading Additional Checks

- [ ] Contains an explicit rule: "This skill MUST NOT write to world files, `CANON_LEDGER.md`, or `INVARIANTS.md`."
- [ ] If the output carries in-world knowledge, beliefs, or capabilities (diegetic texts, character data, faction profiles, event seeds, option cards, or any artifact whose content could leak Mystery Reserve forbidden answers): includes a Canon Safety Check phase preventing accidental mystery resolution, restricted-knowledge leaks, or silent canon creation (Rule 7: Preserve Mystery Deliberately). This gate matches the failure mode it catches: any artifact carrying in-world content, not only text artifacts.
- [ ] If proposal-generating (produces candidate facts): explicit note that output is NOT canon until it passes the canon-addition skill.
- [ ] If the output carries in-world content: Rule 7 is explicitly listed in the generated skill's "Validation Rules This Skill Upholds" section (the Canon Safety Check phase satisfies the structural check above; listing Rule 7 in the Validation Rules section is the separate documentation check).
- [ ] **Commit / Write phase (conditional on HARD-GATE)**: if the skill declares a HARD-GATE (per the gap-filler interview §HARD-GATE need), it must also declare an explicit **Commit / Write phase** *after* the final validation phase where the gate fires on user approval and atomic writes happen. A HARD-GATE without a named Commit phase has nowhere to fire and fails this check. Canon-reading skills without a HARD-GATE (rare — e.g., single-file generators with trivial deliverables) are exempt.
- [ ] **World-scope declaration**: the skill names exactly one of {single-world, all-worlds, meta, meta-with-multi-world-read} as its operating scope. If single-world, a required `world_slug` argument is declared, and all world-file reads are rooted at `worlds/<world-slug>/` — never at repo root. If meta-with-multi-world-read, the generated skill's Guardrails declare the rationale for the hybrid scope (read surface + write surface), Pre-flight enumerates `worlds/*/` to assemble the cross-world aggregate, and the empty-worlds case is handled as a degraded-mode path with an explicit user-visible flag at the HARD-GATE deliverable.
- [ ] **ID allocation discipline (pipeline-scoped output)**: if outputs use monotonic IDs at pipeline scope (e.g., NWP-NNNN, NWB-NNNN, or any class whose output lives at a root-level surface rather than under `worlds/<slug>/`): IDs allocated via `mcp__worldloom__allocate_next_id(world_slug='__pipeline__', id_class=...)` with a documented manual-scan fallback (scan the pipeline-scoped output directory and increment) for cases where the index does not yet support the `__pipeline__` sentinel; collisions abort with a specific-id error; dropped IDs (from user drop-list at commit) become permanent gaps and are never reused. N/A when outputs are world-scoped or non-monotonic.

## meta-tooling Additional Checks

- [ ] Output is report-shaped (findings, severity tables, repair menus) — not canon-write-shaped.
- [ ] Contains an explicit rule: "This skill proposes changes; it does not apply them."
- [ ] If audit-class: uses severity levels (Cosmetic → Canon Break) matching FOUNDATIONS §Continuity or locally defined.
- [ ] If the skill reads world state OR allocates monotonic IDs for output artifacts: includes a **Pre-flight Check** section before Phase 0 that loads `docs/FOUNDATIONS.md`, verifies required world files are readable, and allocates/reserves any monotonic IDs the skill emits.
- [ ] **World-scope declaration**: same form as canon-reading §World-scope declaration above (one of {single-world, all-worlds, meta, meta-with-multi-world-read}; same single-world rooting rule and meta-with-multi-world-read sub-rules).
- [ ] **ID allocation discipline** (if outputs use monotonic IDs like AU-NNNN, RP-NNNN): IDs allocated at pre-flight by scanning the existing output directory; collisions abort with a specific-id error; dropped IDs (from user drop-list at commit) become permanent gaps and are never reused. Pipeline-scoped variant (root-level surfaces like NWP-NNNN, NWB-NNNN): see canon-reading §ID allocation discipline (pipeline-scoped output) above for allocation pattern.

## Reporting Format

Report results in this format:

```
FOUNDATIONS Conformance Check — <slug> — class: <class>
✅ Universal: <N>/<N>
✅ Class-specific: <N>/<N>
❌ Blocking findings:
  - <section>: <specific gap>
```

When the Blocking findings count is zero (the clean-audit case), replace the last two lines with a single `✅ No blocking findings.` line on its own. The `❌ Blocking findings:` bullet-list form is reserved for non-empty findings — using it with "none" creates a visual contradiction between the ❌ mark and the empty state.

**Class-specific N/A items**: When class-specific checks are conditionally N/A for this skill (e.g., meta-tooling's "Pre-flight Check for world-state reads or monotonic-ID allocation" when the skill does neither; "ID allocation discipline" when outputs don't use monotonic IDs; canon-reading's "Commit / Write phase conditional on HARD-GATE" when no HARD-GATE is declared), mark them `[N/A]` with a one-line reason rather than counting them as passes or failures, and render the ratio line as `N/M applicable; K N/A` to make the conditional-check accounting auditable. **Denominator is applicable count, not total.** Worked example: for a meta-tooling skill with 6 class-specific checks where 4 are applicable (all passing) and 2 are N/A, render as `Class-specific: 4/4 applicable; 2 N/A` — NOT `4/6 applicable; 2 N/A` (which conflates total with applicable and mis-signals the pass rate). Parallel to the FOUNDATIONS Alignment N/A Rows discipline in the design-drafting step — "Never omit N/A rows silently — an empty row is indistinguishable from an oversight."
