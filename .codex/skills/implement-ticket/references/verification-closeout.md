# Verification And Closeout

Run the narrowest honest proof first, then broaden only as needed.

## Verification surfaces

Choose the surface that proves the invariant:

- `codebase grep-proof`: path, symbol, reference, or removal confirmation
- `schema validation`: YAML/frontmatter/template field structure
- `skill dry-run`: invoke the skill with representative input and inspect the deliverable
- `targeted tool command`: run the relevant CLI/script/validator command
- `manual review`: prose quality, gate wording, or generated artifact inspection
- `FOUNDATIONS alignment check`: cite the exact principle/rule/schema section being preserved

For cross-skill or cross-artifact tickets, map each distinct invariant to a distinct proof surface.

## Verification discipline

- Verify exact command shapes before recording them in the ticket.
- For `tool or script implementation` tickets, dry-run the exact package-local command form (`cd` into the package, repo-local binary path, real config path) before trusting drafted `Test Plan` commands.
- If a broader command fails, decide whether the failure is current-ticket fallout or unrelated pre-existing state.
- After the final edit, rerun the narrowest affected proof.
- Do not overclaim broad verification when only a narrower surface was honestly proved.

## Ticket closeout

Before finishing, re-read the ticket and make it truthful:

- `Status` reflects reality
- `Assumption Reassessment` captures the final boundary
- `Files to Touch` matches the landed diff
- `Acceptance Criteria` and `Test Plan` match the proof you actually ran
- `## Outcome` states what changed
- `## Verification Result` lists commands/reviews actually completed
- `## Deviations` is present when reassessment or verification changed the intended shape

## Archival

Archive only when the user asked for it.

When archiving:

- follow `docs/archival-workflow.md`
- make the ticket truthful before moving it
- update any active specs, docs, or roadmap files that still reference the old active ticket path
