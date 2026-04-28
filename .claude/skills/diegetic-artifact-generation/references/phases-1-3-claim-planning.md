# Phases 1-3: Claim Planning

Build the Author's epistemic horizon (Phase 1), apply the in-world genre conventions of the artifact type (Phase 2), then build and tag the artifact's claim list (Phase 3). These three phases produce the claim substrate that Phases 4-6 will compose into text.

## Phase 1: Epistemic Horizon

For the bound Author at the bound date/place, determine what they can:
- **know directly** (witnessed, experienced, handled — cross-reference SEC-TML events within lifetime; SEC-GEO places within mobility; SEC-ELF practices within class/region/profession)
- **infer plausibly** (from training, literacy, access)
- **repeat secondhand** (rumor, sermon, merchant gossip, bardic transmission)
- **get wrong** (folk theories; inherited propaganda; professional blind spots — cross-reference SEC-INS religious/ideological material, SEC-ELF common beliefs)
- **intentionally conceal** (given `political_dependency`, `desired_relation_to_truth`, `taboo_censorship_conditions`)
- **never know** (cross-reference M-NNNN `what is unknown` blocks; OQ-NNNN items; CAU-N-style restricted vocabulary CFs)

### Dossier-transfer (when `character_path` is provided)

When Phase 0b lifted the Author from a character dossier, Phase 1's epistemic_horizon fields inherit from the dossier's Epistemic Position (and adjacent) sections, filtered by the artifact's date, subject, audience, and genre. This is the Phase 1 analog of Phase 0b's 15-field author_profile transfer table.

| Dossier section | Artifact `epistemic_horizon` field | Genre filter |
|---|---|---|
| Epistemic Position §Known firsthand | `direct_knowledge` (candidate pool) | filter to items within artifact's date-and-subject scope; drop items outside artifact-date (per Phase 0b §Back-projection math); drop items outside the artifact's specific subject matter |
| Epistemic Position §Known by rumor | `secondhand_knowledge` (candidate pool) | filter to items the audience would expect or accept as appropriate-to-report; drop items below institutional-relevance threshold |
| Epistemic Position §Wrongly believes | `wrongly_believed` (candidate pool) | strip folkloric or superstitious content from institutional / procedural / legal / scholarly genres (where genre convention excludes folk reporting); retain for folk / vernacular / sermonic / confessional genres. Genre-filtered items are not lost — they remain in the dossier for future artifacts in compatible genres |
| Epistemic Position §Cannot know | `impossible_knowledge` (mandatory — strictly dossier-aligned as a minimum) | no filter — dossier-impossible is artifact-impossible at minimum; add new artifact-date-specific impossibilities (e.g., future-events at retrospective-artifact dates) |
| Voice and Perception §Vocabulary she lacks | `impossible_knowledge` (supplementary — restricted-vocabulary items) | extends the dossier-impossible items with CAU-3-restricted-speech and guild-internal vocabulary items |
| Institutional Embedding §Law / Employer / Taboo | `concealable` (candidate pool) | filter by artifact audience + `political_dependency` (what would the author prudently not disclose to this audience) |
| Goals and Pressures §Private shame; Contradictions and Tensions §Central contradiction | `concealable` (candidate pool — private-register items) | retain only when genre and audience permit private-register content (letters to intimates may include; institutional reports strip) |

Record the filter decisions in frontmatter `notes` under a "Dossier-transfer filter" line so the HARD-GATE deliverable exposes them for user review. Filtered-out items may be rejoined in a later artifact of a different genre without dossier revision.

### Tagging each candidate claim

Each candidate claim for the artifact body must be tagged with ONE of these six `source` statuses:
- `witnessed`
- `learned_from_authority`
- `inherited_tradition`
- `common_rumor`
- `contested_scholarship`
- `impossible_for_narrator_to_verify`

### Phase 1 epistemic-horizon to Phase 3 `source` tag mapping

The six Phase 1 epistemic-horizon categories (how the author comes to know) do NOT map 1:1 onto the six Phase 3 `source` tags (the tagged knowledge provenance at claim level). Two categories decompose differently:

| Phase 1 horizon category | Phase 3 `source` tag it maps to |
|---|---|
| know directly (witnessed / experienced / handled) | `witnessed` |
| infer plausibly (from institutional training or literacy) | `learned_from_authority` |
| infer plausibly (from professional-stratum / class / generational folkways) | `inherited_tradition` |
| infer plausibly (from witnessed aggregate) | `witnessed` — the author's generalization-from-aggregate lives in the claim's `narrator_belief` and `canon_status` fields, NOT in `source`; the underlying experience is what grounds the tag |
| repeat secondhand (tavern / circuit / bardic rumor / merchant gossip) | `common_rumor` |
| repeat secondhand (scholarly dispute / contested chronicle / institutional-historian disagreement) | `contested_scholarship` |
| get wrong | `source` carries whatever tag grounds the mistaken belief (usually `inherited_tradition` or `common_rumor`); the wrongness lives in `canon_status: canonically_false / partially_true / contested` + `narrator_belief: true`. NOT a `source` tag in itself |
| intentionally conceal | NOT a `source` tag — recorded in frontmatter `epistemic_horizon.concealable`; concealed items do not appear in `claim_map` unless the artifact performs them (in which case `narrator_belief: performed_belief`) |
| never know | `impossible_for_narrator_to_verify` — reserved for claims the author CANNOT warrant at all, typically tagged `canon_status: mystery_adjacent` + `narrator_belief: uncertain` |

**Rule**: If you find yourself wanting to invent a seventh `source` tag (e.g., "inferred_from_experience"), decompose into an existing tag. A generalization from witnessed aggregate is still `witnessed` at source; the generalization-step lives in `narrator_belief` and `canon_status`. A stratum-folkway claim is `inherited_tradition` even when the author has also witnessed instances of it. Phase 8 Test 4 literally enforces the six-tag taxonomy — an invented tag fails it.

**Rule (from proposal)**: This phase prevents lore-dumping. A narrator who "knows" everything the author-Claude knows is an omniscient voice in costume.

**FOUNDATIONS cross-ref**: Rule 7 (Preserve Mystery Deliberately) — Phase 1's `never_know` list is the first Rule 7 enforcement point; Phase 7b is the audit gate.

## Phase 2: Genre Convention Pass

Apply the in-world conventions of the bound `artifact_type`. The proposal enumerates conventions for chronicle, sermon, travelogue, herbal, myth. For any artifact_type not in the proposal's enumeration, derive conventions from the world's own tradition:
- Which SEC-INS bodies produce this artifact type (temple, guild, court, school, itinerant performer, prison, private correspondence)?
- What SEC-ELF practices establish its conventional form (length, register, rhetorical moves, permitted topics, material support)?
- What tonal register does `WORLD_KERNEL.md` permit for this institutional producer (grim / comic / tragic / lyrical / pulp / mythic)?

Record conventions in frontmatter `genre_conventions` as a list of the specific moves this artifact will honor or deliberately break. A deliberate break must be justified in `notes` by the author's motive.

**Rule**: Conventions are constraints, not suggestions. An artifact that ignores its genre's conventional moves reads as anachronistic pastiche. An artifact that slavishly honors them reads as genre exercise. The craft is calibrated deviation.

**FOUNDATIONS cross-ref**: World Kernel §Tonal Contract.

## Phase 3: Claim Selection

Build the artifact's claim list. For each claim, record:

| Field | Values |
|---|---|
| `claim` | the assertion, in the author's voice (not paraphrased neutrally) |
| `canon_status` | `canonically_true` \| `canonically_false` \| `partially_true` \| `contested` \| `mystery_adjacent` \| `prohibited_for_this_artifact` |
| `narrator_belief` | `true` \| `false` \| `uncertain` \| `performed_belief` |
| `source` | one of the six Phase 1 tags |
| `contradiction_risk` | `none` \| `soft` \| `hard` |
| `mode` | `direct` \| `implied` \| `symbolic` |
| `adaptive_behavior_preserved_under_wrong_ontology` | optional boolean, default false. When true, the narrator's explanation diverges from canon while the prescribed behavior implied by the claim is correct survival / social / ritual behavior under canon truth. Pattern #80: the wrong explanation is the distortion, and the right behavior is what the distortion preserves. |
| `cf_id` | singular CF-id string; required when `canon_status: canonically_true`; must resolve to a `_source/canon/CF-NNNN.yaml` record (verifiable via `mcp__worldloom__get_record`); null otherwise |
| `mr_id` | singular MR-id string; required when `canon_status: mystery_adjacent`; must resolve to a `_source/mystery-reserve/M-NNNN.yaml` record (verifiable via `mcp__worldloom__get_record`); null otherwise |
| `repair_trace` | null by default; populated by Phase 7f with `{repair_type, reason}` when the claim is retagged, rescoped, moved, or removed |

Every claim with `canon_status: canonically_true` must populate `cf_id` with a CF-id resolvable via `mcp__worldloom__get_record`. Every claim with `canon_status: mystery_adjacent` must populate `mr_id` with an MR-id resolvable via `mcp__worldloom__get_record`. Every claim repaired at Phase 7f must record the repair under `repair_trace`. Every claim tagged `prohibited_for_this_artifact` is **removed from the artifact body** — it stays in the record as an audit trail of what was considered and rejected.

The `adaptive_behavior_preserved_under_wrong_ontology` tag is not a canon-promotion signal. It is contested-canon metadata on a claim whose author is wrong about mechanism but right about the behavior the audience should perform. Examples: a folk-myth claim "the Rot is the breath of the dead, mask yourself" where canon truth is "the Rot is planetary medicine, and masking is still correct because spores are toxic to humans"; a cult-tract claim "blood healing is sacrament, attend ministration only at consecrated hours" where canon truth is "the blood is contaminated, and the consecrated-hours schedule slows infection-vector saturation."

**Rule (from proposal Phase 3)**: The `truth_status` taxonomy is the firewall against Rule 7 failures by commission. A claim that would resolve a mystery must be tagged `prohibited_for_this_artifact` here, not caught at Phase 7b.

**FOUNDATIONS cross-refs**: Canon Layers (each claim's `canon_status` maps to a layer); Canon Fact Record Schema (CF references must be real); Rule 7 (prohibited claims are pre-filtered, not post-filtered).
