---
name: story-skill-internal-coherence
description: "Use when auditing the worldloom story-skill family — branching-story-bootstrap, branching-story-page-cycle, storylet-pool-authoring, branching-story-health-audit, story-fact-promotion-to-canon — for internal incoherences (shared-schema drift, contradictory instructions, dangling cross-references, numerical-citation drift, vocabulary drift, phase-numbering drift) and applying user-approved corrections in place. Produces: a chat-only triage table + correction-diff summary; no on-disk report file. Mutates: only `.claude/skills/<family-member>/SKILL.md`, `.claude/skills/<family-member>/references/*.md`, and `.claude/skills/<family-member>/templates/*` (never docs/FOUNDATIONS.md, worlds/<slug>/, tickets/, or non-family skills)."
user-invocable: true
arguments:
  - name: target_skill_path
    description: "Path to one of the five story-skill directories (e.g., .claude/skills/branching-story-bootstrap). The path is the entry point; the audit always covers the full hardcoded story-skill family. Pre-flight aborts if the path does not resolve to a recognized family member."
    required: true
---

# Story Skill Internal Coherence

Audit the five story-skill family members for internal incoherences spanning six categories — shared-schema drift, contradictory instructions, dangling cross-references, numerical-citation drift, vocabulary drift, and phase-numbering drift — and apply user-approved corrections in place after a HARD-GATE review of every proposed edit.

<HARD-GATE>
Do NOT Edit / Write any file under `.claude/skills/<family-member>/{SKILL.md, references/*, templates/*}` for any of the five family members until ALL of the following hold:

(a) Pre-flight has loaded `docs/FOUNDATIONS.md`, resolved the `target_skill_path` to one of the five family members, and read every family member's SKILL.md + references/*.md + templates/* into working context. If the target path does not resolve to a recognized family member the skill aborts before Phase 1.

(b) Phases 1-7 have completed: Phases 1-6 detect findings and select source-of-truth per category (C1 shared-schema drift, C2 contradictory instructions, C3 dangling cross-references, C4 numerical-citation drift, C5 vocabulary drift, C6 phase-numbering drift); Phase 7 consolidates findings, finalizes severity classification, and populates each finding's record fields (`finding_id`, `severity` with one-line rationale [bare severity is FAIL], `category`, `affected_files`, `source_of_truth` selection [the sibling/file the skill treats as canonical], and `proposed_correction` [file path + before/after diff] OR a `manual_resolution` flag when no auto-edit is safe — Section 6 §Phase 7 details when `manual_resolution` fires).

(c) Phase 7 self-check passes for every finding: severity carries a one-line rationale; every correction cites at least one source-of-truth; manual-resolution findings cite both candidate sources without selecting one; shared-schema-drift findings whose canonical source is ambiguous default to manual-resolution rather than auto-edit; cross-skill corrections record every file the edit touches.

(d) Phase 8 has emitted the triage summary table in chat (numbered findings with `finding_id`, Category, Severity, Affected Files, One-line Description, Proposed Correction, Status columns) AND every correction has an explicit user disposition: file (apply the edit), defer-with-rationale (record in the final summary; do not apply), reject-as-false-positive (drop with rationale), OR the auto-mode auto-approval condition has fired (auto mode active AND every surviving correction is severity LOW with no manual-resolution flag AND zero cross-skill schema-drift findings remain).

(e) Drop-list semantics: surviving findings retain their originally allocated `finding_id`s (no renumbering — gaps are permanent); dropped findings persist in the chat summary marked `(dropped by user at Phase 8)` with the user's optional one-line reason; manual-resolution findings are NEVER auto-applied regardless of disposition.

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the correction batch. The skill may only proceed to Phase 9 (Atomic Correction Writes + Final Summary) once every gate condition above holds simultaneously.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load docs/FOUNDATIONS.md; resolve target_skill_path
                  against the hardcoded story-skill family list; read
                  every family member's SKILL.md + references/*.md +
                  templates/* into working context; abort on missing
                  family member or unreadable file)
      |
      v
Phase 1: Shared-Surface Inventory      (identify the shared surfaces:
                                        predicate DSL syntax;
                                        STENT.role_in_story enum;
                                        state_snapshot field set;
                                        RSP card frontmatter;
                                        content-policy block keys;
                                        snapshot-replay semantics;
                                        canonical-vocabulary tags;
                                        record-class IDs and frontmatter)
      |
      v
Phase 2: C3 + C6 — Reference Resolution (every "see <skill>/Phase N",
                                         "see references/<file>.md §X",
                                         "per `templates/<file>`",
                                         "phase-N-*.md" cross-reference
                                         resolved against the actual
                                         file/section/phase that exists;
                                         dangling targets emit findings)
      |
      v
Phase 3: C1 — Shared-Schema Drift       (per shared-surface from Phase 1:
                                         compare byte-for-byte across
                                         siblings that reference it;
                                         drift in fields/enums/types/
                                         frontmatter shape emits findings;
                                         source-of-truth selection
                                         per category — see Phase 7)
      |
      v
Phase 4: C5 — Vocabulary Normalization  (per concept named across two
                                         or more siblings: identify
                                         spelling/casing/wording variants
                                         that refer to the same concept;
                                         classify as drift or as
                                         legitimate domain terminology)
      |
      v
Phase 5: C4 — Numerical-Citation Drift  (per gate count, phase count,
                                         axis count, principle count
                                         cited in HARD-GATE clauses,
                                         SKILL.md prose, or templates:
                                         re-tally against the source
                                         enumeration in the same skill;
                                         mismatch emits a finding)
      |
      v
Phase 6: C2 — Contradictory Instructions (per surface described in two or
                                          more places: same skill or
                                          across siblings — flag prose
                                          that mandates X in one place
                                          and not-X in another; load-
                                          bearing within a single skill
                                          AND across siblings)
      |
      v
Phase 7: Findings Consolidation + Per-Finding Self-Check + Source-of-Truth
         Selection
                                         (group findings by category;
                                          severity-tag CRITICAL/HIGH/
                                          MEDIUM/LOW with one-line
                                          rationale; per-finding select
                                          a source-of-truth OR mark as
                                          manual-resolution; per-finding
                                          compose the proposed
                                          correction diff; structural
                                          severity floors apply)
      |
      v
Phase 8: HARD-GATE Triage and Per-Finding Disposition
                                         (emit numbered triage summary
                                          table in chat with finding_id,
                                          Category, Severity, Affected
                                          Files, Description, Proposed
                                          Correction, Status; collect
                                          per-finding dispositions; the
                                          HARD-GATE fires here)
      |
      +-- [HARD-GATE fires here — see top of skill]
      |
      v
Phase 9: Atomic Correction Writes + Final Summary
                                         (apply every approved
                                          correction via Edit/Write to
                                          .claude/skills/<family-
                                          member>/{SKILL.md,
                                          references/*,templates/*};
                                          emit final chat summary
                                          listing files changed,
                                          findings filed, deferred,
                                          rejected; do NOT git commit)
```

## Inputs

### Required
- `target_skill_path` — string — path to one of the five story-skill directories (e.g., `.claude/skills/branching-story-bootstrap`, `.claude/skills/branching-story-page-cycle`, `.claude/skills/storylet-pool-authoring`, `.claude/skills/branching-story-health-audit`, `.claude/skills/story-fact-promotion-to-canon`). The path is the family-membership entry point; the audit always covers the full hardcoded family. Pre-flight aborts with `"target_skill_path does not resolve to a story-skill family member; expected one of: <list>"` if the path does not match a family member.

### Optional
- (none)

## Output

| Class | Surface | Created when |
|---|---|---|
| Triage summary table | (chat only — emitted at Phase 8 before the HARD-GATE fires) | Always |
| Per-correction diff (file path + before/after) | (chat only — emitted alongside Phase 9 writes) | Per filed correction |
| Correction edits | `.claude/skills/<family-member>/SKILL.md`, `.claude/skills/<family-member>/references/*.md`, `.claude/skills/<family-member>/templates/*` (multiple files possible per invocation) | Per filed correction (skipped for `manual-resolution` findings, deferred findings, and rejected findings) |
| Final summary | (chat only — emitted at Phase 9 after writes complete) | Always |

The skill emits no Canon Fact Records, no Change Log Entries, no adjudication records, no audit-report files on disk, and no YAML records. Manual-resolution findings receive no auto-edit; the user resolves them manually after the run by reading the chat summary. The git diff after the run is the durable audit trail (the user reviews via `git diff` before commit).

## World-State Prerequisites

This skill operates at **pipeline scope, not world scope**. It reads under `.claude/skills/<family-member>/` and `docs/`; it does NOT read `worlds/<slug>/`, `tools/`, `tickets/`, or any non-family `.claude/skills/` subtree. Per FOUNDATIONS §Tooling Recommendation (the §"non-negotiable" mandatory-read clause as it applies to pipeline-level meta-tooling — the parallel of `mcp-integration-audit`'s pipeline-scope declaration):

- `docs/FOUNDATIONS.md` — light read at Pre-flight; Validation Rule 6 (No Silent Retcons) governs Phase 9's correction-attribution discipline. Skip if read earlier in this session and unmodified — when skipping, NAME the load mechanism explicitly in the user-facing skip announcement (e.g., *"FOUNDATIONS already in context via direct Read at message N"*, *"via `<skill-name>`'s pre-flight at message N which executed the Read"*, or *"via system-reminder injection at message N reproducing the document verbatim"*). Bare *"already loaded"* claims are insufficient. CLAUDE.md system-reminder content does NOT satisfy this criterion (operator-summary, not the document itself).
- `.claude/skills/branching-story-bootstrap/SKILL.md` plus every `references/*.md` and `templates/*` under that directory.
- `.claude/skills/branching-story-page-cycle/SKILL.md` plus every `references/*.md` and `templates/*` under that directory.
- `.claude/skills/storylet-pool-authoring/SKILL.md` plus every `references/*.md` and `templates/*` under that directory.
- `.claude/skills/branching-story-health-audit/SKILL.md` plus every `references/*.md`, `examples/*.md`, and `templates/*` under that directory (this family member ships `examples/` rather than `references/`; both are loaded when present).
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` plus every `references/*.md`, `examples/*.md`, and `templates/*` under that directory.

The family list is hardcoded in this skill. If new story skills are added to the family in the future, this skill's family list MUST be updated in the same change (see §Guardrails §"Family-list maintenance"). Adding a sixth family member without updating the list silently excludes the new member from coherence audits.

### Mandatory Family Surface Inventory — assembled at Phase 1

A logical aggregate (not an on-disk file) is built at Phase 1 from the prerequisites above: shared surfaces declared by two or more family members. Phases 2-6 consume this inventory. Phase 1 §Shared-Surface Inventory enumerates the inventory's contents.

### Reads NOT performed

- No `mcp__worldloom__*` calls. The audit's evidence is direct file content, not indexed world-canon.
- No `worlds/<slug>/` reads. Story-skill family members may reference world-canon contracts (e.g., FOUNDATIONS §Story Bundles §Validation Rules At Story Scope) but the audit verifies coherence among the skill files themselves, not against a particular world's state.
- No `tools/` reads. Tool-package coherence is `mcp-integration-audit`'s domain, not this skill's.
- No git-history reads. Dating drift to a specific commit is out of scope.

## Pre-flight Check

Run before Phase 1; abort if any precondition fails.

1. Load `docs/FOUNDATIONS.md` into working context (light read; Validation Rule 6 governs Phase 9 correction attribution). Skip per the load-mechanism-naming rule in §World-State Prerequisites if already in context.
2. Validate `target_skill_path` resolves to one of: `.claude/skills/branching-story-bootstrap`, `.claude/skills/branching-story-page-cycle`, `.claude/skills/storylet-pool-authoring`, `.claude/skills/branching-story-health-audit`, `.claude/skills/story-fact-promotion-to-canon`. Trailing slash, leading `./`, and absolute-path forms are all normalized. Abort with `"target_skill_path does not resolve to a story-skill family member; expected one of: <list>"` on no match.
3. Verify each family-member directory exists and contains `SKILL.md`; abort on any missing member with a list of the absent paths.
4. Read every family member's `SKILL.md`, then enumerate `references/*.md` (or `examples/*.md` for `branching-story-health-audit` and `story-fact-promotion-to-canon`) via `Glob`, then enumerate `templates/*` via `Glob`. Read every discovered file. Track the path → content map for downstream phases.
5. If a worktree root is active, ALL paths resolve from the worktree root, not the main repo root.

If any precondition fails, abort before Phase 1 with a clear message.

## Phase 1: Shared-Surface Inventory

Build a working inventory of every surface declared by two or more family members. The inventory is the consume-set for Phases 2-6.

Surface classes scanned:

- **Shared schemas in YAML templates**: a YAML field, enum, or type declared in two or more family members' `templates/*.yaml` files. Examples expected at audit time: `STENT.role_in_story` enum members; `state_snapshot` field set; `RSP` card frontmatter shape; storylet record schema (`SLT` fields); page record schema (`PG` fields); story-event record schema (`SE` fields).
- **Shared DSL surfaces**: predicate DSL syntax (e.g., `actor.has_obligation(...)`, `branch_path.contains(...)`), referenced by `branching-story-bootstrap`, `branching-story-page-cycle`, and `storylet-pool-authoring`.
- **Shared narrative-policy block keys**: `content_policy` block keys, `cadence_policy` keys, `mystery_safety` keys, declared in templates and cross-referenced in SKILL.md prose.
- **Shared semantic invariants**: snapshot-replay equality, branch-isolation recursive-closure, mystery-firewall per-claim resolution-authority — declared in two or more family members' SKILL.md or references.
- **Shared canonical-vocabulary tags**: any term in `tools/world-index/src/public/canonical-vocabularies.ts` (referenced indirectly via the family-member prose; the audit reads only the family-member references to these terms, never the tool source) that appears across two or more family members.
- **Shared record-class IDs**: every `<CLASS>-NNNN` ID class declared in CLAUDE.md or FOUNDATIONS that appears in two or more family members' prerequisites or output sections.

For each detected shared surface, record: surface name, the family members that reference it, the byte-form (or canonical text) of each member's declaration, and the file:line anchor for each occurrence.

The inventory is a working artifact (not persisted); Phases 2-6 read it in memory.

**Rule**: Phase 1 emits zero findings. Detection is Phases 2-6's job.

## Phase 2: C3 + C6 — Reference Resolution

For every cross-reference encountered in any family member's `SKILL.md`, `references/*`, or `templates/*`, verify the named target exists.

Reference patterns scanned:

- **Intra-skill phase references**: `Phase N`, `phase N`, `(per Phase N)`, `§Phase N`. Verify Phase N is declared in the same SKILL.md or in the skill's `references/phase-N-*.md`.
- **Intra-skill section references**: `§<Section Name>`, `(see §<Section>)`. Verify the section header exists in the same file.
- **Reference-doc paths**: `references/<file>.md`, `references/<file>.md §<X>`. Verify file exists and (when section is named) the section header exists.
- **Template paths**: `templates/<file>`, `templates/<file>.<ext>`. Verify file exists.
- **Cross-skill references**: `<sibling-skill>/<…>`, `the <sibling-skill> skill`, `per <sibling-skill> Phase N`. Verify (a) the sibling exists in the family, and (b) the named target exists in the sibling.
- **Phase-numbering drift (C6)**: for every `references/phase-N-*.md` file in any family member, verify SKILL.md or another reference doc names Phase N. Conversely, for every `Phase N` cited in SKILL.md, verify a `references/phase-N-*.md` exists when the skill uses the one-phase-per-reference-doc pattern (some family members do; others inline phases). **Pattern detection rule**: if ANY `references/phase-N-*.md` exists for the skill, treat the pattern as in-use and flag every unbacked phase number as drift.

Each unresolved reference becomes a candidate finding tagged C3 (dangling reference) or C6 (phase-numbering drift). Findings record: source `file:line`, referenced target string, why resolution failed (file absent / section absent / phase absent / sibling absent).

## Phase 3: C1 — Shared-Schema Drift

For every shared surface from Phase 1, compare each member's declaration byte-for-byte (after normalizing whitespace).

Detection rules:

- **Enum drift**: same enum name, different member set (e.g., `STENT.role_in_story = [protagonist, ally, antagonist]` in one sibling, `[protagonist, antagonist, foil]` in another). Severity: **HIGH** by default (cross-skill schema enforcement is fragile when enums diverge); **CRITICAL** when one sibling produces and another consumes the enum at parse-time.
- **Field-set drift**: same record schema, missing fields in one sibling. Severity: **HIGH** when missing fields are required; **MEDIUM** when optional.
- **Type drift**: same field name, different declared type (e.g., `mystery_safety` declared as `object` in one place and `array` in another). Severity: **HIGH** by default.
- **Default-value drift**: same field, different default value across siblings. Severity: **MEDIUM** by default.
- **Frontmatter-shape drift**: same hybrid-record-class frontmatter (e.g., RSP cards' `target_branch`, `proposed_visibility`), different shape across the producer and the consumer. Severity: **HIGH** when consumer parses by exact shape.

**Source-of-truth selection** (per finding):

- If exactly one sibling is the **producer** of the shared record (the skill whose Phase emits the record class), that sibling is canonical. Example: RSP cards are produced by `branching-story-health-audit` Phase 8 and consumed by `storylet-pool-authoring` mode=audit; the producer's schema wins.
- If multiple siblings produce the same shared record class (e.g., `branching-story-bootstrap` and `branching-story-page-cycle` both emit PG / SE / CHC records), the **schema-anchor-bearing skill** is canonical — defined as the sibling whose `templates/*.yaml` (or `templates/*.md`) contains the full record template. Example: page-cycle ships `templates/record-schemas.md`; bootstrap inlines minimal shapes — page-cycle's templates are canonical.
- Otherwise, mark `manual-resolution` — the user picks at Phase 8.

## Phase 4: C5 — Vocabulary Normalization

For each concept named by two or more siblings, identify spelling, casing, and wording variants of the same concept.

Detection rules:

- **Identifier drift**: snake_case vs camelCase vs kebab-case for the same field/concept. Example: `audited_thread_obligation_sketch` vs `thread_obligation_sketch_audit`. Severity: **MEDIUM** unless the identifier is a parse-time field name (then **HIGH**).
- **Term drift**: synonyms used inconsistently for the same concept. Example: "story-bundle" vs "story bundle" vs "narrative bundle". Severity: **LOW** for prose; **MEDIUM** when the term is a record-class label.
- **Acronym drift**: full form vs acronym used inconsistently. Example: "RSP card" vs "remediation-storylet-proposal card". Severity: **LOW** unless the acronym appears in a parse-time field name.

**Distinguishing from legitimate domain terminology**: when a sibling uses a term in a strictly-bounded domain context (e.g., "page" in the C-prose sense vs `PG-NNNN` in the record-id sense), the variation is semantic specialization, not drift. The skill flags these only when the term's domain is the same across siblings.

## Phase 5: C4 — Numerical-Citation Drift

For every numerical citation in HARD-GATE clauses, SKILL.md prose, or templates ("all N gates pass", "M phases", "K axes", "P principles", "every one of N rules"), re-tally against the source enumeration in the same skill.

**Detection rule**: walk the actual list (Phase N's gate table, Validation Rules section, axis enumeration) and tally. Mismatch with the cited count is a finding.

Severity: **MEDIUM** by default (mis-citation rarely causes wrong output but erodes the gate's auditability). Escalate to **HIGH** when the citation is in a HARD-GATE clause (a mis-cited gate count materially weakens the gate's mechanical checkability).

Common drift sites in the family (heuristic, not exhaustive):

- bootstrap Phase 9 validation gate count vs the actual gate-table rows
- bootstrap Phase 9.5 discipline-check key count (the proposal's "10 keys" claim must match the trace shape)
- page-cycle Phase 8 choice pair-distance axis count
- health-audit Phase 7 self-check item count
- Validation Rules listed (Rules 1–7 plus 11 + 12) vs the FOUNDATIONS-side authoritative count

## Phase 6: C2 — Contradictory Instructions

For every surface described in two or more places (intra-skill or cross-skill), flag prose mandating mutually exclusive behavior.

Detection rules:

- **Intra-skill contradiction**: SKILL.md and a `references/*.md` describe the same operation differently. Example: SKILL.md says "allocate `SAU-NNNN` at Pre-flight" and `references/phase-1-*.md` says "allocate `SAU-NNNN` at Phase 8 lazily". Severity: **HIGH**.
- **Cross-skill contradiction on a shared semantic**: two siblings prescribe different behavior for the same shared semantic. Example: bootstrap says "snapshot-replay equality is checked at Phase 9 gate 4" and page-cycle says "snapshot-replay equality is checked at every Pre-flight step"; the actual semantics may be compatible (bootstrap-time vs runtime gates), in which case the finding is downgraded after read — but unmediated prose contradiction is at least a **MEDIUM** finding by default, escalated to **HIGH** when one prose explicitly forbids what the other mandates.
- **HARD-GATE-timing contradiction**: a HARD-GATE in skill A names a precondition that skill B's prose claims is satisfied at a different phase than A's gate condition references. Severity: **HIGH** because HARD-GATE preconditions are mechanical.

**Source-of-truth selection** for C2 follows Phase 3's rule: producer-vs-consumer when applicable; schema-anchor-bearing skill for shared records; manual-resolution otherwise. C2 findings disagree on prose behavior, not schema; the canonical source is whichever sibling is currently exercising the disputed surface in production. When neither is in production (e.g., both prose blocks describe the same future-feature behavior), manual-resolution.

## Phase 7: Findings Consolidation + Per-Finding Self-Check + Source-of-Truth Selection

Group findings by category (C1–C6). Severity-tag per the rubric:

- **CRITICAL**: gap causes the target skill to silently produce incorrect output, corrupt state, or violate a FOUNDATIONS principle. Rare in this skill — most findings are HIGH or below.
- **HIGH**: missing guardrail or contradiction that would plausibly cause incorrect output on next use of any family member. Cross-skill schema drift on a parse-time-consumed surface defaults here.
- **MEDIUM**: friction that costs non-trivial improvisation; the skill still produced correct output, but the path was not smooth.
- **LOW**: wording polish; no impact on correctness.

**Structural severity floors** (load-bearing):

- Cross-skill parse-time-consumed schema drift (a schema field consumed by a downstream sibling at parse-time): minimum HIGH.
- HARD-GATE clause numerical-citation drift: minimum HIGH.
- HARD-GATE timing contradiction across siblings: minimum HIGH.
- Dangling reference targeting a HARD-GATE precondition: minimum HIGH.

For every finding, populate the field set:

- `finding_id` (sequential within this audit, e.g., `F-01`, `F-02`, …)
- `category` (one of C1, C2, C3, C4, C5, C6)
- `severity` (with one-line rationale; bare severity is FAIL)
- `affected_files` (list of `file:line` anchors)
- `description` (one paragraph)
- `source_of_truth` (the canonical sibling/file the skill treats as authoritative — populated at Phase 3 / Phase 6 selection rule, OR the literal string `manual-resolution` when no canonical source can be selected)
- `proposed_correction` (file path + before/after diff snippet) OR `manual_resolution` (cite both candidate sources without selecting; user picks at Phase 8)

**Per-Finding Self-Check** (each test records PASS with one-line rationale OR FAIL with the responsible loop-back phase; bare PASS is FAIL):

1. Severity carries a one-line rationale; bare severity fails. (Loop → Phase 7 classification)
2. Every finding cites at least one `file:line` or section anchor. (Loop → originating detection phase)
3. Cross-skill parse-time-consumed schema drift is classified at minimum HIGH. (Loop → Phase 7 classification)
4. HARD-GATE numerical-citation drift is classified at minimum HIGH. (Loop → Phase 5 / Phase 7)
5. Manual-resolution findings cite BOTH candidate sources without selecting one. (Loop → Phase 7 selection)
6. Auto-edit corrections cite ONE source-of-truth and quote the diff verbatim. (Loop → Phase 7 selection)
7. Cross-skill corrections record every file the edit touches (siblings may share a fix that updates two or more files atomically). (Loop → Phase 7)
8. Numerical-citation findings record both the cited count and the source-enumeration tally. (Loop → Phase 5 / Phase 7)
9. Contradictory-instruction findings quote both sides verbatim with location anchors. (Loop → Phase 6 / Phase 7)

Any FAIL routes to the responsible loop-back phase; the audit re-runs that phase before advancing to Phase 8.

## Phase 8: HARD-GATE Triage and Per-Finding Disposition

Emit a numbered triage summary table in chat:

| # | Finding ID | Category | Severity | Affected Files | Description (one-line) | Proposed Correction | Status |
|---|------------|----------|----------|----------------|------------------------|---------------------|--------|
| 1 | F-01 | C1 | HIGH | `bootstrap/templates/storylet.yaml`, `page-cycle/references/phase-4.md` | STENT.role_in_story enum diverges | producer-rule → page-cycle is canonical; edit bootstrap's enum to match | candidate |
| 2 | F-02 | C3 | MEDIUM | `health-audit/SKILL.md` | dangling `references/phase-9-validation-gates.md` | (no auto-edit; reference target absent) | manual-resolution |
| 3 | F-03 | C4 | HIGH | `bootstrap/SKILL.md` HARD-GATE | "8 gates" cited; Phase 9 table has 10 rows | re-write "8" → "10" in HARD-GATE clause | candidate |

For each `candidate` row, obtain an explicit disposition:

- **file** — apply the proposed edit at Phase 9.
- **defer-with-rationale** — record the deferral in Phase 9's final summary; do not apply.
- **reject-as-false-positive** — drop the finding; record rejection rationale.

For each `manual-resolution` row, no disposition is solicited at this phase — manual-resolution findings always pass through to Phase 9's final summary as user-action items, never as auto-edits.

**Inclusive-phrasing dispositions** (synonyms for "file every surviving candidate"): `proceed`, `file all`, `approve`, `implement all`, and any similar inclusive phrasing the user supplies — phrasing that does not name specific finding numbers AND does not use one of the three explicit dispositions — are synonymous with filing every surviving candidate. Per-finding overrides (e.g., `file 1, defer 2, reject 3`) take precedence when named explicitly.

**Auto-mode auto-approval condition** (per HARD-GATE condition (d)): when auto mode is active AND every surviving candidate is severity LOW AND no manual-resolution flag is set AND no cross-skill schema-drift findings remain (C1 cross-skill findings always require explicit human approval), auto-approve all candidates as `file` and proceed to Phase 9. Otherwise wait for explicit per-finding disposition.

The HARD-GATE fires at the boundary of Phase 8's disposition collection and Phase 9's atomic writes.

## Phase 9: Atomic Correction Writes + Final Summary

The HARD-GATE has fired; every disposition is in hand. Apply every correction tagged `file`, then emit the final summary.

### Step 1 — Compose every correction's edit

For each correction tagged `file` from Phase 8:

- Resolve the target file path (one of `.claude/skills/<family-member>/SKILL.md`, `.claude/skills/<family-member>/references/<file>.md`, or `.claude/skills/<family-member>/templates/<file>`).
- Compose the precise `old_string` (the exact byte sequence to match) and `new_string` (the replacement). The strings come verbatim from the Phase 7 `proposed_correction` field — re-deriving them here would introduce drift between the user-approved diff and the applied edit.
- When a single finding requires edits to two or more files (e.g., a C1 shared-schema drift fix updates one canonical file's comment AND every consumer's cross-reference to it), record each per-file edit in a shared correction-group keyed by `finding_id`. The whole group either applies or — on any per-file failure — every file in the group is reverted (atomicity discipline below).

**Tool preference**: `Edit` for surgical changes (the common case); `Write` only when the proposed correction is a full-file rewrite (rare for this skill — most coherence findings are localized and `Edit` with targeted `old_string` / `new_string` pairs is the right shape).

### Step 2 — Batched parallel edits with per-finding atomicity

Emit all `Edit` (and any rare `Write`) tool calls for a single batched parallel-tool-use message when corrections are independent.

**Per-finding atomicity for cross-file corrections**: When a finding's correction-group spans multiple files, batch every file-edit in that group into a single message and verify all returned successfully BEFORE moving to the next group. If any per-file edit in the group failed (path typo, permission error, `old_string` no longer unique because an earlier batch already mutated the file), rollback every successful per-file edit in the group via a compensating `Edit` (re-apply the `new_string` → `old_string` direction) and surface the failure to the user in the final summary as `finding F-NN: rollback-on-failure — original group did not apply`.

Independent (single-file) corrections do not need rollback discipline — each is its own atomic edit.

After all batched messages return, verify every intended file edit landed by re-grepping the new strings; any missed edit is surfaced in the final summary as a per-finding failure for the user to investigate manually.

### Step 3 — Final summary in chat

Emit a structured summary covering every finding:

```
## Story-Skill Internal Coherence — Final Summary

**Family audited**: branching-story-bootstrap, branching-story-page-cycle,
storylet-pool-authoring, branching-story-health-audit,
story-fact-promotion-to-canon
**Files mutated**: <count> across <distinct-skill-count> family members
**Findings**: <total> (<C1-count> C1, <C2-count> C2, <C3-count> C3,
<C4-count> C4, <C5-count> C5, <C6-count> C6) — <CRITICAL>/<HIGH>/<MEDIUM>/
<LOW> by severity

### Applied (filed)

For each filed correction:
- **F-NN [Severity]** [<Category>] <one-line description>
  - **Source-of-truth chosen**: <sibling/file> — <one-line rationale>
  - **Files mutated**: <list>
  - **Diff**: <before> → <after> (one excerpt per file when group spanned
    multiple files)

### Manual-resolution (user action required)

For each manual-resolution finding:
- **F-NN [Severity]** [<Category>] <one-line description>
  - **Candidate sources**: <sibling/file A> says <X>; <sibling/file B>
    says <Y>
  - **Why no auto-edit**: <one-line — typically "neither sibling is
    obviously canonical; both are recent, both are referenced">
  - **Suggested resolution path**: <one-line guidance>

### Deferred (per `defer-with-rationale`)

For each deferred finding:
- **F-NN [Severity]** [<Category>] <description>
  - **Deferral rationale**: <user-supplied or one-line default>

### Rejected (per `reject-as-false-positive`)

For each rejected finding:
- **F-NN [Severity]** [<Category>] <description>
  - **Rejection rationale**: <user-supplied>

### Dropped (per Phase 8 drop-list)

For each dropped finding:
- **F-NN** [<Category>] <description> — `(dropped by user at Phase 8)`
  [optional one-line user reason]

### Audit trail

- Total findings: <N>
- Filed: <K> (mutated <M> files)
- Manual-resolution: <Q>
- Deferred: <R>
- Rejected: <S>
- Dropped: <T>
- Sum check: K + Q + R + S + T = N (audit trail consistency)

The git diff after this run is the durable audit trail. Review with
`git diff` before committing. Do NOT commit from inside this skill.
```

### Step 4 — Do NOT git commit

The skill leaves all changes in the working tree. The user reviews via `git diff` and commits when ready. Committing inside the skill would defeat the user's review window and conflict with the project-wide "Do not git commit from inside a skill" rule (per CLAUDE.md §Non-Negotiables).

## Validation Rules This Skill Upholds

- **Rule 6: No Silent Retcons** — enforced at Phase 9 (correction attribution). Every applied correction's final-summary entry names the source-of-truth chosen, the one-line rationale (which selection rule fired — producer-vs-consumer, schema-anchor-bearing-skill, or manual-resolution), and the `file:line` anchors of every site mutated. Silent "fixed it" entries fail this rule. The chat summary IS the audit trail alongside `git diff`; both surfaces are required to satisfy Rule 6 at meta-tooling scope.

Rules 1, 2, 3, 4, 5, 7 are N/A for this skill. See FOUNDATIONS Alignment table below for the per-rule handoff to the sibling skill that DOES enforce each.

## Record Schemas

N/A — this skill emits no structured YAML records. Output is:

- Chat-only triage table (Phase 8) and chat-only final summary (Phase 9).
- File edits to existing skill files via `Edit` (and rare `Write`) tool calls. The "schema" enforced is each target file's pre-existing structure; the audit's correctness is in matching the user-approved diff verbatim, not in instantiating a new record schema.

The skill does not reference `templates/canon-fact-record.yaml` or `templates/change-log-entry.yaml` — neither applies at meta-tooling pipeline scope.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (§"non-negotiable") | Pre-flight + Phase 1 | `docs/FOUNDATIONS.md` and every family member's full corpus (SKILL.md + references/* + templates/*) are required mandatory reads; the skill refuses to audit without them. The audit *evaluates* the family's coherence — gaps in shared schemas, references, vocabulary, citations, or instructions fire as findings routed through Phases 2-6. |
| Rule 1: No Floating Facts | N/A | Not applicable — meta-tooling skill does not emit Canon Fact Records; output is `Edit` calls on existing skill files plus chat summaries. The downstream effect on canon-record correctness is enforced transitively by the family members themselves once their internal coherence is repaired. Handoff to `canon-addition` for CF-level Rule 1 enforcement. |
| Rule 2: No Pure Cosmetics | N/A | Not applicable — meta-tooling skill does not introduce world-level content. Handoff to `canon-addition` for canon-fact cosmetic-vs-substantive review. |
| Rule 3: No Specialness Inflation | N/A | Not applicable — meta-tooling skill does not add exceptional world elements. Handoff to `canon-addition` for specialness-inflation guard on canon additions. |
| Rule 4: No Globalization by Accident | N/A | Not applicable at world-canon scope; storylet-scope leakage (Rule 4 at story scope) is governed by `branching-story-health-audit` Phase 3 §Storylet-Scope Leakage. Handoff to `canon-addition` for per-fact scope detection at world scope; handoff to `branching-story-health-audit` for Rule 4 at story scope. |
| Rule 5: No Consequence Evasion | N/A | Not applicable — this skill does not emit canon facts. Second-order effects of repaired coherence (e.g., a STENT enum reconciliation propagating through every family member's parse-time consumers) are tracked as cross-file correction-groups under Phase 9 atomicity, not as a canon-rule enforcement gate. Handoff to `canon-addition` for per-fact consequence propagation. |
| Rule 6: No Silent Retcons | Phase 9 | Every applied correction's final-summary entry names the source-of-truth chosen, the one-line selection-rule rationale (producer-vs-consumer / schema-anchor-bearing-skill / manual-resolution), and the `file:line` anchors of every site mutated. Chat summary AND `git diff` together satisfy Rule 6 at meta-tooling scope. Silent "fixed it" entries fail this rule. |
| Rule 7: Preserve Mystery Deliberately | N/A | Not applicable — meta-tooling skill does not write canon and does not carry in-world content. The audit reads pipeline-level files (`.claude/skills/`, `docs/`) which contain no Mystery Reserve material. Handoff to `branching-story-health-audit` Phase 3 §Mystery Firewall Integrity for story-scope MR firewall enforcement; handoff to `continuity-audit` for world-scope MR-corruption auditing. |
| Rule 11: No Spectator Castes by Accident | N/A | Not applicable — meta-tooling skill does not introduce capability or status structures. Handoff to `canon-addition` for capability-CF spectator-caste discipline. |
| Rule 12: No Single-Trace Truths | N/A | Not applicable — meta-tooling skill does not emit hard-canon truths. Handoff to `canon-addition` for hard-canon trace-register discipline. |
| Canon Layering | N/A | Not applicable — meta-tooling skill does not write canon. Handoff to `canon-addition` for layer-assignment discipline. |
| Change Control Policy | N/A | Not applicable — meta-tooling skill does not emit Change Log Entries; the only mutation surfaces are skill files (no canon-record-affecting writes). Pipeline-level change attribution is covered by Phase 9's correction-attribution discipline (see Rule 6 row above). Handoff to `canon-addition` for world-level canon changes. |
| Canon Fact Record Schema | N/A | Not applicable — this skill does not emit CF Records; output is `Edit` calls on existing files. No `templates/canon-fact-record.yaml` is shipped. Handoff to `canon-addition` for CF emission. |
| Multi-world directory discipline | Pre-flight | Pipeline-scope (`meta` per the world-scope vocabulary) — the skill reads `.claude/skills/<family-member>/` and `docs/` and does NOT read `worlds/<slug>/`. The world-scope declaration is `meta` because the audit's evidence axis is the family-corpus content, which is per-pipeline rather than per-world. |
| Story Bundles §Validation Rules At Story Scope (Rule 4 / Rule 5 / Rule 7 at story scope) | N/A | Not applicable — this skill audits family-member coherence, not story-bundle records. Handoff to `branching-story-health-audit` for the story-scope per-rule enforcement (§"Validation Rules At Story Scope" — Rule 4 storylet-scope leakage at Phase 3, Rule 5 consequence-ledger coverage at Phase 3, Rule 7 mystery-firewall integrity at Phase 3). |

## Guardrails

- **Pipeline scope, not world scope**: this skill operates at pipeline scope. It reads under `.claude/skills/<family-member>/` and `docs/` and writes only to `.claude/skills/<family-member>/{SKILL.md, references/*, templates/*}` for the five hardcoded family members. It does NOT read or write `worlds/<slug>/`, `_source/<subdir>/*.yaml`, `tools/`, `tickets/`, `archive/`, or any non-family `.claude/skills/` subtree. Audits of the world-canon side or the tool-package side route to `continuity-audit` and `mcp-integration-audit` respectively.
- **Family-list maintenance**: the family list is hardcoded in this skill at Pre-flight Step 2 AND in the §World-State Prerequisites block. When a new story skill is added to the family in the future, this skill's family list MUST be updated in the same change. Adding a sixth family member without updating the list silently excludes the new member from coherence audits — a Rule 6 silent-retcon analog at the meta-tooling layer. A future skill-audit should verify the two list declarations agree byte-for-byte.
- **No FOUNDATIONS edits**: this skill NEVER edits `docs/FOUNDATIONS.md`. FOUNDATIONS lives outside this tool's authority — same prohibition as `skill-creator`, `skill-audit`, `skill-consolidate`, and `mcp-integration-audit` per their Guardrails. If a coherence finding reveals that FOUNDATIONS itself is the source-of-truth that the family diverges from (rare), the finding routes to manual-resolution; the user lands the FOUNDATIONS amendment in a separate session (or via an `mcp-integration-audit` `FOUNDATIONS-NNN` ticket if the amendment is a contract-level commitment).
- **No world-canon writes**: this skill never writes to `worlds/<slug>/` files, `_source/<subdir>/*.yaml` records, or any world-level canon surface — Hook 3 enforces the YAML-record side; the skill's discipline enforces the rest. If a family member's coherence repair appears to require a world-canon change, that work happens through `canon-addition` once the underlying skill-prose change has landed.
- **No ticket writes**: this skill does NOT emit `tickets/<NAMESPACE>-NNN.md` files. Ticket-emission is `mcp-integration-audit`'s domain (pipeline infrastructure gaps) and `spec-to-tickets`' domain (spec decomposition). This skill's deliverable is `Edit` calls on the family files themselves, plus a chat summary; no ticket is filed for any finding.
- **No skill-prose changes outside the family**: even if a coherence finding incidentally surfaces a coherence issue between a family member and a non-family skill (e.g., a vocabulary drift between `branching-story-bootstrap` and `propose-new-canon-facts`), the audit reports the finding for visibility but does NOT auto-edit the non-family skill. The family is the audit's authority surface; non-family skills are out of bounds.
- **Manual-resolution is non-negotiable for cross-skill schema drift on ambiguous canonical**: when a C1 cross-skill schema-drift finding cannot resolve to a single canonical sibling via the producer-vs-consumer or schema-anchor-bearing-skill rule, the finding MUST be tagged `manual-resolution` — never auto-applied, never silently selecting one sibling. A wrong canonical pick corrupts every consuming family member at once; the user's explicit choice is the only safe path.
- **HARD-GATE absolute under Auto Mode**: invoking the skill is not approval of the correction batch. Auto Mode auto-approval at Phase 8 fires only when every surviving candidate is severity LOW AND no manual-resolution flag is set AND no cross-skill schema-drift findings remain. CRITICAL/HIGH findings, manual-resolution items, or cross-skill schema-drift always require explicit user approval even under Auto Mode.
- **Per-finding atomicity for cross-file corrections**: a finding whose correction-group spans multiple files applies as a unit or rolls back. Partial-state failure at the meta-tooling layer leaves the family in a worse state than before the audit (one sibling updated, others not) — the rollback discipline at Phase 9 §Step 2 is load-bearing.
- **Verbatim diff handoff from Phase 7 to Phase 9**: `old_string` / `new_string` come from the Phase 7 `proposed_correction` field, NOT re-derived at Phase 9. Re-derivation would introduce drift between what the user approved at Phase 8 and what the skill writes — a Rule 6 silent-retcon analog.
- **Worktree discipline**: if invoked inside a git worktree, all paths — reads, writes, globs, greps — resolve from the worktree root, not the main repo root.
- **Do not `git commit` from inside this skill**: Phase 9 explicitly states no commit. The user reviews via `git diff` and commits when ready. Committing inside the skill defeats the user's review window and violates the project-wide rule (CLAUDE.md §Non-Negotiables).

## Final Rule

An audit is not complete until every detected internal incoherence has been categorized (C1-C6), severity-classified with one-line rationale, dispositioned by the user (or auto-approved under the strict auto-mode condition), and either applied as a Rule-6-attributed correction in Phase 9's chat summary OR surfaced as a manual-resolution / deferred / rejected item with rationale recorded in that same summary.
