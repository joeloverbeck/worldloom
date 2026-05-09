<!--
Worked example for story-skill-internal-coherence.

Authored from scratch (sub-class b per skill-creator's write-files Procedure
§6 sub-step 3 — output unique to this skill, no downstream sibling consumer
exists for the chat-summary content). The example shows a realistic
invocation hitting findings across all six categories (C1-C6), with the
Phase 8 triage table and the Phase 9 final summary as they would appear in
chat. Findings are illustrative — names, line numbers, and quoted snippets
are fabricated to demonstrate the SHAPE; do not interpret them as real
defects in the family at the time of authoring.
-->

# Worked Example — Mixed-Category Coherence Audit

**Invocation**: `/story-skill-internal-coherence .claude/skills/branching-story-bootstrap`

(The argument is the entry point; the audit covers the full hardcoded family.)

---

## What the user sees during Phases 1-7

> *(Phases 1-7 are largely silent — the skill loads context, builds the inventory, runs each detection phase, and consolidates findings. The user sees only short progress acknowledgments. The substantive output is the Phase 8 triage table.)*

---

## Phase 8 — Triage Summary Table (chat output before HARD-GATE fires)

```
## Story-Skill Internal Coherence — Triage Summary

Family audited: branching-story-bootstrap, branching-story-page-cycle,
storylet-pool-authoring, branching-story-health-audit,
story-fact-promotion-to-canon

7 findings across 6 categories:
  C1 (shared-schema drift): 2
  C2 (contradictory instructions): 1
  C3 (dangling cross-references): 1
  C4 (numerical-citation drift): 1
  C5 (vocabulary drift): 1
  C6 (phase-numbering drift): 1

Severity distribution: 1 CRITICAL, 3 HIGH, 2 MEDIUM, 1 LOW
```

| #  | Finding ID | Category | Severity | Affected Files | Description (one-line) | Proposed Correction | Status |
|----|------------|----------|----------|----------------|------------------------|---------------------|--------|
| 1  | F-01 | C1 | CRITICAL | `bootstrap/templates/storylet-record.yaml:42`, `storylet-pool-authoring/templates/storylet-record.yaml:38` | `SLT.shape` enum diverges: bootstrap allows `[narrative_beat, scene_commitment_arc]`; storylet-pool-authoring allows `[narrative_beat, scene_commitment_arc, runtime_jit]` — page-cycle parses `shape` at runtime and rejects unknown values | producer-rule → storylet-pool-authoring is the canonical author of SLT records; edit bootstrap's enum to add `runtime_jit` | candidate |
| 2  | F-02 | C1 | HIGH | `health-audit/templates/remediation-storylet-proposal-card.md:12`, `storylet-pool-authoring/SKILL.md:218` | RSP card frontmatter: producer (health-audit) declares `target_branch: PG-NNNN`; consumer (storylet-pool-authoring §audit-mode) parses `branch_path: [PG-NNNN, …]` — same intent, different field name | producer-rule → health-audit is canonical (it produces the card); edit storylet-pool-authoring's audit-mode parse to read `target_branch` instead of `branch_path` | candidate |
| 3  | F-03 | C2 | HIGH | `bootstrap/SKILL.md:147` (HARD-GATE clause), `page-cycle/references/phase-1-choice-resolution.md:23` | Bootstrap HARD-GATE says "snapshot-replay equality is checked at Phase 9 gate 4"; page-cycle phase-1 ref says "snapshot-replay equality is enforced continuously across Pre-flight" — bootstrap-time vs runtime semantics are compatible but the unmediated prose contradiction is a HARD-GATE-timing contradiction | edit page-cycle/references/phase-1-choice-resolution.md to clarify "runtime check; bootstrap-time gate is bootstrap Phase 9 gate 4 per `branching-story-bootstrap`" | candidate |
| 4  | F-04 | C3 | HIGH | `health-audit/SKILL.md:482` | dangling reference: "see `references/phase-9-validation-gates.md`" — the file does not exist under `health-audit/` (the skill ships `examples/` not `references/`); the cited content lives in `branching-story-health-audit/SKILL.md` Phase 9 directly | (no auto-edit; the human knows whether the reference should point at a sibling skill, an existing section, or a yet-to-be-written reference doc) | manual-resolution |
| 5  | F-05 | C4 | HIGH | `bootstrap/SKILL.md:61` (HARD-GATE clause) | HARD-GATE cites "all 8 Phase 9 validation gates pass"; the actual Phase 9 §Validation Gates table has 10 rows (gate 1 through gate 10) | re-write "8 validation gates" → "10 validation gates" in the HARD-GATE clause | candidate |
| 6  | F-06 | C5 | MEDIUM | `bootstrap/references/phase-5-threads-and-obligations.md:88`, `health-audit/SKILL.md:176` | identifier drift: bootstrap uses `audited_thread_obligation_sketch`; health-audit consistently uses `audited_thread_obligation_sketch` BUT one site under `bootstrap/references/` uses `thread_obligation_audit_sketch` (likely a leftover from an earlier rename) | edit `bootstrap/references/phase-5-threads-and-obligations.md` site to match the canonical name `audited_thread_obligation_sketch` | candidate |
| 7  | F-07 | C6 | MEDIUM | `page-cycle/SKILL.md:271` | SKILL.md cites "Phase 7.6 ARC_TRACE extraction"; the file `page-cycle/references/phase-7-6-arc-trace-extraction.md` exists, but no `phase-7-7-*.md` exists for the "Phase 7.7" reference also cited at line 274 — phase numbering pattern in use; phase 7.7 is unbacked | (no auto-edit; either the SKILL.md citation is wrong OR a `phase-7-7-*.md` reference doc is missing) | manual-resolution |
| 8  | F-08 | C5 | LOW | (multiple sites in `health-audit/SKILL.md`) | acronym drift: "RSP card" used 12 times; "remediation-storylet-proposal card" used 4 times — both refer to the same record class | (no auto-edit proposed at LOW severity for prose-acronym normalization; surfaced for visibility) | candidate |

---

## User dispositions (illustrative)

The user reviews the table and types:

> `file 1 2 3 5 6; defer 8 — surface as wording polish in next consolidation pass`

(F-04 and F-07 are `manual-resolution` — they pass through to the final summary as user-action items regardless of disposition.)

---

## HARD-GATE fires

The HARD-GATE evaluates conditions (a)-(e):

- (a) Pre-flight loaded all family corpora ✓
- (b) Phases 1-7 completed; all findings have populated record fields ✓
- (c) Phase 7 self-check passed for all findings (severity rationales present, source-of-truth recorded for filed findings, manual-resolution findings cite both candidate sources) ✓
- (d) Phase 8 emitted the triage table; user provided explicit per-finding dispositions ✓
- (e) Drop-list semantics honored: F-08 deferred (not dropped; reappears in summary); F-04 and F-07 manual-resolution (never auto-applied) ✓

Gate fires. Skill proceeds to Phase 9.

---

## Phase 9 — Atomic Correction Writes

Five corrections to apply (F-01, F-02, F-03, F-05, F-06). F-01 and F-02 are independent single-file (or two-file) groups. F-03 is single-file. F-05 is single-file. F-06 is single-file.

The skill emits one batched parallel-tool-use message containing five `Edit` tool calls — one per filed correction's primary edit. F-02's correction-group spans two files (the canonical declaration in `health-audit/templates/...` plus the consumer's parser-comment in `storylet-pool-authoring/SKILL.md`); both edits are batched in the same message, with rollback discipline if either fails.

---

## Phase 9 — Final Summary (chat output)

```
## Story-Skill Internal Coherence — Final Summary

Family audited: branching-story-bootstrap, branching-story-page-cycle,
storylet-pool-authoring, branching-story-health-audit,
story-fact-promotion-to-canon
Files mutated: 6 across 4 family members
Findings: 8 (2 C1, 1 C2, 1 C3, 1 C4, 2 C5, 1 C6)
   — 1 CRITICAL, 3 HIGH, 2 MEDIUM, 1 LOW by severity

### Applied (filed)

- **F-01 [CRITICAL]** [C1] SLT.shape enum diverges between bootstrap and storylet-pool-authoring
  - Source-of-truth chosen: storylet-pool-authoring — producer-rule (it
    is the canonical author of SLT records; bootstrap embeds a minimal
    seed shape and must match the producer)
  - Files mutated: bootstrap/templates/storylet-record.yaml
  - Diff: `shape: [narrative_beat, scene_commitment_arc]` →
    `shape: [narrative_beat, scene_commitment_arc, runtime_jit]`

- **F-02 [HIGH]** [C1] RSP card field-name divergence (target_branch vs branch_path)
  - Source-of-truth chosen: branching-story-health-audit — producer-rule
    (it emits the card; the consumer's parse-time field name must follow
    the producer's frontmatter)
  - Files mutated: storylet-pool-authoring/SKILL.md (audit-mode parse
    section), storylet-pool-authoring/references/phase-1-coverage-diagnosis.md
  - Diff (storylet-pool-authoring/SKILL.md): "parse `branch_path` from the
    RSP card frontmatter" → "parse `target_branch` from the RSP card
    frontmatter"
  - Diff (storylet-pool-authoring/references/phase-1-coverage-diagnosis.md):
    matching cross-reference rewritten

- **F-03 [HIGH]** [C2] HARD-GATE timing contradiction on snapshot-replay equality
  - Source-of-truth chosen: bootstrap — the bootstrap-time gate is the
    structural authority; page-cycle's runtime check is a derived
    enforcement (clarification, not contradiction)
  - Files mutated: page-cycle/references/phase-1-choice-resolution.md
  - Diff: appended one-line clarification "(runtime check; bootstrap-
    time gate is bootstrap Phase 9 gate 4 per `branching-story-bootstrap`)"

- **F-05 [HIGH]** [C4] HARD-GATE numerical-citation drift: 8 vs 10 validation gates
  - Source-of-truth chosen: bootstrap Phase 9 §Validation Gates table
    itself (the source enumeration; 10 gate-table rows is ground truth)
  - Files mutated: bootstrap/SKILL.md
  - Diff: "all 8 Phase 9 validation gates pass" →
    "all 10 Phase 9 validation gates pass"

- **F-06 [MEDIUM]** [C5] identifier drift: thread_obligation_audit_sketch vs audited_thread_obligation_sketch
  - Source-of-truth chosen: audited_thread_obligation_sketch (canonical
    across the family; the variant is the leftover)
  - Files mutated: bootstrap/references/phase-5-threads-and-obligations.md
  - Diff: `thread_obligation_audit_sketch` →
    `audited_thread_obligation_sketch`

### Manual-resolution (user action required)

- **F-04 [HIGH]** [C3] dangling reference `references/phase-9-validation-gates.md` in `health-audit/SKILL.md`
  - Candidate sources:
    (a) the cited file should be created (extract Phase 9 prose from
        SKILL.md into a reference doc),
    (b) the cross-reference should point at `branching-story-health-audit/SKILL.md` Phase 9 directly,
    (c) the cross-reference is stale and should be removed.
  - Why no auto-edit: three plausible resolutions; the right one depends
    on whether the maintainer wants to extract a reference doc or keep
    Phase 9 inline.
  - Suggested resolution path: read SKILL.md Phase 9 length; if >150
    lines, prefer (a); otherwise (b).

- **F-07 [MEDIUM]** [C6] phase-numbering drift: page-cycle SKILL.md cites Phase 7.7 but no `phase-7-7-*.md` exists
  - Candidate sources:
    (a) the SKILL.md citation is a typo for Phase 7.6 (which DOES have
        a backing reference doc),
    (b) Phase 7.7 is a real planned phase whose reference doc has not
        yet been authored.
  - Why no auto-edit: cannot disambiguate from textual evidence alone.
  - Suggested resolution path: check git log for recent additions of
    Phase 7.6 vs Phase 7.7 references.

### Deferred (per `defer-with-rationale`)

- **F-08 [LOW]** [C5] acronym drift: "RSP card" vs "remediation-storylet-proposal card"
  - Deferral rationale (user-supplied): "surface as wording polish in
    next consolidation pass"

### Rejected

(none)

### Dropped

(none)

### Audit trail

- Total findings: 8
- Filed: 5 (mutated 6 files across 4 family members)
- Manual-resolution: 2
- Deferred: 1
- Rejected: 0
- Dropped: 0
- Sum check: 5 + 2 + 1 + 0 + 0 = 8 ✓

The git diff after this run is the durable audit trail. Review with
`git diff` before committing. Do NOT commit from inside this skill.
```

---

## Notes for maintainers

- This example shows the **shape** of the chat output. Actual findings will vary per invocation; the categories, severity rubric, and disposition vocabulary stay constant.
- Manual-resolution findings appear in **both** the Phase 8 triage table (with `manual-resolution` Status) AND the Phase 9 final summary (in their dedicated section). They are never auto-applied; the user resolves them out of band after the run.
- The audit-trail sum check (`Filed + Manual-resolution + Deferred + Rejected + Dropped = Total`) is the structural backstop — if the math doesn't add up, a finding leaked between buckets and the audit's accounting is broken.
- File and line citations in this example are illustrative. A real run produces verbatim line numbers from the actual family content at audit time.
