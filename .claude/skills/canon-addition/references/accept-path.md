# Accept Path: Phases 12a-15a

Load this reference when Phase 11 produces any accept verdict (ACCEPT / ACCEPT_WITH_REQUIRED_UPDATES / ACCEPT_AS_LOCAL_EXCEPTION / ACCEPT_AS_CONTESTED_BELIEF). This reference covers the Required Update List, deliverable assembly, validation tests, and the commit procedure with its HARD-GATE.

## Phase 12a: Required Update List

Produce a verifiable one-line-per-file Required Update List. For every file in the new CF record's `required_world_updates` plus every file modified by an existing-CF qualification, write a single line:

```
- <FILE.md> — <one-sentence summary of what changes>
```

For files with multiple distinct subsection updates, the line may be extended with a trailing semicolon-separated subsection list:

```
- <FILE.md> — <one-sentence summary>; <subsection-1>: <change>; <subsection-2>: <change>; ...
```

The summary remains a single sentence; the subsection list is optional structured detail that preserves audit-trail granularity for large deliveries without fragmenting the Required Update List into multi-line entries.

The Required Update List is the *gate* that opens Phase 13a: drafting may only begin once every required-updates entry has a corresponding one-sentence summary present *somewhere* in the accept-branch artifacts. This separation prevents both silent merging (drafting without enumerating) and duplicated drafting (writing prose twice).

**Placement flexibility (a / b / c)**: The Phase 12a Required Update List is a discipline, not a mandated standalone artifact. The required information content — one-sentence summary per affected file — may be carried by any of:

- **(a)** a dedicated "Phase 12a Required Update List" block in the adjudication record or deliverable summary (most explicit form);
- **(b)** the Phase 15a deliverable summary's per-artifact one-paragraph summaries (when those summaries name-and-describe each file's patch);
- **(c)** an expanded `required_world_updates` list in the CF record where each entry carries a trailing "— <one-sentence summary>" after the filename.

Whatever form is chosen, the reader of the deliverable summary must be able to point at a specific location where each required-update file is named AND described in one sentence. "The filename appears in `required_world_updates`" alone does not satisfy the discipline; the description sentence is load-bearing. The trailing semicolon-separated subsection list may be applied to whichever placement is chosen.

For each summary, the content must name: what is added; what is revised; what new questions arise (route to `OPEN_QUESTIONS.md`); what ordinary-life consequences must now be visible (route to `EVERYDAY_LIFE.md`).

**Rule**: No canon addition is complete until these updates are drafted as concrete patches against the current file contents in Phase 13a. "TODO: update INSTITUTIONS.md" is not acceptable in either Phase 12a Required Update List or Phase 13a patch.

**FOUNDATIONS cross-ref**: Change Control Policy.

## Phase 13a: Deliverable Assembly

Phase 13a may begin only after the Phase 12a discipline is satisfied — every file in `required_world_updates` has an identified one-sentence summary in whichever placement the drafter has chosen (a / b / c — see Phase 12a). For placement (c) where the summary lives in the CF record's `required_world_updates` list, the Phase 12a discipline is satisfied as part of Phase 13a artifact class 1 drafting itself; the Required Update List and the CF record converge in the same artifact. Drafting produces five artifact classes:

1. **New CF Record(s)** matching `templates/canon-fact-record.yaml`. The `source_basis.direct_user_approval` flag is a logical gate: it must NOT be `true` in any file on disk until the user has explicitly approved the Phase 15a deliverable summary. In practice: if drafts are persisted to disk before approval (e.g., scratch files, preview commits), set `direct_user_approval: false`; if the CF is assembled only in working memory and written once at Phase 15a after approval, setting `true` in that single atomic write is compliant. What is forbidden is persisting a CF with `true` to any file (especially `CANON_LEDGER.md`) before the HARD-GATE has been released. Repair-splits produce multiple records linked via `source_basis.derived_from`.

2. **Modifications to Existing CF Records** (when Phase 8 / Phase 9 require qualifying or extending an existing CF rather than appending a new one):
   - Edit the existing YAML record in place. Update affected fields (statement, distribution, costs_and_limits, visible_consequences, contradiction_risk) to reflect the qualification.
   - Append a standardized line to the modified CF's `notes` field: `Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): <one-sentence summary of the qualification and its rationale>.` Use the new CF's id (the one that prompted the modification) inside the parentheses.
   - Populate the `modification_history` array with a new entry for the current change (`change_id`, `originating_cf`, `date`, `summary`). Both the notes-field line and the modification_history entry are REQUIRED TOGETHER whenever the CF is identified by the Phase 12a modification_history scan (SKILL.md Procedure step 5 — CFs appearing in the proposal's `derived_from_cfs`, in Phase 8 soft-contradiction findings, OR substantively extended under Phase 9 repairs). The notes-field line carries the human-readable trace; the modification_history entry is the machine-readable complement. Omitting the array entry when the scan identifies the CF is a Rule 6 (No Silent Retcons) audit-trail gap even when the notes-field line is correctly appended.
   - YAML CF records do NOT carry `<!-- added by CF-NNNN -->` HTML-comment attribution — that syntax is invalid inside YAML and is reserved for markdown prose patches (see artifact 4 below).

3. **Change Log Entry** matching `templates/change-log-entry.yaml`. `change_id: CH-NNNN`. `affected_fact_ids` lists every CF id touched (new + modified); document each id's role (added / qualified / extended) in the `summary` and `notes` fields. `downstream_updates` lists every Phase 12a Required Update List file. `change_type` is `addition` for any change whose dominant action is appending new CFs (even when paired with qualifications to existing CFs); use `*_retcon` only when the dominant action is modifying an existing CF's scope, cost, perspective, chronology, or ontology. `retcon_policy_checks` all true. Populate `latent_burdens_introduced` (see template) with one-line entries for every Phase 8 "Latent Burden" classification — these become the searchable trace of mandatory future lore work this change creates.

4. **Domain-file patches** — concrete prose edits to the files named in the Phase 12a Required Update List. Each markdown-prose addition or revision carries an inline `<!-- added by CF-NNNN -->` HTML-comment attribution.

   **Placement convention**: the attribution opens the element it introduces — not mid-sentence, not end-of-line. Per element type:
   - **Bullets** in existing lists: attribution immediately after list marker and whitespace.
   - **Nested sub-bullets** under an existing parent bullet: same rule applied at the child's nesting level.
   - **Paragraphs** inside existing prose blocks: attribution opens the paragraph.
   - **Sections** (new H2/H3 inside an existing file): attribution immediately precedes the heading on its own line.
   - **Table rows** with prior-CF attribution: append the new attribution inside the existing comment block in chronological order (e.g., `<!-- added by CF-0025; annotated by CF-0031 -->`) rather than adding a second comment to the same row.

   Applies to markdown prose only; YAML CF modifications use the `notes`-field convention from artifact 2 above.

   **Mystery Reserve extension convention**: Patches that extend an existing `MYSTERY_RESERVE.md` entry with a cross-application firewall — typically when a new CF's scope overlaps an M-N entry's domain and needs an explicit "this CF does not violate M-N, and here is how" clause — follow a canonical form paralleling the section-level placement rule. Place the attribution on its own line, then open the extension block with a bolded header that names the change id and the firewall purpose, then describe the cross-application, then (when the extension adds a forbidden answer) append an "Added to disallowed cheap answers:" clause, and close with the firewall-holds confirmation sentence. Canonical form:

   ```
   <!-- added by CF-NNNN -->
   **Extension (CH-NNNN) — <descriptor>**: <body explaining the cross-application and why the M-N firewall is preserved>. Added to disallowed cheap answers: *"<short phrasing> — forbidden reveal."* The M-N firewall holds with this cross-application clause.
   ```

   The "Added to disallowed cheap answers" clause is included only when the extension manufactures a new forbidden reveal; cross-references that merely acknowledge the CF's commitment without adding a new disallowed answer may omit it and close with the firewall-holds sentence directly. The "M-N firewall holds with this cross-application clause" sentence is load-bearing — it is the explicit audit-trail marker that future canon-addition runs grep for to confirm the extension was applied with firewall discipline rather than as an accidental narrowing. Precedent exemplar: the CF-0033 CH-0007 extensions on M-6, M-7, M-8, M-9, and M-11 in the animalia world ledger instantiate this form across five MR entries in a single CH.

   When a new CF manufactures an entirely NEW Mystery Reserve entry (per Phase 9 Rule 7 obligation), the entry is a full H2 section inserted at the tail of MYSTERY_RESERVE.md with attribution on its own line immediately preceding the heading; the entry must include all standard MR fields (`**Status**`, `**Knowns**`, `**Unknowns**`, `**Common in-world interpretations**`, `**Disallowed cheap answers**`, `**Why this stays unresolved**`, `**Domains touched**`, `**Future-resolution safety**`) per FOUNDATIONS.md §Canon Layers §Mystery Reserve schema.

5. **Adjudication record** at `worlds/<world-slug>/adjudications/PA-NNNN-<verdict>.md` — original proposal + full Phase 0–11 analysis + verdict + phase-cited justifications + declined repair options + (if escalation fired) six critic sub-agent reports verbatim. Populate the Discovery section at the top of the report (see `templates/adjudication-report.md`) with the lists of `mystery_reserve_touched`, `invariants_touched`, and `cf_records_touched` — these enable future canon-addition runs to grep `worlds/<world-slug>/adjudications/*.md` for prior guidance on the same surfaces. Populate the Phase 14a Validation Checklist section (see template) before the verdict; this becomes the auditable record of validation pass/fail per test.

## Phase 14a: Validation and Rejection Tests

Run all 9 tests below and record each as PASS / FAIL with a one-line rationale into the adjudication record's "Phase 14a Validation Checklist" section (see `templates/adjudication-report.md`). Any FAIL halts and loops back to the originating phase; do NOT proceed to Phase 15a until every test records PASS.

1. New fact's `domains_affected` is non-empty (Rule 2). Labels SHOULD be drawn from the canonical enum plus established ledger extensions (see Phase 6 §"Domain label convention"). Labels outside that set pass the non-empty test but degrade grep-discoverability and should be justified in `notes`.
2. New fact has populated `costs_and_limits` and `visible_consequences` (Rule 1). `prerequisites` is populated for `capability`, `artifact`, `technology`, `institution`, `ritual`, `event`, `craft`, and `resource_distribution` types whose manifestation has operational preconditions. It may be empty for `metaphysical_rule`, `belief`, `hazard`, `historical_process`, `text_tradition`, `local_anomaly`, `hidden_truth`, `species`, `law`, and `taboo` types whose truth-value has no operational precondition — but empty `prerequisites: []` must carry either an inline comment stating why (e.g., `# metaphysical rule; no operational precondition`) OR an explicit `notes`-field sentence naming the type-based exemption. Ledger precedent for empty prerequisites: CF-0002, CF-0003, CF-0005, CF-0014, CF-0016, CF-0022.
3. Any CF whose `scope.geographic` is non-`global` OR whose `scope.social` is non-`public` has populated `distribution.why_not_universal` with at least one concrete stabilizer (Rule 4). Applies regardless of `type`; Rule 4 concerns scope, not category. A fact with `scope.geographic: global` AND `scope.social: public` may leave `why_not_universal` empty, but an inline comment or `notes` sentence confirming "universal by stated scope" is recommended.
4. Phase 6 second- and third-order consequences appear either in the CF record's `visible_consequences` list OR in at least one Phase 13a patch targeting a file named in `required_world_updates` (Rule 5). A consequence merely implied by a filename in `required_world_updates` without a corresponding drafted patch does NOT satisfy this test.
5. Change Log Entry `retcon_policy_checks` are all true (Rule 6).
6. Phase 10 flagged no forbidden-answer collision, OR every flagged collision was repaired in Phase 9 (Rule 7).
7. Every file in `required_world_updates` has a corresponding one-sentence summary somewhere in the accept-branch artifacts (placement a / b / c — see Phase 12a) AND a concrete Phase 13a patch. Test 7 passes when BOTH conjuncts are satisfied.
8. Every stated stabilizer (Phase 7) names a concrete mechanism; no hand-waves.
9. Verdict reasoning cites specific phase findings; vague verdicts fail.

Recording format per test (one row of the checklist section):

```
- Test N (Rule R / topic): PASS — <one-line rationale>
```

A PASS without rationale is treated as FAIL. The recorded checklist is what the user reads at Phase 15a HARD-GATE; absent or undocumented validation breaks the audit trail.

## Phase 15a: Commit (accept branch)

Present the deliverable summary to the user:
1. Verdict + phase-cited justification
2. CF Record summary (id, title, status, scope, domains, key consequences, key stabilizers)
3. Change Log Entry summary (id, change type, affected fact ids, downstream updates, retcon policy checks)
4. One-paragraph summary of each domain-file patch
5. Repair options considered and why the chosen repair won (if Phase 9 fired)
6. Critic synthesis summary (if escalation gate fired)
7. Adjudication record filename

**Large-change two-tier presentation**: For large deliveries (>3 new CFs OR >7 downstream files OR escalation gate fired), present a two-tier summary:

- **Tier 1 (overview)**: verdict + phase-cited justification + totals (new CFs, qualified CFs, downstream files, new Mystery Reserve entries, latent burdens introduced) + the three-to-five most load-bearing Phase 9 tradeoffs. Enough for an informed approve / revise / reject decision on its own.
- **Tier 2 (per-artifact detail)**: the full 7-item list above, rendered per artifact. Presented immediately if the user asks for it, or if the Tier 1 overview leaves material ambiguity.

**Combined-response form is allowed at the large-change threshold.** When the large-change trigger fires, the operator may present Tier 1 and Tier 2 in a single response (both labeled and visible) OR may present Tier 1 first and defer Tier 2 until the user asks. Prefer the combined form when Tier 1 relies on Tier 2 content for material context (e.g., the most load-bearing Phase 9 tradeoffs are hard to describe without naming the affected artifacts). Prefer deferred Tier 2 when Tier 1 is self-contained and the user is likely to approve on overview alone. Either form satisfies the HARD-GATE requirement.

For smaller deliveries, Tier 1 and Tier 2 collapse into the single 7-item summary — no staging needed.

**HARD-GATE fires here**: no file is written until the user explicitly approves. User may (a) approve, (b) request specific revisions (loop back to named phase), (c) reject and convert to non-accept branch.

On approval, write the deliverable in this order — sequencing matters because the tool environment cannot guarantee true transactional atomicity, and a deterministic order makes partial-state recovery tractable:

1. **Domain-file patches first**. Apply every Phase 13a patch to its target file with inline attribution per Phase 13a artifact 4 placement convention.
2. **Adjudication record next**. Write `worlds/<world-slug>/adjudications/PA-NNNN-<verdict>.md`, including the populated Discovery section and Phase 14a Validation Checklist.
3. **CANON_LEDGER.md last**. Within this file, apply three sub-steps in strict order — this makes partial-failure detection tractable:
   1. **CF qualifications first** — apply all in-place YAML edits with `notes`-field modification trace and `modification_history` entries. Completing this before appending new CFs means an interrupted run has consistent qualifications without unresolved new CFs referencing them. **Empty-array edge case**: if the target CF's current `modification_history` is in empty inline-flow form (`modification_history: []`), replace the entire line with block-form — `modification_history:` on its own line followed by indented `-` entries. Do not leave both `[]` and block entries coexisting; the result is invalid YAML and breaks future ledger tooling that parses the field. Conversely, when the target CF already has a populated `modification_history:` block-form array, append the new entry to the array; do NOT reset to `[]` first.
   2. **Append new CF record(s)** to the CFs section, before the `## Change Log` header. Set each new CF's `source_basis.direct_user_approval: true` immediately before these appends — this is the moment of canon mutation.
   3. **Append the Change Log Entry last** at the tail of the change log section. The newest change entry is always the last YAML block in the file, which makes grep-and-tail discovery of "what changed most recently" a one-liner for future canon-addition runs.

The "ledger-last" sequencing means a partial-failure state has domain-file edits + an adjudication record but no canon-ledger commit — easy to detect (the new CF id is missing from `CANON_LEDGER.md`) and easy to roll back. The inverse — canon record without supporting consequence web — would silently fail Rule 5 and be much harder to detect.

Report all written paths.
