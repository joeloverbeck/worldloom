# Writing the Updated Spec (Step 7)

After all findings are resolved and approved:

## Pre-Apply Verification

Run targeted checks to confirm each finding still holds (grep confirming symbol presence/absence, count validation, path-exists, file-read of the target line). Emit the verification table in chat before any Write/Edit call — a vague "I checked the findings" is not sufficient.

**Row-shape taxonomy**: three row shapes are valid in the pre-apply table, each with its own trigger:

- **Command-backed row** (default): `Finding | <grep / test / file-read command> | <result>`. Use whenever any symbol named in the finding can be grepped, any path can be `test -f`'d, or any line can be read.
- **Judgment-only row**: `Finding | Judgment — <restated rationale> | <result>`. Use for findings whose recommendation is purely analytical (arithmetic re-derivation, judgment-based refinement, no codebase symbol being referenced) OR when the user delegates resolution to the reassessor's reasoning ("you decide based on FOUNDATIONS"); in the latter case, append `; Q<N> delegated` to the rationale so the delegation is auditable. Use sparingly — prefer command-backed whenever a symbol is greppable. A bare `Judgment` without the restated rationale is treated as a skipped check, parallel to how a bare acknowledgment is treated as a skipped reference load.
- **User-answered row**: `Finding | User answer Q<N> = (<option>): <one-line paraphrase of the chosen option> | Apply as: <concise edit description>`. Use when the user explicitly answers a Step 6 Question with an option label. The Question + answer IS the check; do NOT prefix with `Judgment —` (the Judgment shape is reserved for analytical rationale or delegated resolution, not for user-selected options). See the SKILL.md pre-apply-table example (I4 row) for the canonical form. **Terse user replies**: when the user replies tersely (e.g., `go with (a)`, `recommended (a)`, `1) a 2) b`), expand the response into the canonical form by paraphrasing the option text from the Step 6 presentation — the audit trail in the table records what the option meant, not the user's verbatim wording.
- **Hybrid user-answered + proactive-verification row**: when a user-answered option's phrasing names a codebase claim (file path, type existence, function signature, line number), spot-verify the claim via a command-backed check even when the user's approval was unconditional. Record the verification outcome in the Result column alongside the "Apply as: ..." notation (format: `<verification outcome>. Apply as: <edit description>`). This is a proactive instance of §Conditional approval (see `references/findings-and-questions.md`) — the premise verification is auditor-initiated rather than user-imposed, but the row shape is the same. Do NOT split into two rows; the row's Check column remains the user-answered form, and the hybrid is a refinement of the user-answered shape, not a fourth peer.

**Multi-section pre-edit grep**: when a finding's Result column names multiple sections of the spec to edit (e.g., `Approach + Deliverables`, `Approach + Verification`, `Deliverables + Risks`), run an exact-string grep for the changed terminology across the entire spec before opening the first Edit call, and record the count + line numbers in the Result column (e.g., `3 instances at lines L1, L2, L3 — apply at all`). Cross-section restatements drift silently because the deliverable's number is unchanged — only its content shifts; the verification table verifies the finding still holds, but it does not by itself verify the edits will be complete. This is the pre-edit instantiation of §Apply Changes' "When materially modifying a deliverable's mechanism, name, or surface area" rule — moved into the pre-apply phase so the count is in hand when edits begin, and the post-apply confirmation grep at Step 8 has a target row count to verify against.

**Cross-finding pre-edit grep** (when N findings share the same cross-cutting grep): when ≥2 findings collectively touch overlapping spec sections (typical of reassessments with several interlocking findings affecting the same Approach + Deliverables + Verification + Risks + Outcome restatements), the multi-section pre-edit grep may be reported in either of two shapes:

- (a) **Inline per-finding**: restate the same grep result in each affected finding's Result column. Cleaner when only 2 findings overlap and the grep result is short.
- (b) **Trailing summary row**: a single row at the table foot covering the cross-cutting grep, labeled `Multi-section pre-edit grep` (literal label; no `I/M/A` finding-key letter), summarizing the count + line numbers and naming which findings the grep covers (e.g., `7 instances at lines L1, L2, L3, L4, L5, L6, L7 — covers I1, I2, M1, A1; per-finding application listed in respective Result columns above`). Cleaner for ≥3 affected findings, where inline restatement would clutter the table.

Choose (a) for 2 overlapping findings, (b) for 3+. The trailing summary row is procedural — it is not a finding row and does not consume an `I/M/A` key. Document which shape was used so a future reader can reconcile the verification table against the post-apply confirmation grep at Step 8.

Classify any mismatch between check and finding into one of three tiers:

- **Recommendation-changing mismatch**: the check invalidates the finding's *recommendation* — the approved fix no longer applies, the target text/symbol has moved, or a different fix is now warranted. Re-present the corrected finding to the user and wait for confirmation before applying any edit **for that finding**. Do not silently substitute different changes. If the correction is a pure retraction (no substitute fix is warranted — the finding itself is withdrawn), note the retraction transparently as `retracted: <reason>` in the table and proceed with the remaining approved findings; fresh re-approval is only required when a different fix is being substituted in place of the retracted one.
- **Evidence-refining mismatch**: the check refines the finding's *supporting evidence* but leaves the recommendation unchanged (e.g., a symbol the finding claimed was absent turns out to exist at a different location, and the recommendation already targets the actual location used by the consumer). Note the refinement inline in the Result column of the pre-apply table and proceed.
- **Scope-extending mismatch**: the approved recommendation still applies, but fulfilling it requires a new deliverable, migration, or package-boundary change not discussed at question time. Note the scope extension inline in the Result column and proceed. Additionally, surface the scope extension in the Step 8 summary under a dedicated line so the user sees it in both places. **Pre-declared variant**: when a Step 6 Question's option description explicitly named the scope-extending consequence (e.g., "requires follow-up edit to SPEC-X" or "extends SPEC-Y's public contract"), the user's approval of that option carries scope acknowledgement — the consequence was disclosed, not discovered. The Step 7 verification row should cite the question explicitly (e.g., `scope-extending: pre-declared in Q2`) rather than framing the extension as freshly discovered; the Step 8 dedicated line still lists the extension so the audit trail records both the pre-declaration and the confirmation. The pre-declared variant does not trigger fresh re-approval — it is a confirmation path, not a mismatch that changes the approved recommendation. If the scope extension constitutes a cross-package type migration, also apply the Pre-Process "Emergent migration at Step 7" guidance and run 3.6 cross-package consumer analysis before finalizing edits.

When in doubt, treat the mismatch as recommendation-changing and re-present — it is cheaper to ask than to apply the wrong fix.

## Apply Changes

- Incorporate corrections from the user's plan approval or question responses.
- Preserve existing structure and voice. Change only what was agreed upon.
- When changes are numerous and spread throughout, a full Write is acceptable. Prefer Edit for ≤3 localized changes; prefer full Write when changes span >50% of deliverables or when insertions cause cascading renumbering.
- If inserting new deliverables, renumber all subsequent deliverables and update any intra-spec cross-references to deliverable numbers.
- When removing deliverables, grep the spec for all references to the removed deliverable number (e.g., "D4") and update or remove them. Check: Approach, Verification steps, FOUNDATIONS Alignment table, Out of Scope, Risks & Open Questions, and any cross-deliverable references.
- When materially modifying a deliverable's mechanism, name, or surface area (without changing its number), grep the spec for the deliverable's old key concepts (function names, type names, CLI command names that the modification eliminates) AND scan these sections for restatements that need updating: Problem Statement, Approach, Dependencies, FOUNDATIONS Alignment, Verification, Risks. Cross-section restatements drift silently because the deliverable's number is unchanged — only its content shifted.
- **Risks & Open Questions resolution**: if a finding (typically an Improvement or Addition) resolves an entry in the spec's §Risks & Open Questions section (or whatever open-questions surface the spec uses), update or remove that entry alongside the primary edit. Either delete the entry outright or rewrite it as resolved with a one-line note pointing at the resolving deliverable. A spec with a "still open" risk that the reassessment actually closed produces a misleading audit trail — Rule 6 (No Silent Retcons) at the spec level: closing an open question is a change, and the change should be visible in the §Risks section, not implicit in the deliverable edits.
- **New deliverable vs. amendment**: When a finding introduces substantial new logic (new mechanism, new type, new event surface), consider a new numbered deliverable rather than expanding an existing one. Criteria: (a) distinct implementation site (new file, new module, new package), (b) independently implementable and testable, (c) would make existing deliverable unwieldy if inlined.
- **Late-discovered findings**: If writing reveals minor factual errors not covered by the plan (incorrect symbol names in prose, typos in cross-references, outdated package-version constraints), fix them and note in Step 8 as "Also fixed:" items. If the new finding would constitute a HIGH or CRITICAL Issue, re-present to the user before applying. **Canonical location by discovery phase**: if the late finding is discovered during edit **planning** (before any Write/Edit call — e.g., surfaced while building the Step 7 pre-apply verification table), add it to the pre-apply table keyed `LD-N` (late-discovered, 1-based within this reassessment), then reference that key from Step 8's "Also fixed:" rather than duplicating the content. If discovered during edit **application** or **post-apply verification**, Step 8 "Also fixed:" alone is sufficient — no pre-apply row is required for a finding that surfaced after the pre-apply table was emitted. **Absorption into an approved finding**: when a late finding discovered during edit planning naturally fits within an existing approved finding's recommendation (same edit target, same semantic change, same severity tier), absorb it into that finding's Pre-Apply Verification row(s) and note the absorption inline in the Result column (e.g., `Apply as: <original edit description>; also addresses late-discovered <N-word description>`) rather than keying a new `LD-N` row. Reserve `LD-N` keying for late findings that open an edit target NOT covered by any approved finding. The absorption form preserves audit-trail visibility (the absorbed content still surfaces in the verification table via the Result column annotation) while avoiding spurious row proliferation when a late finding is a natural extension of approved work. When in doubt — especially when the absorption would silently change the severity profile of the hosting finding — prefer explicit `LD-N` keying.
- If the user requests corrections after reviewing, apply them and re-present affected sections.

## Retroactive Branch (classification (d))

If Step 3 validation concluded all deliverables already landed, Step 7's output shape is **not** deliverable refinement. Instead:

1. Flip the spec's **Status** to `✅ COMPLETED`.
2. Populate the **Outcome** section with:
   - Completion date (absolute, not relative).
   - Landed changes (cite file paths + line numbers).
   - Delivering commit(s) or sibling spec(s) — git log or `specs/IMPLEMENTATION-ORDER.md` provides these.
   - Deviations from original plan (especially work absorbed by downstream work).
   - Verification commands **re-run at reassessment time**, with their pass/fail status. Do not copy verification from memory — rerun each command now to catch post-delivery regressions.
3. Mark historical **Motivating Evidence** / **Problem Statement** as such — add a short parenthetical noting the drift described was resolved by the landed implementation, so a future reader doesn't treat a stale condition as a live one.
4. Cross-reference any downstream specs or skills that extended or absorbed original-spec scope.
5. Do **not** apply structural refinements to deliverables that already shipped — the spec file is now a historical record, and editing deliverable sections to match current code would confuse the causal narrative.

After Step 7 completes for (d), Step 8 drives archival + `specs/IMPLEMENTATION-ORDER.md` reconciliation rather than suggesting ticket decomposition (see main SKILL.md Step 8 retroactive path).

## Post-Apply Confirmation

Grep the updated spec for:

1. Eliminated stale references — should return zero matches.
2. Corrected references — should return expected matches.
3. File path references in newly added deliverables — should resolve to existing files.
4. If the spec contains a Verification section that lists specific commands, ensure the command text resolves (e.g., `world-index build animalia` must reference a CLI entry that exists at `tools/world-index/src/cli.ts`).

For classification (d) retroactive, additionally:

5. Grep every concrete artifact named in the spec's Motivating Evidence / Problem Statement (symbols, file paths, thresholds, type names) and prove its absence or corrected form in the current codebase.

Record results for Step 8.
