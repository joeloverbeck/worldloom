# Writing the Updated Spec (Step 7)

After all findings are resolved and approved:

## Pre-Apply Verification

Run targeted checks to confirm each finding still holds (grep confirming symbol presence/absence, count validation, path-exists, file-read of the target line). Emit the verification table in chat before any Write/Edit call — a vague "I checked the findings" is not sufficient.

Classify any mismatch between check and finding into one of three tiers:

- **Recommendation-changing mismatch**: the check invalidates the finding's *recommendation* — the approved fix no longer applies, the target text/symbol has moved, or a different fix is now warranted. Re-present the corrected finding to the user and wait for confirmation before applying any edit **for that finding**. Do not silently substitute different changes. If the correction is a pure retraction (no substitute fix is warranted — the finding itself is withdrawn), note the retraction transparently as `retracted: <reason>` in the table and proceed with the remaining approved findings; fresh re-approval is only required when a different fix is being substituted in place of the retracted one.
- **Evidence-refining mismatch**: the check refines the finding's *supporting evidence* but leaves the recommendation unchanged (e.g., a symbol the finding claimed was absent turns out to exist at a different location, and the recommendation already targets the actual location used by the consumer). Note the refinement inline in the Result column of the pre-apply table and proceed.
- **Scope-extending mismatch**: the approved recommendation still applies, but fulfilling it requires a new deliverable, migration, or package-boundary change not discussed at question time. Note the scope extension inline in the Result column and proceed. Additionally, surface the scope extension in the Step 8 summary under a dedicated line so the user sees it in both places. If the scope extension constitutes a cross-package type migration, also apply the Pre-Process "Emergent migration at Step 7" guidance and run 3.6 cross-package consumer analysis before finalizing edits.

When in doubt, treat the mismatch as recommendation-changing and re-present — it is cheaper to ask than to apply the wrong fix.

## Apply Changes

- Incorporate corrections from the user's plan approval or question responses.
- Preserve existing structure and voice. Change only what was agreed upon.
- When changes are numerous and spread throughout, a full Write is acceptable. Prefer Edit for ≤3 localized changes; prefer full Write when changes span >50% of deliverables or when insertions cause cascading renumbering.
- If inserting new deliverables, renumber all subsequent deliverables and update any intra-spec cross-references to deliverable numbers.
- When removing deliverables, grep the spec for all references to the removed deliverable number (e.g., "D4") and update or remove them. Check: Approach, Verification steps, FOUNDATIONS Alignment table, Out of Scope, Risks & Open Questions, and any cross-deliverable references.
- When materially modifying a deliverable's mechanism, name, or surface area (without changing its number), grep the spec for the deliverable's old key concepts (function names, type names, CLI command names that the modification eliminates) AND scan these sections for restatements that need updating: Problem Statement, Approach, Dependencies, FOUNDATIONS Alignment, Verification, Risks. Cross-section restatements drift silently because the deliverable's number is unchanged — only its content shifted.
- **New deliverable vs. amendment**: When a finding introduces substantial new logic (new mechanism, new type, new event surface), consider a new numbered deliverable rather than expanding an existing one. Criteria: (a) distinct implementation site (new file, new module, new package), (b) independently implementable and testable, (c) would make existing deliverable unwieldy if inlined.
- **Late-discovered findings**: If writing reveals minor factual errors not covered by the plan (incorrect symbol names in prose, typos in cross-references, outdated package-version constraints), fix them and note in Step 8 as "Also fixed:" items. If the new finding would constitute a HIGH or CRITICAL Issue, re-present to the user before applying.
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
