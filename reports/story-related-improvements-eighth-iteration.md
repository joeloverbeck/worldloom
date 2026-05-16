# **1. Executive verdict**

**Verdict:** Worldloom’s story architecture is **basically sound**, but the current implementation is **implementation-drifted, test-deficient, and partly fixture-stale**. It is not source-access blocked. The main remaining work is **validators and tests**, with secondary cleanup in **MCP retrieval behavior, schema discovery, capability wording, and archive-reference hygiene**.

The architecture is still the right one: present-causal-state, plan-authoritative, branch-local, Mystery-Reserve-protected, and patch-engine-routed. The repo-backed problems I found are not reasons to redesign the story engine. They are places where the implementation or tests no longer match the current contracts.

Confidence split:

| Area | Confidence |
| ----- | ----- |
| Repo-source confidence | **High** for inspected docs, current skills, validators, MCP, patch-engine, Hook 3, selected tests/fixtures. |
| Implementation confidence | **Medium**. Core mechanisms exist, but several important validators either drift from contract or do less than their names/docs imply. |
| Test confidence | **Low-to-medium**. Some targeted tests exist, but current fixtures encode padded IDs and retired story-schema fields. |
| Runtime/deployed-capability confidence | **Low**. I inspected source, not a running MCP server or rebuilt `dist/` deployment. |

The strongest positive finding: **the docs have converged on the right architecture**. The strongest negative finding: **some current code/tests still encode old assumptions**—especially padded IDs, parent-page choice resolution, and story-local seed handling.

I followed the pasted eighth-iteration audit spec as the task contract.

---

# **2. Repository access and source inventory**

**GitHub repository inspected:** `joeloverbeck/worldloom`, branch `main`.

**Access method:** connected GitHub/code-search and file-viewing integration.

**Repo cloned:** **no**.

**Archive exclusion:** the GitHub search tool did not provide a hard `-path:archive` filter argument, so I manually excluded `archive/` results. Search results under `archive/` were treated as stale/non-authoritative and were not used as current implementation evidence, except to note archive-reference leakage from current docs.

**Search/file-opening strategy:** I searched for all seven story skills and the required implementation terms, then opened current non-archived files for authority docs, validator registration, key validators, schemas, MCP tools, patch-engine schema/order/apply paths, Hook 3, and representative tests/fixtures.

## **Current authority docs inspected**

| Path | Role | Status |
| ----- | ----- | ----- |
| `docs/FOUNDATIONS.md` | Highest authority; story-bundle principles, canonical storage, no act/global-drama-manager, ID format, read/write discipline | Present and inspected. |
| `.claude/skills/_shared-templates/story-state-contract.md` | Authoritative story schemas, lifecycle, predicate DSL, action routing, hard gates, replay, prose receipt | Present and inspected. |
| `docs/CONTEXT-PACKET-CONTRACT.md` | Context packet shape, story-bundle context, persisted summary, targeted retrieval | Present and inspected. |
| `docs/HARD-GATE-DISCIPLINE.md` | Approval tokens, validation/submission discipline, CLI/MCP equivalence, write order | Present and inspected. |
| `docs/MACHINE-FACING-LAYER.md` | Operational composition of index/MCP/patch-engine/validators/hooks/capability currency | Present and inspected. |

## **Seven story-pipeline skills mapped**

| Skill | Current non-archived path | Status |
| ----- | ----- | ----- |
| `branching-story-bootstrap` | `.claude/skills/branching-story-bootstrap/SKILL.md` | Present; search-inspected/mapped. |
| `branching-story-turn-cycle` | `.claude/skills/branching-story-turn-cycle/SKILL.md` | Present; search-inspected/mapped. |
| `branching-story-prose-attach` | `.claude/skills/branching-story-prose-attach/SKILL.md` | Present; search-inspected/mapped. |
| `commitment-block-authoring` | `.claude/skills/commitment-block-authoring/SKILL.md` | Present; search-inspected/mapped. |
| `branching-story-health-audit` | `.claude/skills/branching-story-health-audit/SKILL.md` | Present; search-inspected/mapped. |
| `story-fact-promotion-to-canon` | `.claude/skills/story-fact-promotion-to-canon/SKILL.md` | Present; search-inspected/mapped. |
| `story-promotion-closeout` | `.claude/skills/story-promotion-closeout/SKILL.md` | Present; search-inspected/mapped. |

## **Current implementation/code inspected**

| Area | Files inspected | Status |
| ----- | ----- | ----- |
| Validator registry | `tools/validators/src/public/registry.ts` | Present; inspected. |
| Schema compliance | `tools/validators/src/structural/record-schema-compliance.ts`, `tools/validators/src/structural/utils.ts` | Present; inspected. |
| Choice-set noncollapse | `tools/validators/src/rules/rule_choice_set_noncollapse.ts` | Present; inspected. |
| Expected witness / non-propagation tags | `tools/validators/src/structural/expected-witness-coverage.ts` | Present; inspected; narrower than docs imply. |
| Observer firewall | `tools/validators/src/structural/observer-firewall.ts`, tests | Present; inspected; drift found. |
| Branch isolation | `tools/validators/src/structural/branch-isolation.ts` | Present; inspected; padded-ID drift found. |
| Snapshot replay equality | `tools/validators/src/structural/snapshot-replay-equality.ts` | Present; inspected; strong current support. |
| Story schemas | `story-event.schema.json`, `story-page.schema.json` | Present; inspected. |
| Patch-engine op schema/order/apply | `schema.ts`, `order.ts`, `apply.ts`, `create-story-record.ts` | Present; inspected. |
| MCP tool registration/capability surface | `tool-names.ts`, `server.ts`, `describe-envelope-schema.ts` | Present; inspected. |
| Context packet story-local seed behavior | `get-context-packet.ts`, `assemble.ts`, `local-authority.ts`, story-pipeline tests | Present; inspected; behavior drift found. |
| Mystery Reserve firewall retrieval | `get-firewall-content.ts` | Present; inspected; good support. |
| PG hash tooling | `compute-pg-hashes.ts`, shared hash helper | Present; inspected; good support. |
| ID allocation | `allocate-next-id.ts` | Present; inspected; implementation correct, capability wording stale. |
| Hooks | `tools/hooks/src/hook3-guard-direct-edit.ts` | Present; inspected; direct `_source/*.yaml` write blocking present. |
| Tests/fixtures | `observer-firewall.test.ts`, `get-context-packet.story-pipeline.test.ts`, `story-bundle-fixture.ts` | Present; inspected; fixture drift found. |

## **Areas not fully inspected**

| Area | Classification |
| ----- | ----- |
| All migrations and golden files | Present likely, but **not fully inspected**; conclusions constrained. |
| Generated `dist/` bundles | **Not inspected**; deployed/runtime currency unverifiable from repo source alone. |
| Running MCP server capabilities | **Not invoked live**; source registration inspected, runtime currency unverifiable. |
| Full test suite | Representative tests inspected; not exhaustive. |
| Every individual skill line | Paths mapped and current snippets/search inspected; not every skill file opened line-by-line from GitHub. |

---

# **3. Authority extraction**

Binding rules that matter:

1. `FOUNDATIONS.md` wins. It requires constrained world modeling, explicit canon storage, story/world separation, Mystery Reserve protection, no silent retcons, no act structure, no global drama manager, no word-count quotas, and no prose-as-state.  
2. `story-state-contract.md` is authoritative for story schemas, page lifecycle, action routing, hard gates, replay, branch snapshots, PG hashes, predicate DSL, prose receipts, audit-only SE events, and canon drift handling.  
3. Individual skills must not redefine shared schemas. They should consume the shared contract.  
4. `CONTEXT-PACKET-CONTRACT.md` governs packet shape, `story_bundle_context`, story-local seed discipline, persisted-summary recovery, `get_records`, `get_records_field`, `get_persisted_packet_slice`, `get_firewall_content`, and CH-window retrieval.  
5. `HARD-GATE-DISCIPLINE.md` governs approval, authority-cited PASS rationales, approval tokens, patch-plan validation/submission, and CLI/MCP equivalence.  
6. `MACHINE-FACING-LAYER.md` governs operational composition, retrieval tools, schema discovery, deployed capability checks, and stale validator bundle workarounds.  
7. Current non-archived code/tests must operationalize these docs.  
8. Archived files do not outrank current docs/code. Current docs currently cite archived specs in a few places, which is a hygiene issue, not authority.

---

# **4. Prior-iteration status table**

| Prior issue/proposal | Current status | Evidence | Remaining work | Regression risk |
| ----- | ----- | ----- | ----- | ----- |
| Prose-attach Mystery Reserve checks should use documented fields or `get_firewall_content`, not undocumented M fields | **Fixed / mostly verified** | `get_firewall_content` returns `title`, `status`, `unknowns`, `common_interpretations`, `disallowed_cheap_answers`. | Add prose-attach integration test proving use of this projection. | Low |
| Story-pipeline `seed_nodes` should be world-scope only; story-local IDs reroute through story_slug/context/targeted retrieval | **Partially fixed** | Warning exists, but code passes original seed nodes into assembler. | Actually filter/ignore story-local seed nodes and test layer exclusion. | High |
| Promotion closeout verifies linked CF/CH/PA records via MCP retrieval | **Partially verified** | Skill path present; tool support exists for `get_records` and `get_record`; not fully code-tested here. | Add integration test for fake linked output rejection. | Medium |
| Page-plan hash integrity includes post-write verification before INDEX update | **Partially fixed** | Skill text says it; CLI exists and uses shared helpers. | Add skill-harness or integration test for mismatch blocking INDEX update. | Medium |
| PG authoring uses canonical `compute-pg-hashes` helper | **Fixed** | CLI and shared helper inspected. | Keep `dist/` currency verified. | Low |
| Persisted context-packet / `get_records` summary recovery followed by consuming skills | **Partially fixed** | Contract/tooling present; skills mention recovery; consuming skill tests not fully inspected. | Add consuming-skill recovery tests. | Medium |
| Patch-engine op schemas accept story record classes | **Mostly fixed** | Story ops in operation enum/order and create-story-record implementation. | Fix `create_bel_record` envelope schema discovery. | Medium |
| Audit-only `prose_attach` / `promotion_closeout` SE no-op replay | **Fixed** | Event schema supports audit-only kinds; snapshot replay uses resolved events/state deltas and docs define audit-only no-op. | Add explicit no-op replay tests if not already present. | Low |
| `describe_capabilities` / `describe_envelope_schema` aligned | **Partially fixed** | Tools registered; schema tool exists; stale allocator description and BEL schema gap remain. | Update capability text and BEL op schema. | Medium |
| Validator registration/source/tests aligned | **Partially fixed** | Registry exists, but observer/branch/test drift found. | Repair validators and migrate fixtures. | High |
| Tests/fixtures do not encode retired fields | **Still open** | Story fixture uses padded IDs and retired fields. | Rewrite fixtures or quarantine legacy fixtures. | High |
| Current docs/skills avoid citing `archive/` as current authority | **Still open / hygiene** | FOUNDATIONS cites archive specs in machine-facing layer section. | Replace or clearly mark as historical. | Low-to-medium |

---

# **5. What should not change**

Preserve these decisions:

| Decision | Reason |
| ----- | ----- |
| Present-causal-state discipline | It handles refusal, death, abandonment, deception, and branch-local change without rails. |
| No act structure | Act structure would suppress valid player choices. FOUNDATIONS explicitly rejects it. |
| No global drama manager | Local salience + hard gates is the right selection model; global plot optimization would reintroduce railroading. |
| Plan-authority boundary | PG/page plan is state authority; prose is receipt. This is clean and testable. |
| Prose as receipt, not state | Avoids prose becoming an uncontrolled mutation path. |
| Story-local truth separate from world canon | Prevents branch-local events from contaminating CF/CH world truth. |
| BEL/SF separation | Essential for lies, rumors, public claims, secrets, and contested knowledge. |
| STSTAT-derived `entity_status` | Makes death/incapacity/location replayable and checkable. |
| Mystery Reserve firewall | Protects unknowns from accidental collapse. |
| HARD-GATE / patch-engine discipline | Keeps approval, validation, and writes bound to the same plan. |
| Context packet + targeted retrieval | Better than raw file reads and compatible with budget limits. |
| Schema-minimalism | Stops the story layer from becoming token-bloated metadata soup. |
| Append-only / supersession discipline | Keeps replay and audit trails coherent. |
| Audit-only SE no-op replay | Lets prose/promotion closeout be ledger evidence without changing branch snapshots. |
| Repo-current-source over archived-source discipline | Required to avoid stale plan/spec leakage. |

---

# **6. Red-team support matrix**

| Failure mode | Current support | Mechanism / evidence |
| ----- | ----- | ----- |
| Player kills/incapacitates major actor early | **Handled but undertested** | STSTAT status schema; turn-cycle contract; snapshot replay derives entity status. |
| Player refuses premise | **Handled but undertested** | Action routing supports `world_block`, `accommodate`, `terminal`; silent rejection forbidden. |
| Player abandons current thread | **Handled but undertested** | OBL/CNSQ/THR/STINT urgency and continuation/terminal proof gates. |
| Player lies publicly | **Partially handled** | BEL/SF separation and `liePromotedSilently` registration; witness propagation validator too narrow. |
| Player acts on unavailable information | **Partially handled / currently drifted** | Observer firewall exists but inspects the wrong page-choice link. |
| Player attempts impossible action | **Handled but undertested** | `outcome_route: world_block` requires resolution; schema route table enforces allowed results. |
| Player discovers/protects Mystery Reserve | **Handled but undertested** | `get_firewall_content`, mystery claims, prose receipt, health-audit discipline. |
| Branch-local counterfactual | **Handled but undertested** | `SF.authority` schema/contract and storyFactAuthority registry. |
| Rendered prose invents structural fact | **Judgment-assisted / skill-handled** | Prose receipt schema/checks; no inspected standalone validator. |
| Canon changes after committed pages | **Handled but undertested** | CH-window contract and canon-baseline validators registered. |
| Story-local claim proposed for canon | **Handled** | Promotion skill path and closeout path present; lawful handoff only. |
| Sibling branches contradict | **Partially handled** | Branch isolation validator exists, but genesis padding bug affects legality. |
| Sibling story bundles contradict | **Judgment-only / audit skill** | Cross-story mode in health audit; no inspected deterministic validator. |
| Social consequences propagate through witnesses/rumors/institutions/artifacts | **Partially handled** | BEL schema and non-propagation tags exist; expected-witness validator is only tag-shape. |
| Expected social propagation does not occur | **Partially handled** | Same as above. |
| Branch-local records leak into global author-pool storylets | **Partially handled / drifted** | Branch-isolation validator exists; hard-coded `PG-0001` makes current unpadded genesis handling wrong. |
| Storylet alias binding fails/binds wrong record | **Handled but undertested** | Predicate DSL and observer firewall alias checks; tests exist but padded/stale. |
| Page snapshot replay diverges from SE deltas | **Handled** | `snapshot_replay_equality` new-schema replay. |
| Terminal branch leaves unresolved debts | **Handled but undertested** | Continuation/terminal proof gate in contract; health audit skill. |
| Accepted choices are cosmetic | **Handled but undertested** | Choice consequence integrity in contract; choice-set noncollapse implemented for menus. |
| Non-terminal leaf unactionable | **Skill-handled / undertested** | Health-audit phase and continuation gate. |
| Prose receipt fails but turn-cycle continues from PG state | **Handled** | Plan-authority boundary; prose receipt never mutates PG. |
| Promotion closeout records fake canon outputs | **Handled at skill level / needs tests** | Closeout requires MCP retrieval of linked CF/CH/PA; tool support exists. |
| Context packet omits governing records/story context | **Partially handled** | Packet assembly, persisted summary, story_bundle_context; story-local seed bug remains. |
| Patch schemas permit forbidden / reject required records | **Mostly handled** | Story ops exist; BEL envelope schema discovery gap remains. |
| Persisted context / `get_records` summary not recovered by consumers | **Handled by docs/tools, undertested in skills** | Recovery contract present. |
| Schema discovery or deployed MCP stale | **Known risk / runtime unverifiable** | `describe_capabilities` and stale-bundle docs exist. |
| Validator bundle stale in running MCP server | **Known risk / runtime unverifiable** | CLI workaround documented. |
| Page-plan direct write bytes mismatch `PG.plan.plan_hash` | **Skill-handled / undertested** | CLI exists; skill post-write check claimed. |
| Audit-only SE enters page replay | **Handled** | Audit-only event schema and replay discipline. |
| BEL/SF separation collapses | **Handled but undertested** | BEL/SF schemas, `liePromotedSilently` in registry. |
| STSTAT-derived `entity_status` diverges | **Handled** | `snapshot_replay_equality` derives from active STSTAT. |
| Social non-propagation tags malformed | **Handled** | `expected_witness_coverage` rejects malformed/missing parseable tags. |
| Canon-baseline drift uses only latest CH | **Handled in docs, code partially verified** | Contract requires full CH window; validators registered but not deeply inspected. |
| Current docs/skills/tests cite archive as current authority | **Partially open** | FOUNDATIONS current doc cites archive specs. |
| Generated `dist` stale relative to source | **Runtime/deployed unverifiable** | Docs describe currency check; source not runtime. |

---

# **7. Cross-document and code comparison**

## **Verified implementation drift**

1. `observer_firewall` has a page-choice resolution bug.  
2. `branch_isolation` hard-codes padded root page `PG-0001`.  
3. `get_context_packet` warns that story-local seeds are ignored but still passes them into packet assembly.  
4. `expected_witness_coverage` is only a non-propagation-tag parser, not a full witness/BEL coverage validator.  
5. `describe_envelope_schema` exposes `create_bel_record` with only generic BEL `id` shape.  
6. `allocate_next_id` implementation is unpadded, but MCP server capability description says fresh story-bundle IDs return padded `<CLASS>-0001`.

## **Doc-only drift**

Current FOUNDATIONS still cites archived specs as “See …” design-detail references in the machine-facing layer section. The current authority should point to current docs and source, not archived specs.

## **Test-only / fixture drift**

`observer-firewall.test.ts` and `story-bundle-fixture.ts` use padded IDs and several retired fields.

## **Generated/deployed drift**

Not directly verified. Source docs correctly warn that running MCP may be stale relative to source and that `describe_capabilities`/build/restart are required.

## **Source unavailable / unverifiable risks**

I did not exhaustively inspect migrations/golden files or live runtime `dist/` bundles. Any claim about deployed server behavior is source-level only unless explicitly marked runtime-unverified.

---

# **8. Findings**

## **F1 — P1 — `observer_firewall` validates the wrong selected choice**

**Affected files:** `tools/validators/src/structural/observer-firewall.ts`; `tools/validators/tests/structural/observer-firewall.test.ts`; `tools/validators/src/schemas/story-page.schema.json`.

**Problem:** The validator locates the selected choice by reading `event.parent_page_id`, then looking at that parent page’s `input.choice_id`. Under the current contract, the child page is the page whose `input.resolved_event_id` names the current SE; the child page’s `input.choice_id` is the action source. The parent page’s input is the action that produced the parent.

**Evidence level:** code-level + schema-level + test-level.

**Why it matters:** A player action can be grounded in hidden or private information, and the validator may inspect the previous page’s choice instead of the current one. That is exactly the observer-firewall failure mode.

**Issue type:** validator/code drift; stale test.

**Recommendation:** Resolve the page by `PG.input.resolved_event_id === SE.id`, then validate that page’s `input.choice_id` and emitted/current choice grounding. Keep `SE.parent_page_id` only as the state-before anchor.

**Mechanical consumer:** `observer_firewall` validator and pre-apply validation.

**Schema change required:** no.

**Validator/test change required:** yes.

**MCP/patch-engine/hook change:** no.

**Migration/fixture change:** tests/fixtures yes.

**Deterministic status:** deterministic.

**Confidence:** high.

---

## **F2 — P1 — `branch_isolation` hard-codes padded `PG-0001`**

**Affected file:** `tools/validators/src/structural/branch-isolation.ts`.

**Problem:** `isBundleGenesisRecord` returns true only when `created_at_page === "PG-0001"`, but the current ID convention is unpadded natural integers, e.g. `PG-1`.

**Evidence level:** code-level + doc-level.

**Why it matters:** Global author-pool storylets are allowed to reference bundle-genesis records. The validator can now falsely flag legal genesis references as branch-local leaks, or drive authors back toward unsafe broad storylets.

**Issue type:** validator/code drift.

**Recommendation:** Determine genesis from the bundle’s root branch/root page, not a string literal. Use `BR.root_page_id`, or infer the root page where `parent_page_id === null` and `turn_index === 0`.

**Mechanical consumer:** `branch_isolation` validator.

**Schema change required:** no.

**Validator/test change required:** yes.

**MCP/patch-engine/hook change:** no.

**Migration/fixture change:** yes, update padded test fixtures.

**Deterministic status:** deterministic.

**Confidence:** high.

---

## **F3 — P1 — Story-local context-packet seeds are warned about but not actually ignored**

**Affected files:** `tools/world-mcp/src/tools/get-context-packet.ts`; `tools/world-mcp/src/context-packet/assemble.ts`; `tools/world-mcp/src/context-packet/local-authority.ts`; `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`.

**Problem:** `get_context_packet` adds `story_local_seed_nodes_ignored` after assembly, but it passes the original `seed_nodes` into `assembleContextPacket`; local authority then looks up those seed nodes directly.

**Evidence level:** code-level + test-level + contract-level.

**Why it matters:** Story-local records can leak into world-scope packet layers, or a story-local seed can produce a `node_not_found` instead of the documented reroute warning. This directly violates the seventh/eighth-iteration focus.

**Issue type:** context-packet/retrieval drift.

**Recommendation:** For story-pipeline task types, partition seed nodes before assembly. Story-local IDs should be excluded from local-authority expansion, listed in `task_header.warnings`, and consumers should load them through `story_slug` + `story_bundle_context` or targeted retrieval.

**Mechanical consumer:** `get_context_packet` assembly path and story-pipeline skills.

**Schema change required:** no.

**Validator/test change required:** integration tests yes.

**MCP/patch-engine/hook change:** MCP change yes.

**Migration/fixture change:** no.

**Deterministic status:** deterministic.

**Confidence:** high.

---

## **F4 — P1 — `expected_witness_coverage` is not witness coverage**

**Affected file:** `tools/validators/src/structural/expected-witness-coverage.ts`.

**Problem:** The validator parses `non_propagation:` tags and checks closed reason syntax, but it does not compute direct/indirect expected witnesses, does not compare `group=` labels to computed groups, and does not require BEL create/supersession coverage.

**Evidence level:** code-level.

**Why it matters:** Public lies, violence, law/status events, ritual events, or visible artifact consequences can fail to propagate socially while the validator still passes.

**Issue type:** missing validation / validator overclaim.

**Recommendation:** Either rename the current validator to `non_propagation_tag_shape` and stop claiming witness completeness, or implement full deterministic witness coverage over active STSTAT location/agency, event kind/targets, BEL basis/source_event, and parseable non-propagation tags.

**Mechanical consumer:** validator, health audit, turn-cycle pre-apply validation.

**Schema change required:** no.

**Validator/test change required:** yes.

**MCP/patch-engine/hook change:** no.

**Migration/fixture change:** test fixtures yes.

**Deterministic status:** deterministic for structural coverage; social salience can remain judgment-assisted.

**Confidence:** high.

---

## **F5 — P2 — `causal_dependency_threat_scan` is documented but not registered as a validator**

**Affected files:** validator registry; turn-cycle/health-audit skill contracts.

**Problem:** The registry contains many structural validators, but no `causal_dependency_threat_scan`; searches found the term in skill/report prose rather than current validator code.

**Evidence level:** code-level search + registry-level.

**Why it matters:** A turn can leave choices or affordances pointing at records just closed, moved, or invalidated by the same delta.

**Issue type:** missing validation / implementation-test gap.

**Recommendation:** Implement `causal_dependency_threat_scan` or explicitly downgrade it in docs to skill-local judgment. Prefer implementing it because its named subcases are deterministic.

**Mechanical consumer:** pre-apply validators and health audit.

**Schema change required:** no.

**Validator/test change required:** yes.

**MCP/patch-engine/hook change:** no.

**Deterministic status:** deterministic.

**Confidence:** medium-high.

---

## **F6 — P2 — MCP `allocate_next_id` capability text still says padded IDs**

**Affected file:** `tools/world-mcp/src/server.ts`.

**Problem:** The server description says fresh story-bundle scoped classes return `<CLASS>-0001`, but actual allocator and FOUNDATIONS use unpadded IDs.

**Evidence level:** code-level + doc-level.

**Why it matters:** `describe_capabilities` can mislead skills into authoring IDs that schema patterns accept but source paths/contracts reject semantically.

**Issue type:** deployed/capability drift.

**Recommendation:** Replace the description with `<CLASS>-1` / unpadded natural integer wording.

**Mechanical consumer:** `describe_capabilities`.

**Schema change required:** no.

**Validator/test change required:** yes, capability snapshot test.

**MCP/patch-engine/hook change:** MCP text only.

**Migration/fixture change:** no.

**Deterministic status:** deterministic.

**Confidence:** high.

---

## **F7 — P2 — `describe_envelope_schema(create_bel_record)` exposes only generic BEL ID shape**

**Affected file:** `tools/world-mcp/src/tools/describe-envelope-schema.ts`.

**Problem:** `RECORD_SCHEMA_BY_PAYLOAD_KEY` includes story schemas, but `create_bel_record` uses `storyPayloadWithGenericRecord("^BEL-[0-9]+$")`, not the full BEL schema.

**Evidence level:** code-level.

**Why it matters:** Schema discovery is supposed to give skills machine-readable shape before authoring. For BEL, the discovery tool under-teaches the schema even though final validation may still catch errors.

**Issue type:** schema discovery drift.

**Recommendation:** Change `create_bel_record` to use the full belief schema, e.g. the same pattern as other story record ops.

**Mechanical consumer:** `describe_envelope_schema`, story skills authoring BEL records.

**Schema change required:** no, discovery wiring only.

**Validator/test change required:** yes.

**MCP/patch-engine/hook change:** MCP schema tool.

**Migration/fixture change:** no.

**Deterministic status:** deterministic.

**Confidence:** high.

---

## **F8 — P2 — Current test fixtures encode retired fields and padded IDs**

**Affected files:** `tools/world-mcp/tests/tools/story-bundle-fixture.ts`; `tools/validators/tests/structural/observer-firewall.test.ts`.

**Problem:** Fixtures use `CF-0001`, `PG-0001`, `derived_from_cf`, `world_ent_id`, `storylet_realized`, `chosen_choice_id`, numeric `urgency`, and other retired fields.

**Evidence level:** test/fixture-level.

**Why it matters:** Tests can pass while production contracts have moved on. This already masked the observer-firewall choice-link bug.

**Issue type:** fixture/test drift.

**Recommendation:** Rewrite fixtures to current story-state-contract shapes and unpadded IDs. Keep legacy fixtures only in explicitly named legacy-compat tests.

**Mechanical consumer:** test suite.

**Schema change required:** no.

**Validator/test change required:** yes.

**MCP/patch-engine/hook change:** no.

**Migration/fixture change:** yes.

**Deterministic status:** deterministic.

**Confidence:** high.

---

## **F9 — Optional/P2 — Current docs still cite archived specs as design references**

**Affected file:** `docs/FOUNDATIONS.md`.

**Problem:** FOUNDATIONS current machine-facing section points to `archive/specs/SPEC-02...`, `archive/specs/SPEC-03...`, and `archive/specs/SPEC-05...`.

**Evidence level:** doc-level.

**Why it matters:** The eighth-iteration prompt explicitly disallows archive files as current authority. These citations are likely historical references, but they create ambiguity.

**Issue type:** archived-source leakage.

**Recommendation:** Replace those references with current docs/source paths, or label them “historical archived spec; not current authority.”

**Mechanical consumer:** readers and future audits.

**Schema change required:** no.

**Validator/test change required:** optional docs grep test.

**MCP/patch-engine/hook change:** no.

**Migration/fixture change:** no.

**Deterministic status:** deterministic docs check.

**Confidence:** high.

---

# **9. Exact proposed amendments**

## **A1 — Fix observer-firewall current-choice resolution**

**File:** `tools/validators/src/structural/observer-firewall.ts`  
 **Operation:** replace/clarify.

Replace the current selected-choice lookup behavior with:

function pageResolvedByEvent(event: Record<string, unknown>, maps: RecordMaps): IndexedRecord | undefined {

 const eventIdValue = stringValue(event.id);

 if (eventIdValue === undefined) return undefined;

 return (maps.byType.get("page_record") ?? []).find((page) => {

   const input = asPlainRecord(asPlainRecord(page.parsed).input);

   return stringValue(input.resolved_event_id) === eventIdValue;

 });

}

function selectedChoiceForEvent(event: Record<string, unknown>, maps: RecordMaps): IndexedRecord | undefined {

 const childPage = pageResolvedByEvent(event, maps);

 const choiceId = stringValue(asPlainRecord(asPlainRecord(childPage?.parsed).input).choice_id);

 if (choiceId === undefined) return undefined;

 const choice = maps.byId.get(choiceId);

 return choice?.node_type === "choice_record" ? choice : undefined;

}

**Downstream affected:** observer-firewall tests; turn-cycle pre-apply validation.

**Pre-fix expected failure:** a child page uses `CHC-2` grounded in private `BEL-2`, but the validator checks parent page `CHC-1`.

**Post-fix expected pass/fail:** validator fails on `CHC-2` private belief leak.

---

## **A2 — Fix branch genesis detection**

**File:** `tools/validators/src/structural/branch-isolation.ts`  
 **Operation:** replace.

Replace `created_at_page === "PG-0001"` with root-page-aware logic:

function rootPageIdsForStory(maps: RecordMaps): Set<string> {

 const roots = new Set<string>();

 for (const branch of maps.byType.get("branch_record") ?? []) {

   const parsed = asPlainRecord(branch.parsed);

   const parent = stringValue(parsed.parent_branch_id);

   const rootPage = stringValue(parsed.root_page_id);

   if (parent === undefined || parent === null || parent === "null") {

     if (rootPage !== undefined) roots.add(rootPage);

   }

 }

 for (const page of maps.byType.get("page_record") ?? []) {

   const parsed = asPlainRecord(page.parsed);

   if (parsed.parent_page_id === null && parsed.turn_index === 0) {

     const id = stringValue(parsed.id);

     if (id !== undefined) roots.add(id);

   }

 }

 return roots;

}

function isBundleGenesisRecord(record: IndexedRecord, rootPageIds: ReadonlySet<string>): boolean {

 const created = stringValue(asPlainRecord(record.parsed).created_at_page);

 return created !== undefined && rootPageIds.has(created);

}

**Downstream affected:** branch-isolation tests, fixtures.

**Pre-fix expected failure:** global author-pool `SLT-1` references `BEL-1` created at `PG-1`; validator flags it.

**Post-fix expected pass:** `BEL-1` is recognized as bundle-genesis.

---

## **A3 — Actually ignore story-local context-packet seeds**

**Files:** `tools/world-mcp/src/tools/get-context-packet.ts`; tests.  
 **Operation:** replace/clarify.

Before calling `assembleContextPacket`, partition seeds:

const storyLocalSeeds = isStoryPipelineTaskType(args.task_type)

 ? args.seed_nodes.filter((seed) => STORY_LOCAL_SEED_NODE_PATTERN.test(seed))

 : [];

const worldSeeds = isStoryPipelineTaskType(args.task_type)

 ? args.seed_nodes.filter((seed) => !STORY_LOCAL_SEED_NODE_PATTERN.test(seed))

 : args.seed_nodes;

const seedNodesForAssembly = worldSeeds.length > 0 ? worldSeeds : [];

If `seedNodesForAssembly` is empty, return a structured `invalid_input` or documented `packet_incomplete_required_classes` telling the caller to supply at least one world-scope seed and load story-local IDs via targeted retrieval. Do **not** call local-authority expansion with story-local IDs.

**Downstream affected:** story-pipeline skills, get-context-packet tests.

**Pre-fix expected failure:** `seed_nodes=[opening-bells:SF-1]` appears in local authority or causes node lookup instability.

**Post-fix expected pass:** warning appears; no story-local node appears in packet node layers.

---

## **A4 — Expand or rename expected witness validation**

**File:** `tools/validators/src/structural/expected-witness-coverage.ts`  
 **Operation:** replace/clarify.

Minimum acceptable change:

export const nonPropagationTagShape = {

 name: "non_propagation_tag_shape",

 ...

};

Better change: keep `expected_witness_coverage` and implement:

1. Load active page state for the event’s parent page.  
2. Compute direct witnesses from active `STSTAT.location` and agency.  
3. Compute obvious indirect groups from event kind/targets and public/factional visibility.  
4. Accept coverage if a created/superseded BEL has `basis.source_event === SE-id` for the group/holder or a valid non-propagation tag matches the group.  
5. Emit `expected_witness_tag_missing`, `expected_witness_group_uncovered`, or `expected_witness_group_mismatch`.

**Downstream affected:** turn-cycle, health-audit, social propagation tests.

**Pre-fix expected failure:** no BEL for a public violence event passes if no reason token appears.

**Post-fix expected fail:** uncovered witness group fails.

---

## **A5 — Implement `causal_dependency_threat_scan`**

**File:** new `tools/validators/src/structural/causal-dependency-threat-scan.ts`; registry.  
 **Operation:** add.

Checks:

* `choice_dependency_clobbered`  
* `affordance_dependency_clobbered`  
* `obligation_counterparty_unavailable_without_transfer`  
* `slt_precondition_clobbered`

**Downstream affected:** registry, health-audit tests.

**Pre-fix expected failure:** a CHC grounded in a closed STOBJ remains emitted.

**Post-fix expected fail:** validator emits `choice_dependency_clobbered`.

---

## **A6 — Fix allocator capability text**

**File:** `tools/world-mcp/src/server.ts`  
 **Operation:** replace wording.

Replace:

Story-bundle-scoped classes return `<CLASS>-0001` for a fresh missing bundle...

With:

Story-bundle-scoped classes return unpadded natural-integer IDs such as `<CLASS>-1` for a fresh missing bundle under an existing world. RSP requires `story_slug` and `audit_id`.

**Downstream affected:** `describe_capabilities`.

---

## **A7 — Expose full BEL schema in envelope discovery**

**File:** `tools/world-mcp/src/tools/describe-envelope-schema.ts`  
 **Operation:** replace.

Change `create_bel_record` from generic ID schema to full belief record schema:

case "create_bel_record":

 return baseOperationProperties(kind, storyPayloadWithRecord("belief_record"));

Use the exact key name available in `RECORD_SCHEMA_BY_PAYLOAD_KEY`; if it is currently missing, add:

belief_record: "belief.schema.json"

or equivalent current BEL schema filename.

**Downstream affected:** schema discovery tests, story skills.

---

## **A8 — Refresh fixtures**

**Files:** `tools/world-mcp/tests/tools/story-bundle-fixture.ts`; `tools/validators/tests/structural/observer-firewall.test.ts`.  
 **Operation:** replace.

Use unpadded IDs and current fields:

* `PG-1`, `SE-1`, `CHC-1`, `STENT-1`  
* `SF.derived_from`, not `derived_from_cf`  
* `STENT.bound_char_id`, not `world_ent_id`  
* `PG.input.choice_id`, not `chosen_choice_id`  
* `PG.input.resolved_event_id`  
* `urgency: low | medium | high`, not numeric urgency.

---

# **10. Cross-skill / code propagation matrix**

| Change | FOUNDATIONS | Contract | Context packet | Skills | MCP | Validators | Schemas | Tests/fixtures | Hooks | Patch engine | dist/deployed |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| A1 Observer-firewall current choice | — | clarify only | — | turn-cycle/health-audit wording maybe | — | yes | no | yes | — | — | rebuild validators |
| A2 Branch genesis | — | no | — | commitment-block-authoring/health-audit | — | yes | no | yes | — | — | rebuild validators |
| A3 Story-local seed filtering | — | no | yes | all story-pipeline preflight wording | yes | no | no | yes | — | — | rebuild MCP |
| A4 Witness coverage | no | maybe clarify | — | turn-cycle/health-audit | — | yes | no | yes | — | — | rebuild validators |
| A5 Causal dependency validator | no | no | — | turn-cycle/health-audit | — | yes | no | yes | — | — | rebuild validators |
| A6 Allocator capability wording | no | no | no | no | yes | no | no | capability test | — | no | rebuild MCP/restart |
| A7 Full BEL envelope schema | no | no | no | prose only maybe | yes | no | no | schema tests | — | no | rebuild MCP |
| A8 Fixture refresh | no | no | no | no | no | no | no | yes | no | no | no |
| A9 Archive-reference cleanup | yes | no | maybe | no | no | no | no | docs grep | no | no | no |

---

# **11. Validator and test plan**

## **P0/P1 blocking tests**

| Test | Purpose | Fixture shape | Pre-fix behavior | Post-fix behavior | Type | Likely file |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| `observer_firewall_uses_child_page_input_choice` | Catch F1 | Parent `PG-1`; child `PG-2.input.choice_id=CHC-2`, `resolved_event_id=SE-2`; `CHC-2` grounded in private BEL of another actor | Passes or inspects wrong CHC | Fails with private belief leak | deterministic | `observer-firewall.test.ts` |
| `branch_isolation_allows_unpadded_bundle_genesis_records` | Catch F2 | `BEL-1.created_at_page=PG-1`; global `SLT-1` references `BEL-1` | Fails as branch-local | Passes | deterministic | `branch-isolation.test.ts` |
| `story_local_seed_nodes_are_excluded_from_packet_layers` | Catch F3 | `seed_nodes=[story:SF-1, ENT-1]` | Warning only, story-local may enter layers | Warning + no story-local nodes | integration | `get-context-packet.story-pipeline.test.ts` |
| `expected_witness_public_event_requires_bel_or_valid_tag` | Catch F4 | Event at location with two active witnesses, no BEL/tag | Passes | Fails uncovered group | deterministic | `expected-witness-coverage.test.ts` |
| `create_bel_record_describe_schema_requires_full_bel_fields` | Catch F7 | Call `describe_envelope_schema(op_kind=create_bel_record)` | Only `id` required | BEL fields surfaced | fixture/golden | `describe-envelope-schema.test.ts` |

## **P1 red-team tests**

| Test | Purpose | Fixture shape | Expected post-fix |
| ----- | ----- | ----- | ----- |
| `death_incapacity_reconciles_status_debts_relationships` | Major actor death support | New STSTAT dead; open STINT/OBL/SREL not reconciled | Fail unless close/supersede/transfer exists |
| `impossible_write_in_produces_se_and_page_plan` | Silent rejection guard | Write-in impossible action with no SE | Fail |
| `prose_receipt_does_not_mutate_pg` | Plan-authority guard | Failed receipt + PG unchanged | Pass |
| `audit_only_prose_attach_ignored_by_replay` | Audit-only event no-op | SE `prose_attach` in ledger | Replay ignores state delta |
| `promotion_closeout_fake_outputs_rejected` | Closeout fake CF/CH/PA defense | Linked CF missing from MCP retrieval | Abort/fail |
| `canon_baseline_full_ch_window_required` | Full CH-window drift | Parent CH-1, current CH-3, only CH-3 cited | Fail |
| `non_propagation_group_mismatch_rejected` | Social propagation precision | `group=wrong_group` | Fail |
| `global_author_pool_branch_local_leak_rejected` | Branch isolation | SLT global refs record from sibling branch | Fail |
| `storylet_alias_unbound_rejected` | Alias binding | `effects.close: [bound:debt]` with no `any_*` bind | Fail |
| `choice_set_noncollapse_material_axes` | Choice quality | 3 CHC identical axes, no rhetorical marks | Fail |

## **P2 production-hardening tests**

| Test | Purpose |
| ----- | ----- |
| `describe_capabilities_allocator_unpadded_wording` | Prevent capability/doc drift. |
| `fixtures_use_unpadded_ids_current_schema` | Guard test fixture rot. |
| `current_docs_do_not_reference_archive_as_current_authority` | Archive leakage hygiene. |
| `get_records_persisted_summary_recovery_consumed` | Ensure consumers retrieve slices, not summaries. |
| `post_write_plan_hash_mismatch_blocks_index_update` | Enforce direct-artifact hash discipline. |
| `dist_capability_currency_check_documents_rebuild_required` | Keep source/runtime drift visible. |

## **Optional research-inspired tests**

| Test | Purpose |
| ----- | ----- |
| `motivation_grounding_requires_active_intention_belief_or_affordance` | Use narrative-planning intentionality without global plot planning. |
| `social_norm_violation_opens_bel_or_consequence` | Moral/social consequence propagation. |
| `kg_reference_closure_for_plan_grounding` | Ensure KG/retrieval completeness supports generated page plans. |

---

# **12. Research synthesis**

I used research only where it changes a Worldloom recommendation.

| Source | Suggests | Worldloom action | Fit/conflict |
| ----- | ----- | ----- | ----- |
| Riedl & Young’s IPOCL narrative planner emphasizes causal plot progression and character intentionality; it frames believability around intentional agents. | Causal links and motivation grounding matter. | **Adapt**: strengthen `motivation_grounding` and `causal_dependency_threat_scan` tests. | Fits present-causal-state discipline; reject any fixed-goal plot planner. |
| Knowledge-graph-assisted IF generation argues IF worlds need semantic consistency/coherence and uses partial KGs of locations/objects to guide text generation. | Explicit graph state helps avoid incoherent generation. | **Already implemented / adapt**: Worldloom’s record graph, context packet, and targeted retrieval are the right substrate; add KG reference-closure tests. | Fits; does not make prose authoritative. |
| Neural Story Planning notes symbolic planners guarantee causal coherence but are closed-world/handcrafted, while LMs struggle with coherence; it infers preconditions and causes. | Preconditions/effects are useful, but fixed endings are dangerous. | **Adapt**: validator support for precondition/effect clobbering; **reject** goal-ending planning. | Fits if local and replay-backed; conflicts if used as global plot search. |
| Moral Stories structures narratives around norms, intents, actions, consequences, and moral/social reasoning. | Social consequences need explicit evidence, not vibes. | **Adapt**: stronger expected-witness/BEL propagation tests. | Fits; no autonomous NPC mutation without HARD-GATE. |
| INDCOR discusses interactive digital narrative design around representing complexity. | Complexity should be represented in inspectable structures. | **Note/adapt**: keep complexity in BEL/SF/STSTAT/OBL/CNSQ/THR, not act arcs. | Fits local salience; reject global drama-management. |

Research-backed conclusion: **do not add new narrative-shape fields.** The best transfer is more mechanical validation of causal dependencies, witness/social propagation, motivation grounding, and graph closure.

---

# **13. Anti-recommendations**

Reject these:

| Idea | Reason |
| ----- | ----- |
| Add dramatic act structure | Directly conflicts with FOUNDATIONS. |
| Add midpoint/climax fields | Future-shape obligation, not present causal state. |
| Add global drama manager | Reintroduces railroading and suppresses coherent player choices. |
| Add word-count targets | Explicitly rejected and empirically linked to padding/truncation pathologies. |
| Let rendered prose mutate PG/SE/state | Violates plan-authority boundary. |
| Promote story-local truth into world canon automatically | Violates story/world authority separation. |
| Store broad narrator memory as hidden state | Unverifiable and bypasses retrieval/audit trail. |
| Add new fields for witness propagation | Not needed yet; use BEL, STSTAT, SE rationale tags, and validators first. |
| Add autonomous NPC simulation that mutates state without HARD-GATE | Conflicts with patch-engine/HARD-GATE discipline. |
| Treat archive specs as current authority | Contradicts repo-current-source discipline. |

**Bottom line:** keep the architecture. Fix the validators, tests, and MCP drift. The repo already contains most of the right machinery; the dangerous parts are stale assumptions in code/tests and a few validators whose names promise more than they currently enforce.

