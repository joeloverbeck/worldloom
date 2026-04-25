# Validator And Schema Migration Checks

Use this reference for tickets that change validators, JSON Schemas, hybrid frontmatter parsing, validator registries, grandfathering/waiver matchers, or live-corpus validator baselines.

## Reassessment

- Identify every live entrypoint that materializes the validated record shape: direct file-input validation, DB-row reconstruction helpers, CLI helpers, pre-apply overlays, registry/list surfaces, and package exports. Do not stop after the first parser call.
- For hybrid frontmatter records, explicitly decide the behavior for missing frontmatter. If the record class is in scope and required fields should be enforced, missing frontmatter should produce a structured schema failure, not a silent skip. If skipping is intentional, record why the file is outside the validator's authority.
- When renaming a schema, validator, code, message, enum value, registry name, or persisted verdict surface, search same-seam tests, fixtures, README/docs, specs, active sibling tickets, and grandfathering/waiver policy files for the old spelling before coding.
- If the ticket changes validator `code`, `message`, `validator`, file path, or node-id formatting, inspect exact-match grandfathering/waiver rows. Update same-seam rows to preserve the intended disposition or record that they are intentionally left unmatched because a follow-up owns the baseline change.
- Before deleting validator source or tests, check whether compiled outputs such as `dist/` may still be picked up by the package test command. Use the package clean script when available before the final proof, then classify the regenerated ignored output.
- For live-corpus baselines, record both pre-change and post-change counts when the ticket changes emitted verdict shape or matching behavior. A non-zero post-change corpus result can be the correct acceptance state when a later content or migration ticket owns cleanup.

## Verification

- Add a narrow unit test for the new valid shape and a rejection-path test for the retired or legacy shape. For hybrid frontmatter migrations, include an absent-frontmatter fixture if legacy files exist.
- Prove the old parser/helper/validator symbol is gone with a negative grep or equivalent symbol check when the ticket claims removal.
- Run the package's build/test lane from the package root after cleaning stale compiled output if files were renamed or deleted.
- If a live-corpus command is part of acceptance, capture the post-change summary and the key targeted counts, including retired-validator zero-count checks and renamed-code counts.
- For shared producer vocabularies or schemas consumed through a local `file:` or symlinked package, rebuild the producer and verify the consumer-resolved artifact before trusting consumer proof.

## Closeout

- Update the active ticket's `Files to Touch`, `Acceptance Criteria`, `Test Plan`, `Outcome`, and `Verification Result` to match any changed baseline, registry count, validator count, or intentional non-zero command exit.
- Label old failure evidence as historical intake evidence when the validator no longer emits the old code or message.
- Record exact grandfathering/waiver matcher changes separately from content cleanup so the ticket does not imply canon/source normalization happened when only the matcher surface changed.
- Name any remaining visible live-corpus failures and the ticket or spec that owns them.
