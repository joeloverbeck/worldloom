# HARD-GATE Discipline

Every canon-mutating or content-generating skill in `.claude/skills/` begins with a `<HARD-GATE>` block. These gates are **absolute under Auto Mode**. Invoking a skill is not approval of its deliverable.

## Execution pattern

1. **Pre-flight check** — verify prerequisites, allocate IDs, load required world state (current Kernel + Invariants + relevant CF records + affected domain files + open contradictions + mystery reserve entries).
2. **Analysis phases** — numbered; each named in the skill.
3. **Validation / Rejection tests** — numbered; each must record PASS with a one-line rationale. A bare "PASS" is treated as FAIL per the skill's own contract.
4. **Present deliverable summary** — to the user, in the conversation, before any write.
5. **Wait for explicit user approval** — before any `Write` or `Edit` to `worlds/<slug>/`.
6. **Write in the skill's prescribed order** — the order encodes partial-failure recovery semantics; see below.
7. **Never `git commit` from inside a skill** — writes land in the working tree; the user reviews the diff and commits.

## Why write order matters

Skills that write multiple files should sequence them so the final file written is the one that "announces" the successful operation to future queries. Example: `canon-addition` writes affected domain files first, then the adjudication record, and appends to `CANON_LEDGER.md` last. If the skill crashes mid-way, the ledger (which future runs consult to detect already-done work) still reflects the pre-operation state, so a re-run can recover cleanly rather than corrupting the ledger with a claim whose downstream patches never landed.

When a skill's phase prescribes an order, follow it exactly. Deviating breaks the recovery model.

## Auto Mode does not relax gates

Auto Mode changes turn-taking cadence and approval batching. It never removes the gate at step 5. If you find yourself thinking "this one is simple enough to skip the gate," you are about to make a mistake.
