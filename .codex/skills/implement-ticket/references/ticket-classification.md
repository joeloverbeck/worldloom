# Ticket Classification

Use one primary classification during intake.

## docs-only / contract-truthing

Use when the ticket mainly corrects specs, docs, ticket text, references, or workflow wording.

Check:

- exact path and section references
- whether the claimed contract already matches live behavior
- whether acceptance criteria should be grep/manual-review based rather than runtime/tool based

## skill rewrite or skill-local behavior

Use when the ticket changes `.claude/skills/<slug>/`.

Check:

- trigger description and arguments
- required reads and world-state prerequisites
- HARD-GATE semantics, if present
- references/templates/examples used by the skill
- sibling-skill interop named in docs or specs

## tool or script implementation

Use when the ticket changes `tools/` code, hook scripts, validators, or supporting scripts.

Check:

- exact package/script path ownership
- command names and CLI examples
- config/schema fallout
- whether verification should include a real command run

## cross-skill or cross-artifact contract

Use when a ticket changes a shared template, schema, doc contract, or handoff between tools and skills.

Check:

- producers
- consumers
- doc references
- whether the change is additive-only or breaking

Map each invariant to its own verification layer in the ticket.

## schema or template extension

Use when a ticket changes:

- Canon Fact Record shape
- Change Log Entry shape
- proposal card shape
- character dossier shape
- diegetic artifact shape
- ticket/spec template fields

Check whether downstream consumers need updates or whether the change is truly additive-only.

## archive / rejection / no-op validation

Use when reassessment shows the work already landed, the premise is false, or the ticket should be archived without new implementation.

Check:

- whether the ticket's claimed gap still exists
- whether closeout should be `COMPLETED`, `REJECTED`, `DEFERRED`, or `NOT IMPLEMENTED`
- whether archival was explicitly requested
