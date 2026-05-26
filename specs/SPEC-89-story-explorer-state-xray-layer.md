# SPEC-89 — Story Explorer State X-Ray Layer

**Status**: draft
**Depends on**: SPEC-87 (backend foundation; archived at `archive/specs/SPEC-87-story-explorer-backend-foundation.md`), SPEC-88 (frontend foundation & page reading surface; archived at `archive/specs/SPEC-88-story-explorer-frontend-foundation.md`)
**Related**: SPEC-90 (branch map & search), `specs/IMPLEMENTATION-ORDER.md`
**Companion triage**: `docs/triage/2026-05-25-website-proposal-triage.md`

---

## 1. Purpose

Render the **State X-Ray** — the author/debug surface beneath the prose-and-choices reading area — as a deterministic, grouped, expandable view of all causal records relevant to the current page. The X-Ray turns the Worldloom causal machinery (entities, status, beliefs, facts, events, plans, emotions, relationships, obligations, consequences, threads, clocks, secrets, questions, locations, objects, diegetic artifacts, storylets, branches, choices, validation) into a legible per-page panel without dumping YAML first.

The X-Ray is opt-in by tab structure but always present on the reading page. It answers two distinct questions:

- **Current State**: "What is true and active right now?" (from `PG.state_snapshot.active_records`)
- **What Changed Here**: "What caused this page to exist?" (from `PG.input.resolved_event_id → SE`)

Plus **Plan & Prose** (rendering plan + receipt boundaries) and **Validation & Integrity** (validation traces, hash checks, broken refs).

## 2. Scope

### In scope

- Record group taxonomy (8 human groups, per proposal §7).
- Four X-Ray tabs: Current State (default), What Changed Here, Plan & Prose, Validation & Integrity.
- Compact and expanded record cards per record class with deterministic field-based summaries.
- Raw YAML escape hatch (per-card disclosure).
- Linked-record navigation (active / side-peek / broken-reference handling).
- Sticky right-rail summary on desktop (active record counts by group, "what changed" delta counts, x-ray group ToC).
- Mobile inline summary bar above x-ray groups.
- Provenance display ("created by SE-N", "modified by SE-M, SE-K", "evidence records") consuming SPEC-87's `/provenance/:recordId` route.
- Hidden / secret / author-only chips on records that carry visibility flags (no spoiler masking — author-x-ray stance per proposal §7 and Named Assumption D).
- Hybrid-record rendering for STCHAR (frontmatter blocks + body sections via SPEC-87's record route with `section_path`-style projection).
- SLB / SAU / SP / RSP rendering from direct file reads (per SPEC-87 §7; not currently parsed at indexer parser layer).

### Out of scope

- Branch map drawer (SPEC-90).
- Page search / record search (SPEC-90).
- "Why is this active?" explainer / state-delta visualizations (Future Enhancements).
- Record diff across supersession chains (Future Enhancements).
- Schema-aware validation explanations beyond the deterministic pass/fail strings (Future Enhancements).
- Reader-safe spoiler mode (Future Enhancements; out per Named Assumption D).

## 3. Record group taxonomy

The 8 groups (proposal §7) — human-meaningful, not raw folder names:

| Group | Classes |
|---|---|
| Cast & Status | `STENT`, `STCHAR`, `STSTAT` |
| Scene & Affordances | `STLOC`, `STOBJ`, `DA`, visible affordances (from `PG.state_snapshot.visible_affordances`) |
| Knowledge & Truth | `BEL`, `SF`, `STSEC`, `STQ` |
| Plans & Emotion | `STPLAN`, `STEMO`, `STINT` |
| Relationships & Debts | `SREL`, `OBL` |
| Pressure & Open Loops | `CNSQ`, `THR`, `CLK`, `SLT` (when relevant to this page) |
| Event Delta | `SE`, state delta, record introductions, state relations, promotion claims |
| Validation & Integrity | PG validation trace, prose receipt, hash status, missing/stale index, broken refs |

Group headers render counts and important chips: e.g. `Knowledge & Truth · 8 active · 2 hidden · 1 low-confidence`.

## 4. Tabs

### 4.1 Current State (default)

Source: `PG.state_snapshot.active_records[]` from SPEC-87's `PageDetail.currentStateRecordIds`.

For each active record ID, the frontend issues `GET /api/.../records/:recordId` to fetch the parsed body, then assembles a `RecordCard` view-model and renders it in its group.

Recommended group ordering (proposal §7):

1. Cast & Status
2. Scene & Affordances
3. Knowledge & Truth
4. Plans & Emotion
5. Relationships & Debts
6. Pressure & Open Loops
7. Validation & Integrity (Event Delta lives in tab 4.2)

Groups are collapsible. When collapsed, the header still shows deterministic summary chips (count + important state).

### 4.2 What Changed Here

Source: `PG.input.resolved_event_id` → fetch SE record via SPEC-87's record route.

Displays:

- selected event (SE-N)
- actor → targets
- turn driver
- outcome route
- selected storylet (SLT-N if `commitment.selected_slt_id` present)
- world-logic rationale
- state delta:
  - **Created** (state_delta.create[]) — list of newly-created records with links
  - **Superseded** (state_delta.supersede[]) — list of pre→post supersession pairs with links
  - **Closed** (state_delta.close[]) — list of closed records with links
- record introductions
- creation evidence (back-link to the SE that introduced the record's preconditions)
- state relations
- non-propagation facts
- promotion claims (with link to story-promotion record if present)

This must be visually distinct from Current State. Current State answers "What is true now?"; What Changed Here answers "What caused this page?".

### 4.3 Plan & Prose

Surfaces:

- Page plan body from `pages-prose-plans/PG-<n>.md` (rendered as markdown, sanitized) — labeled clearly as "Page Plan (rendering instructions, not reader prose)".
- Plan hash present / missing — advisory chip (per proposal §6 and the prose-attach contract: missing plan hash is advisory).
- Prose receipt summary from `pages-prose-receipts/PG-<n>.yaml`:
  - Receipt verdict (`accept` / `reject` / `revise` etc. — whatever the receipt records)
  - State hash status (match / mismatch / not-checked) — verdict-driving per prose-attach contract
  - Per-check results from the prose-attach skill's nine validation gates: hash integrity, engine-jargon leak, mystery resolution, required event rendering, choice visibility, status consistency, invented structural fact, canon authority, character authority leak, STCHAR fidelity
- Boundaries banner: "Plan, prose, and receipt are distinct artifacts. PG is the authoritative page snapshot."

Plan body is NEVER rendered as prose anywhere else in the UI; the Plan & Prose tab is the only place the plan appears.

### 4.4 Validation & Integrity

Surfaces:

- PG `validation_trace` (full structured trace)
- Prose receipt presence (present / missing / unreadable)
- State hash status (match / mismatch / not-checked)
- Plan hash status (match / mismatch / not-checked)
- Stale / missing index state (passed through from envelope)
- Malformed YAML warnings (any record that failed to parse)
- Skipped-records log summary if available
- Broken references (record IDs cited by current page's active records that resolve to missing files)

This tab is the integrity audit surface; it never auto-fixes anything (per SPEC-87 §6 read-only fencing).

## 5. Record cards

### 5.1 Compact card

Default state when a group is expanded but the card has not been clicked. Per proposal §7:

- record ID
- class chip
- human title / claim / objective / status (per deterministic summary rule for this class)
- holder / actor / participants (per class)
- urgency / salience / confidence / visibility chips (when present on the class)
- created-at-page chip (provenance)
- supersedes / superseded-by chip (when present)
- related-record count

### 5.2 Expanded card

Triggered by clicking the compact card. Shows:

- all deterministic fields grouped by human labels
- related records as clickable chips (navigate per §6 below)
- provenance trail (rendered from SPEC-87's `/provenance/:recordId` route):
  - "Created by SE-N at PG-M"
  - "Modified by SE-X (PG-Y), SE-Z (PG-W)"
  - "Evidence records: [chips]"
- "View raw record" button → disclosure panel with source path, content hash, raw YAML/markdown body, copy button. NEVER editable.

## 6. Linked-record navigation

When a record card contains a chip linking to another record:

- **If linked record is active on current page** (present in `PG.state_snapshot.active_records`): scroll to its card in the X-Ray.
- **If linked record exists but is not active on current page**: open a right-side peek panel with the record's compact card and a "not active on this page" chip.
- **If linked record is broken** (cited ID does not resolve to any file): render as an `Unresolved reference` chip with the cited ID; the same broken reference is listed under Validation & Integrity.

Special link semantics:

- A PG link navigates to that page (per SPEC-88 routing).
- An SE link opens the SE in the What Changed Here tab (scrolling to it if currently rendered, otherwise opening that tab).
- A CHC link highlights the choice card in the reading view (above the X-Ray) and, when SPEC-90 lands, focuses the corresponding branch-map edge.

## 7. Deterministic summary rules (per class)

Per proposal §8 — the canonical table. Each row is the compact-card primary-line spec for that class. SPEC-87 owns the data path (parsed body → summary inputs); SPEC-89 owns the field rendering.

| Class | Compact summary |
|---|---|
| STENT | id · entity label/name if present · world binding `world_ent_id` · bound STCHAR · active/status tags · created-at page |
| STCHAR | id · character name/title from frontmatter · bound STENT IDs · source character if any · supersession status · regeneration reason if present |
| STSTAT | id · entity · status label/value · severity/visibility if present · created-at page · supersedes |
| BEL | id · holder · claim · belief mode · truth relation · confidence · visibility · source event/basis · opens consequences |
| SF | id · fact/claim/title · truth/canon derivation · derived-from CF/SF refs · scope/visibility · created-at page |
| SE | id · event kind · actor → targets · outcome route · selected SLT · state delta counts · world-logic rationale preview |
| CHC | id · surface label · player-visible intent · created-at page · pressure chips · grounded-in record count · child outcome count |
| OBL | id · owed_by → owed_to · obligation text/objective · status · urgency/due condition · dependent facts |
| CNSQ | id · consequence statement · status · severity/urgency · derived-from · linked thread/clock if present |
| THR | id · thread title/name · status · active pressure · obligations count · derived-from |
| SREL | id · participants · relationship kind/label · polarity/intensity/status · derived-from |
| STINT | id · holder · intention/objective · status · urgency · supersedes |
| STLOC | id · location name · current scene role · access/affordance notes · created-at page |
| STOBJ | id · object name · holder/location · affordance/use · status · created-at page |
| DA | id · title/name · artifact type · holder/location/author if present · maturity/access · source records |
| CLK | id · clock name · current value/threshold · driver · status · linked records · last tick event |
| STSEC | id · secret label/truth anchor · holders · visibility/revealed status · clue carrier count · protected mystery refs |
| STQ | id · question text · status · source records · payoff-of/answer records · urgency if present |
| STPLAN | id · holder · objective/current step · root intention · status · blockers · success condition · supersedes |
| STEMO | id · holder · emotion/appraisal · intensity if present · orientation/toward records · trigger event · supersedes |
| BR | id · label · parent branch · forked/root page · created-at page · current/leaf page if derivable |
| SLT | id · move family · scope visibility · branch scope · urgency/salience · compatible turn drivers · precondition/effect counts |

Field fallback (per SPEC-87 §8):

1. explicit `title` / `label` / `name` / `objective` / `claim`
2. first meaningful string field for that class
3. record ID + class
4. `"Untitled <CLASS> record"`

**Never fabricate** text not present in the record. This is a hard rule consistent with the no-LLM-summaries v1 decision (Named Assumption per IMPLEMENTATION-ORDER.md).

## 8. Sticky summary rail (desktop only)

On viewports wider than ~1200px, render a right rail containing:

- current page chip (PG-N · BR-N)
- prose/receipt status icons
- active record counts by group
- "What changed" counts: `Created N · Superseded M · Closed K`
- mini table of contents for x-ray groups with anchor scroll

The rail must not compete with the prose for visual weight. It collapses into an inline summary bar above the X-Ray on narrower viewports.

## 9. Mobile behavior

Per SPEC-88 §8 mobile layout, the X-Ray sits as section 5 in the single-column flow:

1. header
2. prose
3. choices
4. compact state summary (the inline summary bar)
5. x-ray groups

Record cards use the disclosure primitive from SPEC-88. Group headers are tappable and respect the disclosure ARIA contract. No horizontal scrolling except inside raw YAML code blocks.

## 10. Performance for large stories

Per proposal §10:

- Record-card body fetches are lazy: a group is rendered with compact cards first; clicking an expand triggers the body fetch.
- Active-record body fetches are batched (e.g. up to 25 per request) via `GET /api/.../records?ids=...`.
- Huge groups (≥ threshold, e.g. 50 active records) virtualize the list.
- Deterministic summaries are memoized in-memory per session.
- The X-Ray does NOT re-parse YAML on every navigation; SPEC-87's record route serves parsed bodies.

## 11. Accessibility

Inherits SPEC-88 §8 baseline. Specific to X-Ray:

- Tab list (Current State / What Changed Here / Plan & Prose / Validation & Integrity) uses the WAI-ARIA tabs pattern: `role="tablist"`, `role="tab"`, `aria-selected`, arrow-key navigation between tabs.
- Group headers are buttons inside `<h3>` semantic headings (proposal §11: accordion headers as buttons inside headings).
- Each card disclosure follows the disclosure pattern: button controlling hidden/visible content, Enter/Space toggles, `aria-expanded` reflects state.
- Raw YAML disclosure: same pattern; code block has `<pre><code>` with language label.
- "Hidden / secret / author-only" chips have accessible labels (not color-only signal).
- Reduced motion respected on every expand/collapse animation.

## 12. Hybrid-record rendering

For STCHAR records (which are hybrid frontmatter+body markdown per FOUNDATIONS §Story Bundles §6.1):

- SPEC-87's `/records/:recordId` route returns parsed frontmatter (as object) + body sections (as map of section header → markdown body).
- The compact card renders the frontmatter summary (name, bound STENT, source CHAR, supersession status, regeneration reason).
- The expanded card adds body sections (collapsible per-section).
- Raw view shows the full markdown source.

The same pattern applies to DA hybrid records and to SAU / SP / RSP records when they appear in scope (per SPEC-87 §7, these come from direct file reads in v1).

## 13. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
|---|---|---|
| §Story Bundles §4a — Plan-Authority Boundary (PG is page authority; rendered prose is renderable receipt; plan is engine artifact) | aligns @ tab structure | Plan & Prose tab labels the plan as "rendering instructions, not reader prose"; the boundary banner makes the distinction explicit; the plan body never appears in the reading-surface prose panel (per SPEC-88). |
| §Story Bundles §6.1 — Story-Local Character Authority (STCHAR per-bundle; CHAR is world-agnostic) | aligns @ record rendering | STCHAR cards render the story-local authority; CHAR provenance appears as a frontmatter field on the STCHAR card, not as a substitute identity. |
| §Story Bundles §5 — Validation Rules at Story Scope (per-class load-bearing schemas, including SLT `mystery_policy`, SF `authority`, OBL/CNSQ `urgency`, CHC `grounded_in`) | aligns @ card-field surfacing | Each per-class summary rule (§7) names the load-bearing fields the schema actually requires; the cards surface them rather than hiding them. |
| §Story Bundles §6b — Information / Observer Firewall | N/A @ this surface | Firewall enforcement happens at story-pipeline authoring time (SLT selection, CHC emission, page-plan commit). The X-Ray is an explicit author/debug surface (proposal §4 / §7); hidden state is shown with visibility chips per Named Assumption D, not masked. Defensive disclosure: an adjacent reader-facing tool might mask; this one deliberately doesn't. |
| §Story Bundles §5b — Schema-Minimalism (every field load-bearing) | aligns @ field rendering | The compact-card field selection per class mirrors the load-bearing fields documented in the shared story state contract; no decorative-only fields render in compact view. |
| §Story Bundles §9 — Prose Length Discipline | N/A @ X-Ray | The X-Ray renders records, not prose; word-count discipline does not apply. |
| §Tooling Recommendation — agents never operate on prose alone | N/A @ this surface | The X-Ray is a human-facing surface, not an LLM agent surface. |
