### **1. Executive verdict**

Worldloom’s current story-related system is **basically sound**, **not architecturally broken**, and **not overcomplicated in the dangerous way**. The foundational model is still the right one: PG/page plan authority, SE deltas, BEL/SF/STSTAT separation, story-local truth, explicit canon-promotion routing, hard-gated patch-engine writes, and no plot rails.

The main remaining work is **not architecture**. It is **validator/test hardening**, **promotion-package safety validation**, **indirect social-propagation coverage**, and **runtime/deployed capability currency**.

Bluntly: the tenth iteration is in much better shape than the prior audit. Several issues that were previously active are now fixed and test-backed: `causal_dependency_threat_scan`, direct `expected_witness_coverage`, observer firewall current-choice resolution, unpadded branch-root handling, page-plan hash tooling, and patch-engine story ops. The active risks are narrower but still material.

Confidence:

| Area | Verdict |
| ----- | ----- |
| Repo-source confidence | **High** for inspected current non-archived source. |
| Implementation confidence | **High** for validators/MCP/patch-engine source inspected; **medium** for end-to-end behavior because runtime was not invoked. |
| Test confidence | **Medium-high** for recent fixes; **medium** for broader adversarial story fixtures. |
| Runtime/deployed capability confidence | **Low / unverified**. No running MCP server was invoked. |
| Research-transfer confidence | **Medium-high**. Useful research maps to validators, replay tests, retrieval discipline, and audit harnesses—not schema expansion. |

Primary remaining work: **validators, tests, MCP capability-currency checks, deployed/runtime smoke tests, and promotion-package validation**.

---

### **2. Repository access and inspected-source inventory**

The audit brief was supplied in the uploaded pasted prompt.

Repository inspected: **`joeloverbeck/worldloom`**.

Branch/ref inspected: **`main` at commit `01b2d97a4bfe9b22ac09938c6025cd11767d7d9b`**, as evidenced by all fetched GitHub blob URLs for the inspected files.

Access method: **connected GitHub/code-search integration** through the available GitHub tool.

Repo cloned: **No**. Cloning was not necessary because connected GitHub/code-search access worked, and the prompt allowed connected GitHub access.

Runtime/deployed MCP tools invoked: **No**. This is a **source-only** audit. I do not claim deployed MCP behavior.

Generated `dist/` inspected or compared: **No tracked `dist/` artifact was found for `tools/world-mcp/dist/src/server.js`; the GitHub content fetch returned 404.** I inspected TypeScript/source and tests. Deployed build currency remains unverified.

Archive exclusion: GitHub search did **not** provide a reliable hard `archive/` exclusion. I manually classified `archive/` hits as historical/non-current and did not use them as current authority. Search results frequently returned `archive/` tickets/specs, so absence claims are limited to the current files actually inspected.

Authority docs inspected:

| Artifact | Status |
| ----- | ----- |
| `docs/FOUNDATIONS.md` | Present and inspected. |
| `.claude/skills/_shared-templates/story-state-contract.md` | Present and inspected. |
| `.claude/skills/_shared-templates/persisted-packet-recovery.md` | Present and inspected. |
| `docs/CONTEXT-PACKET-CONTRACT.md` | Present and inspected. |
| `docs/HARD-GATE-DISCIPLINE.md` | Present and inspected. |
| `docs/MACHINE-FACING-LAYER.md` | Present and inspected. |

Seven story-pipeline skills inspected:

| Skill | Current path |
| ----- | ----- |
| `branching-story-bootstrap` | `.claude/skills/branching-story-bootstrap/SKILL.md` |
| `branching-story-turn-cycle` | `.claude/skills/branching-story-turn-cycle/SKILL.md` |
| `branching-story-prose-attach` | `.claude/skills/branching-story-prose-attach/SKILL.md` |
| `commitment-block-authoring` | `.claude/skills/commitment-block-authoring/SKILL.md` |
| `branching-story-health-audit` | `.claude/skills/branching-story-health-audit/SKILL.md` |
| `story-fact-promotion-to-canon` | `.claude/skills/story-fact-promotion-to-canon/SKILL.md` |
| `story-promotion-closeout` | `.claude/skills/story-promotion-closeout/SKILL.md` |

Implementation surfaces inspected:

| Area | Current evidence |
| ----- | ----- |
| Validator registry | `tools/validators/src/public/registry.ts` includes current structural/rule validators, including `causal_dependency_threat_scan` and `expected_witness_coverage`. |
| Causal dependency validator | Source and tests inspected. |
| Expected witness validator | Source and tests inspected. |
| Observer firewall | Source and tests inspected. |
| Branch isolation | Source and tests inspected. |
| Snapshot replay equality | Source inspected. |
| Record schema compliance | Source inspected. |
| Proposal package shape | Source and tests inspected. |
| CF schema and canonical vocabularies | Source inspected. |
| MCP server/tool registration | Source inspected. |
| MCP capability/build info | Source and parity tests inspected. |
| PG hash tooling | Source and tests inspected. |
| Patch-engine envelope/write path | Source inspected. |
| Patch-engine story-record ops | Source inspected. |
| Context-packet story-local seed handling | Source inspected. |
| Ninth report / prior art | Present but stale relative to current source for some findings. |

Source areas not fully inspectable in this session: deployed MCP runtime, untracked/generated `dist/`, exhaustive fixture corpus, and true archive-excluded global grep.

---

### **3. Current authority extraction**

Binding authority order remains:

1. `docs/FOUNDATIONS.md`  
2. `.claude/skills/_shared-templates/story-state-contract.md`  
3. `docs/CONTEXT-PACKET-CONTRACT.md`  
4. `docs/HARD-GATE-DISCIPLINE.md`  
5. `docs/MACHINE-FACING-LAYER.md`  
6. Current non-archived source  
7. Current tests/fixtures/notes  
8. Prior reports as prior art  
9. `archive/` only as historical context

Current binding rules relevant to this audit:

* **PG/page plan is authoritative; prose is receipt.** Rendered prose cannot mutate PG, SE, or story state.  
* **No act structure, midpoint/climax tracking, fixed endings, plot rails, reconvergence, word-count targets, hidden LLM memory as state, or prose-as-state.**  
* **BEL, SF, and STSTAT remain separate.** BEL stores claims/beliefs/knowledge/lies; SF stores branch-local truth; STSTAT is the replayable source for life, agency, location, and derived `entity_status`.  
* **Story-local truth does not become world canon except through `story-fact-promotion-to-canon` → `canon-addition` → `story-promotion-closeout`.**  
* **Mystery Reserve protection covers both direct resolution and cumulative narrowing.**  
* **Patch-engine routing and approval-token discipline are mandatory.**  
* **Schema-minimalism still wins.** Add fields only when there is a named mechanical consumer. Validators, retrieval checks, tests, and replay harnesses are preferred over schema bloat.  
* **Persisted packet summaries are not enough.** Consuming skills must retrieve required slices before acting.

---

### **4. Recently closed / previously known issue reconciliation**

| Prior / ticketed issue | Current status | Evidence | Remaining work | Regression risk |
| ----- | ----- | ----- | ----- | ----- |
| Observer firewall current-choice resolution | **Fixed and test-backed** | Validator resolves current selected child choice via PG/SE relationship; tests cover child-page choice masking. | None for target bug. | Low. |
| Branch isolation unpadded root/genesis handling | **Fixed and test-backed** | Root detection supports BR root and `parent_page_id: null`; global storylets can reference bundle-genesis records but not branch-local siblings. | Keep fixtures unpadded. | Low. |
| Story-local context-packet seed filtering/rerouting | **Fixed but undertested from inspected evidence** | Story-pipeline seed nodes matching story-local IDs are filtered and warning `story_local_seed_nodes_ignored` is appended. | Add explicit PG/BEL/SE seed tests if not already present elsewhere. | Low-medium. |
| Expected witness coverage / non-propagation tag honesty | **Fixed for direct witnesses; broader social propagation partially handled** | Validator computes direct witnesses from STSTAT/STLOC/STENT and tests missing/partial/wrong-group BEL coverage plus valid non-propagation tags. | Extend indirect propagation tests. | Medium-high. |
| `causal_dependency_threat_scan` | **Fixed and test-backed** | Registry includes it; implementation flags choice, affordance, obligation, and high-salience SLT dependency threats; tests cover the named threat classes. | Keep in capability parity. | Low. |
| `allocate_next_id` unpadded capability wording | **Fixed in source; runtime-unverified** | MCP description says fresh story-bundle classes return unpadded natural-integer IDs such as `<CLASS>-1`. | Runtime smoke test. | Medium only for deployed drift. |
| `describe_envelope_schema(create_bel_record)` BEL schema exposure | **Fixed in source/parity; deployed-unverified** | Envelope schema covers every operation kind in source tests; story BEL op is in patch operation set. | Runtime/deployed check. | Medium. |
| Retired fixture fields and padded IDs | **Mostly fixed; residual fixture drift not exhaustively ruled out** | Current schemas/ops use unpadded regexes; current tests include unpadded root/genesis coverage. | Run repo-wide fixture lint excluding archive. | Medium. |
| Archive-reference cleanup | **No active story-pipeline authority leakage found in inspected files** | Archive hits appeared in search but were manually rejected. Current authority docs/skills inspected are non-archived. | Add CI grep for current docs/skills citing `archive/` as authority. | Medium because search cannot hard-exclude archive. |
| Page-plan hash tooling | **Fixed and test-backed** | CLI computes plan/state hashes; test detects post-write plan drift. | Runtime hook/build check. | Low-medium. |
| Capability parity source checks | **Fixed in source tests; deployed-unverified** | In-memory MCP test checks tool order, operation-kind envelope coverage, and validator registry names. | Add deployed/runtime smoke test. | Medium. |

---

### **5. Current architecture and enforcement map**

| Surface | Current mechanism |
| ----- | ----- |
| PG / SE / page plan / prose receipt authority | PG and page plan are authoritative; prose attach is receipt-only; PG hash tooling binds exact plan bytes and state hash. |
| BEL / SF / STSTAT separation | BEL tracks claims and knowledge; SF tracks branch-local truth; STSTAT drives replayable status and `entity_status`. Snapshot replay derives status from STSTAT. |
| Storylet / choice / branch handling | Branch isolation validates active-record ancestry and global storylet leakage; observer firewall validates choice/BEL/SF access; causal-dependency scan blocks stale choices/affordances/obligations/high-salience SLTs. |
| Mystery Reserve firewall | Contract and skills protect against direct resolution and cumulative narrowing; observer/prose/promotion paths treat mystery exposure as gated. |
| Story-fact promotion path | Promotion skill creates proposal package; closeout verifies linked CF/CH/PA outputs instead of fabricating canon results. |
| Patch-engine write path | Envelope shape validation, approval-token verification, id-allocation race check, stale-index check, pre-apply validators, patch reordering, temp staging, atomic commit, token consumption, and index sync. |
| Patch-engine story ops | Story-record ops map to `_source/<dir>/<ID>.yaml` for PG, SE, BEL, SF, STSTAT, SLT, CHC, story DA, and other bundle records. |
| MCP retrieval/context path | MCP exposes `get_context_packet`, `get_record(s)`, field projection tools, persisted packet slice retrieval, firewall retrieval, named-entity lookup, envelope schema, capability description, validation, submission, and ID allocation. |
| Direct-write markdown/hash checks | Skills require hash computation before stamping PG; CLI test proves drift changes plan hash. Runtime hook enforcement was not verified. |

---

### **6. Regression audit**

Verified implementation drift:

* The ninth report is stale on two important items: it says `causal_dependency_threat_scan` was still open and expected-witness coverage was tag-shape-only, but current source shows `causal_dependency_threat_scan` and `expected_witness_coverage` are implemented, registered, and tested.

Doc-only drift:

* No current authority drift was found in inspected FOUNDATIONS/contracts/skills. The remaining risk is archive-noise in search and prior reports, not current story-pipeline authority.

Test-only drift:

* Current targeted tests are strong for the recent fixes. The remaining weakness is breadth: indirect social propagation, promotion candidate safety, deployed MCP runtime smoke tests, and current-fixture linting.

Fixture/migration drift:

* Not exhaustively verified. Story-op schemas and tests use unpadded IDs, but a full fixture corpus pass was not performed.

Generated/deployed drift:

* **Unverified.** Source tests use in-memory server construction; that does not prove the running MCP server or generated build has the same validator/schema/capability surface.

Archived-source leakage:

* Search returned many `archive/` hits. I manually rejected them. No inspected current story skill or authority doc relies on archive as current authority.

Source unavailable / unverifiable risk:

* Running/deployed MCP capability and validator bundle currency remain unverifiable from source alone.

---

### **7. What should not change**

Do not add act structure, midpoint/climax tracking, target endings, automatic reconvergence, word-count pacing, global drama management, hidden model memory, autonomous NPC simulation that mutates PG/SE without HARD-GATE approval, or prose-as-state.

Do not collapse BEL into SF. Lies, rumors, public falsehoods, contested testimony, secret knowledge, and mistaken beliefs need BEL precisely because they are **not** branch-local fact.

Do not let story skills mutate world canon. The promotion chain is the correct mechanism.

Do not add schema fields for the active findings below. The missing pieces are validator logic, tests, runtime checks, and capability fingerprints. Adding narrative-shape fields would be bloat.

Do not treat external research on drama managers or target-ending optimization as compatible. Worldloom’s strength is present-causal-state discipline and local salience, not global plot optimization.

---

### **8. Red-team support matrix**

| Failure mode | Classification | Mechanism |
| ----- | ----- | ----- |
| Player kills/incapacitates a major actor early | Handled but undertested | STSTAT replay + `snapshot_replay_equality` + `causal_dependency_threat_scan`. |
| Player refuses the premise | Handled | No plot rails/fixed endings; turn-cycle can route refusal into SE/PG. |
| Player abandons current thread | Handled but undertested | THR/OBL/CNSQ health-audit discipline. |
| Player lies publicly | Handled | BEL/SF separation and lie-promotion validator registration. |
| Player acts on unavailable information | Handled | `observer_firewall`. |
| Player attempts something impossible | Handled but undertested | Turn-cycle PG/SE routing; impossible action should still produce stateful event outcome, not prose-only denial. |
| Player discovers protected mystery | Handled / judgment-assisted | Mystery Reserve firewall in contract and skills. |
| Cumulative mystery narrowing collapses protected mystery | Partially handled | Contract/health audit require accretion checks; deterministic coverage remains judgment-assisted. |
| Player creates branch-local counterfactual | Handled | SF plus promotion path; no direct canon mutation. |
| Rendered prose invents a structural fact | Handled / judgment-assisted | Prose attach receipt-only discipline. |
| Canon changes after pages committed | Handled | Canon-baseline drift validator is registered; snapshot replay and CH-window discipline apply. |
| Story-local claim proposed for canon promotion | Partially handled | Promotion package exists, but active finding WL-T10-P1-001 covers candidate safety-block under-validation. |
| Sibling branches contradict one another | Handled | `branch_isolation`. |
| Sibling story bundles contradict one another | Judgment-assisted | Health-audit/cross-story review; no deterministic full cross-story contradiction validator verified. |
| Social consequences propagate through witnesses, rumors, institutions, artifacts, documents, locations, traces, misunderstandings | Partially handled | Direct witnesses handled; indirect propagation is active finding WL-T10-P1-002. |
| Expected social propagation does not occur | Partially handled | `expected_witness_coverage` catches direct missing BEL; indirect missing propagation remains undertested. |
| Branch-local records leak into global author-pool storylets | Handled | `branch_isolation` global storylet checks. |
| Storylet alias binding fails or binds wrong record | Handled but undertested | Observer firewall and storylet predicate DSL validator registration. |
| Page snapshot replay diverges from SE deltas | Handled | `snapshot_replay_equality`. |
| Terminal branch leaves unresolved debts without proof | Handled but undertested | Health-audit debt/terminal proof discipline. |
| Accepted choices are cosmetic | Handled | `choice_set_noncollapse` registered. |
| Non-terminal leaf becomes unactionable | Handled but undertested | Health audit. |
| Prose receipt fails but turn-cycle continues correctly from PG state | Handled | PG authority/prose receipt separation. |
| Promotion closeout records fake/unresolved canon-addition outputs | Handled | Closeout skill verifies linked CF/CH/PA outputs. |
| Context packet omits governing records or story-bundle context | Handled but undertested | Story-pipeline tasks require story_slug; story-local seed nodes ignored with warning. |
| Patch-engine schemas permit records docs forbid or reject records docs require | Mostly handled | Envelope schema + record schema compliance; proposal package gap remains. |
| Persisted context packet or `get_records` summary returned but consuming skill fails to retrieve slices | Handled by contract, not runtime-enforced | Persisted-packet recovery template. |
| Schema discovery or deployed MCP capability surface is stale relative to source | Runtime/deployed-unverified | Source parity exists; deployed runtime not invoked. |
| Validator bundle in running MCP server is stale relative to rebuilt validator source | Runtime/deployed-unverified | Active finding WL-T10-P2-003. |
| Page-plan direct write succeeds but bytes no longer match `PG.plan.plan_hash` | Handled but deployed/hook-unverified | CLI/test detects drift. |
| Audit-only SE events accidentally enter page replay | Handled | Audit-only SE validator registered; replay source inspected. |
| BEL/SF separation collapses because lie/rumor/contested claim becomes SF | Handled but undertested | BEL/SF contract + validators. |
| STSTAT-derived `entity_status` diverges from active status records | Handled | Snapshot replay derives `entity_status`. |
| Social non-propagation tags malformed/unparseable/accepted without evidence | Partially handled | Syntax/direct evidence covered; indirect evidence not fully covered. |
| Canon-baseline drift uses only latest CH instead of full window | Handled from inspected registry/contract | `canon_baseline_drift` registered and contract requires CH-window retrieval. |
| Current docs/skills/tests cite archived files as current authority | Not found in inspected authority docs/skills | Archive search noise exists; no inspected current story authority relied on archive. |
| Generated `dist/` or deployed capability docs stale relative to TypeScript/source | Runtime/deployed-unverified | `dist/` not available in inspected GitHub source; no live MCP invocation. |

---

### **9. Active findings**

#### **WL-T10-P1-001 — Promotion proposal candidates under-validate conditional canon safety blocks**

Severity: **P1**

Affected files: `tools/validators/src/structural/proposal-package-shape.ts`, `tools/validators/tests/structural/proposal-package-shape.test.ts`, `tools/validators/src/structural/record-schema-compliance.ts`, `tools/world-index/src/public/canonical-vocabularies.ts`, `.claude/skills/story-fact-promotion-to-canon/SKILL.md`.

Affected mechanisms: `proposal_package_shape`, `record_schema_compliance`, `story-fact-promotion-to-canon`.

Evidence type: code-level, schema-level, test-level, skill-level.

Exact problem: current CF records receive conditional safety-block checks in `record_schema_compliance`, but proposal packages only enforce candidate purity/property placement. A candidate with a safety-sensitive `type` such as `technology`, `magic_practice`, `institution_with_secrecy`, or `knowledge_asymmetric_fact` can pass proposal-package shape without `epistemic_profile` or `exception_governance`. Current tests accept a split proposal candidate that lacks those blocks.

Why it matters in branching play: story-fact promotion is the only legal route from story-local truth to world canon. If the proposal candidate omits epistemic/exception governance for secrecy, technology, magic, or other distribution-sensitive facts, the review pipeline can normalize unsafe canon candidates before the actual canon-addition step catches them—or worse, train authors to omit the very safety reasoning that Worldloom requires.

Issue type: missing validation; implementation/test gap; promotion-path hardening.

Concrete recommendation: extend `proposal_package_shape` with the same conditional safety-block expectations used by `record_schema_compliance`, while still allowing proposal-specific `source_basis.direct_user_approval: false` and top-level `proposal_evidence`.

Mechanical consumer: `proposal_package_shape`, `validate_patch_plan`, `story-fact-promotion-to-canon`, `story-promotion-closeout`.

Schema change required: **No**.

Validator/test change required: **Yes**.

MCP/patch-engine/hook change required: **No**.

Migration/fixture change required: proposal-package test fixtures only.

Deterministic vs judgment-assisted: deterministic.

Confidence: **High**.

---

#### **WL-T10-P1-002 — Expected witness coverage is real, but indirect social propagation is still partial**

Severity: **P1**

Affected files: `tools/validators/src/structural/expected-witness-coverage.ts`, `tools/validators/tests/structural/expected-witness-coverage.test.ts`, `.claude/skills/branching-story-health-audit/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`.

Affected mechanisms: `expected_witness_coverage`, non-propagation tags, BEL, STSTAT, STLOC, STENT, DA, SREL.

Evidence type: code-level, test-level, skill-level.

Exact problem: `expected_witness_coverage` now handles direct witnesses: alive/free STENT actors at the same active STLOC, plus public/factional artifact and public BEL triggers. Tests cover missing direct BEL, partial BEL, wrong non-propagation group, unresolved tag record, concealed locations, and valid tag coverage. That is good. But the required failure mode is broader: rumors, institutions, artifacts, documents, locations, traces, and misunderstandings. The current deterministic validator does not fully model those indirect channels.

Why it matters in branching play: social reality becomes fake when public actions leave no rumor, institutional, documentary, artifact, or location trace. Direct witnesses are only one propagation channel. A public trial, posted notice, broken relic, missing body, altered gate, or factional memo can matter even when no named direct witness is co-located.

Issue type: missing validation; missing tests; social-propagation hardening.

Concrete recommendation: keep the existing direct-witness validator, but add indirect-propagation adversarial tests and a conservative extension that only fires when existing records provide deterministic cues: public/factional DA circulation, institution/faction SREL involvement, STLOC public visibility, document/artifact DA records, and explicit trace-bearing SE deltas.

Mechanical consumer: `expected_witness_coverage`, `validate_patch_plan`, health-audit social propagation phase.

Schema change required: **No**.

Validator/test change required: **Yes**.

MCP/patch-engine/hook change required: **No**.

Migration/fixture change required: add fixtures.

Deterministic vs judgment-assisted: deterministic for explicit cues; judgment-assisted for semantic ambiguity.

Confidence: **Medium-high**.

---

#### **WL-T10-P2-003 — Runtime/deployed capability and validator-bundle currency remain unverified**

Severity: **P2**

Affected files: `tools/world-mcp/src/tools/describe-capabilities.ts`, `tools/world-mcp/src/build-info.ts`, `tools/world-mcp/tests/server/capability-parity.test.ts`, `docs/MACHINE-FACING-LAYER.md`.

Affected mechanisms: `describe_capabilities`, `describe_envelope_schema`, validator registry, schema manifest, deployed MCP server.

Evidence type: code-level, test-level, runtime/deployed-capability-level.

Exact problem: source tests build an in-memory MCP server and check tool order, op schema coverage, and validator registry names. `describe_capabilities` returns `git_commit_hash`, `build_timestamp`, and `source_schema_hash`, but the source hash is derived from stable tool capability payload, not from validator source, schema files, or the patch-operation schema manifest. That is useful but incomplete. Runtime was not invoked, and generated `dist/` was not present in the inspected repo.

Why it matters in branching play: if a running MCP server lacks the rebuilt validator bundle, `validate_patch_plan` can give a stale pass/fail surface while source appears fixed. This is especially dangerous after recent validator additions.

Issue type: generated/deployed-capability drift; rollout/capability drift; missing runtime smoke test.

Concrete recommendation: add a runtime/deployed smoke test and expand build metadata with validator/schema fingerprints.

Mechanical consumer: CI, deployment smoke test, `describe_capabilities`, capability-parity test.

Schema change required: **No story schema change**. Optional MCP build-info fields only.

Validator/test change required: **Yes**.

MCP/patch-engine/hook change required: MCP build-info extension and test harness.

Migration/fixture change required: no.

Deterministic vs judgment-assisted: deterministic.

Confidence: **High** for source-only gap; runtime confidence remains unverified.

---

### **10. Exact proposed amendments**

| Finding | File | Operation | Exact code-shape / wording | Downstream effects | Pre-fix failure | Post-fix pass |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| WL-T10-P1-001 | `tools/validators/src/structural/proposal-package-shape.ts` | Add | Add candidate safety checks: if `candidate.type` is in `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED`, require `candidate.epistemic_profile`; if in `CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED`, require `candidate.exception_governance`; accept full object or `{ n_a: "<substantive rationale>" }` only if same rationale-quality helper used by `record_schema_compliance` passes. | Promotion skill, proposal validator, tests. | `technology` proposal without safety blocks passes. | It fails with `proposal_candidate_epistemic_profile_missing` and/or `proposal_candidate_exception_governance_missing`. |
| WL-T10-P1-001 | `tools/validators/tests/structural/proposal-package-shape.test.ts` | Add tests | `proposal_package_shape_rejects_safety_sensitive_candidate_without_epistemic_profile`; `proposal_package_shape_rejects_safety_sensitive_candidate_without_exception_governance`; `proposal_package_shape_accepts_non_sensitive_event_candidate_without_safety_blocks`; `proposal_package_shape_accepts_substantive_n_a_safety_rationale`. | Validator confidence. | Missing safety blocks not caught. | Deterministic failures/pass. |
| WL-T10-P1-001 | `.claude/skills/story-fact-promotion-to-canon/SKILL.md` | Clarify | “When `candidate.type` is safety-sensitive under canonical CF vocabulary, include `epistemic_profile` and/or `exception_governance` in the candidate or provide a substantive `n_a` rationale. Do not defer this reasoning to canon-addition.” | Skill wording only. | Skill can emit under-specified candidate. | Skill emits validator-ready candidate. |
| WL-T10-P1-002 | `tools/validators/src/structural/expected-witness-coverage.ts` | Add | Add conservative indirect cue extraction from existing records: public/factional DA, trace-bearing SE state_delta, institution/faction SREL involvement, STLOC public visibility. Emit warnings/failures only when cue is explicit and no BEL/DA/SREL/CNSQ evidence record or valid non-propagation tag exists. | Health audit, turn-cycle, validator tests. | Public artifact trace can have no BEL/DA propagation and still pass. | Missing trace propagation fails deterministically when cue is explicit. |
| WL-T10-P1-002 | `tools/validators/tests/structural/expected-witness-coverage.test.ts` | Add tests | `expected_witness_coverage_requires_public_artifact_trace_bel_or_nonprop`; `expected_witness_coverage_requires_institutional_visibility_record`; `expected_witness_coverage_accepts_documented_misunderstanding_bel`; `expected_witness_coverage_does_not_guess_indirect_witnesses_without_explicit_cue`. | Test coverage. | Direct-witness-only fixture passes. | Explicit indirect cases fail/pass correctly. |
| WL-T10-P2-003 | `tools/world-mcp/src/build-info.ts` | Add | Add `validator_registry_hash`, `record_schema_manifest_hash`, and `patch_operation_schema_hash` computed from stable serialized registry names + schema file hashes + `OPERATION_KINDS`/op schema manifest. | MCP capability parity, deployed smoke. | Running server can expose current tools but stale validators. | Fingerprints differ and smoke test fails. |
| WL-T10-P2-003 | `tools/world-mcp/tests/server/capability-parity.test.ts` | Add | Assert build-info fingerprints equal locally computed manifests. | CI. | Tool-only hash passes despite stale validator bundle. | Registry/schema drift is caught. |
| WL-T10-P2-003 | Deployment/CI smoke test | Add | Start built MCP server, call `describe_capabilities`, `describe_envelope_schema({ op_kind: "create_bel_record" })`, and `validate_patch_plan` with one known-bad fixture that requires `causal_dependency_threat_scan`. | Deployed/runtime confidence. | Source fixed but deployed server stale. | Deployed server proves current validator/schema bundle. |

No proposed change requires a story schema field. All accepted amendments have mechanical consumers.

---

### **11. Cross-skill / code propagation matrix**

| Accepted change | FOUNDATIONS | story-state-contract | persisted-packet-recovery | CONTEXT contract | HARD-GATE | MACHINE layer | Bootstrap | Turn cycle | Prose attach | Commitment | Health audit | Promotion | Closeout | MCP | Patch engine | Validators | Schemas | Hooks | Tests | Fixtures | Migrations | dist/deploy |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| WL-T10-P1-001 proposal candidate safety | — | — | — | — | — | — | — | — | — | — | — | Clarify | Verify source package | — | — | Change | No story schema | — | Add | Add | — | Rebuild |
| WL-T10-P1-002 indirect propagation tests | — | Clarify optional if needed | — | — | — | — | — | May cite | — | — | Clarify | — | — | — | — | Change | No story schema | — | Add | Add | — | Rebuild |
| WL-T10-P2-003 capability fingerprints | — | — | — | — | — | Clarify | — | — | — | — | — | — | — | Change | — | Manifest hash only | No story schema | — | Add | Bad-plan fixture | — | Required |

---

### **12. Validator and test plan**

P0 blocking tests: **None proposed.** No P0 unsafe core-state corruption was found in current inspected source.

P1 red-team tests:

| Test | Purpose | Fixture shape | Pre-fix behavior | Post-fix behavior | Type | Likely file |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| `proposal_package_shape_rejects_safety_sensitive_candidate_without_epistemic_profile` | Prevent unsafe canon proposal candidates. | SP proposal with `candidate.type: knowledge_asymmetric_fact` and no `epistemic_profile`. | Passes. | Fails. | Deterministic fixture | `proposal-package-shape.test.ts` |
| `proposal_package_shape_rejects_safety_sensitive_candidate_without_exception_governance` | Enforce exception governance in proposal candidates. | SP proposal with `candidate.type: technology` and no `exception_governance`. | Passes. | Fails. | Deterministic fixture | `proposal-package-shape.test.ts` |
| `proposal_package_shape_accepts_non_sensitive_event_candidate_without_safety_blocks` | Avoid schema bloat and overreach. | SP proposal with `candidate.type: event`. | Passes. | Still passes. | Deterministic fixture | `proposal-package-shape.test.ts` |
| `expected_witness_coverage_requires_public_artifact_trace_bel_or_nonprop` | Catch indirect public artifact consequences. | SE creates public/factional DA trace; no BEL/DA propagation record or tag. | Passes. | Fails. | Deterministic fixture | `expected-witness-coverage.test.ts` |
| `expected_witness_coverage_does_not_guess_indirect_witnesses_without_explicit_cue` | Prevent validator overreach. | Private/ambiguous SE without public DA/STLOC/SREL cue. | Passes. | Still passes. | Deterministic fixture | `expected-witness-coverage.test.ts` |

P2 production-hardening tests:

| Test | Purpose | Fixture shape | Expected |
| ----- | ----- | ----- | ----- |
| `describe_capabilities_exposes_validator_schema_fingerprints` | Runtime capability currency. | Built MCP server. | Build info includes validator/schema/op hashes. |
| `deployed_mcp_rejects_known_bad_causal_dependency_plan` | Catch stale validator bundle. | Patch plan with clobbered choice dependency. | `validate_patch_plan` fails through running MCP. |
| `story_local_seed_warning_covers_pg_bel_se_variants` | Confirm source behavior across record classes. | `get_context_packet` with PG/BEL/SE seeds. | Story-local seeds ignored and warning returned. |
| `current_docs_skills_do_not_cite_archive_as_authority` | Archive hygiene. | Grep current docs/skills excluding `archive/`. | No authority citation to `archive/` except historical caveats. |
| `fixtures_use_unpadded_ids_unless_legacy_rejection` | Fixture currency. | Current fixture corpus. | No padded ID fixtures except explicit negative tests. |

Optional research-inspired tests:

| Test | Research hook | Purpose |
| ----- | ----- | ----- |
| `lost_in_middle_required_slice_recovery` | Long-context retrieval research | Persisted summary must retrieve governing record slices before skill proceeds. |
| `constory_style_consistency_taxonomy_fixture` | Narrative consistency benchmarks | Map contradiction classes to existing validators without adding fields. |
| `storylet_salience_locality_no_global_plot_ranker` | Storylet/local salience research | Ensure SLT eligibility remains local and state-based, not global plot-shape optimization. |

---

### **13. Research synthesis**

| Source | What it suggests | Adopt / adapt / reject / note | Worldloom fit |
| ----- | ----- | ----- | ----- |
| Emily Short’s storylet writeup defines storylets as content units with prerequisites and effects, emphasizing flexible, recombinable, state-based narrative rather than hard branching. | Keep storylets local, prerequisite-driven, and state-effect-driven. | **Already implemented / adapt tests** | Fits. Worldloom already has SLT predicates and branch-local state. Add tests for storylet eligibility and alias binding, not new plot fields. |
| Drama Llama proposes an LLM-powered storylet framework with natural-language triggers for responsive interactive narrative. | LLMs can help author responsive storylets, but natural-language trigger evaluation risks hidden model judgment. | **Adapt cautiously** | Accept only as judgment-assisted authoring aid. Reject any hidden LLM trigger as authoritative state. Mechanical consumer would be predicate-DSL validation tests, not schema expansion. |
| Riedl and Young’s IPOCL narrative-planning work emphasizes causal coherence and character intentionality. | Causal threats and intention grounding improve perceived coherence. | **Already implemented / adapt tests** | Fits through `causal_dependency_threat_scan`, STINT, SLT preconditions, and replay tests. Do not adopt target-ending planning. |
| Generative Agents shows believable social behavior through observation, memory, reflection, and planning in autonomous agents. | Social propagation and memory matter, but autonomous agent mutation is dangerous. | **Reject autonomous mutation; adapt evaluation idea** | Use BEL/SREL/STSTAT propagation tests. Do not allow autonomous NPC agents to mutate PG/SE without HARD-GATE approval. |
| Knowledge-graph-assisted storytelling research reports that structured graph guidance can improve long-form coherence and user control in story generation. | Use structured graph/state as authority for generation. | **Already implemented / adapt** | Fits Worldloom’s indexed records and MCP retrieval. Add graph-consistency tests; no prose-as-state. |
| Lost in the Middle shows long-context models may underuse relevant information placed in the middle of long prompts. | Do not trust “included somewhere in a big packet.” Force targeted slice retrieval. | **Adapt** | Supports persisted-packet recovery discipline and `get_record_field`/`get_persisted_packet_slice` checks. No schema change. |
| ConStory-Bench / ConStory-Checker targets long-story consistency bugs and grounds contradiction judgments in explicit textual evidence. | Story consistency needs explicit contradiction categories and evidence-grounded checks. | **Adapt** | Map taxonomy to existing validators: replay divergence, canon drift, BEL/SF collapse, STSTAT divergence, mystery narrowing. Do not add narrative-shape fields. |
| Retrieval-Augmented Generation work argues for non-parametric retrieval to improve factuality and updateability. | External retrieval beats hidden model memory for mutable knowledge. | **Already implemented / adapt** | Supports MCP retrieval and no hidden LLM memory. Add runtime tests that consuming skills retrieve required slices before mutation. |

Every accepted research transfer preserves present-causal-state discipline, avoids act/drama-manager/target-ending logic, keeps prose non-authoritative, keeps story-local truth separate from canon, does not weaken the Mystery Reserve firewall, avoids story schema bloat, has a named mechanical consumer, and can be tested mechanically or explicitly marked judgment-assisted.

---

### **14. Anti-recommendations**

Reject these:

* **Global drama manager.** It conflicts with no-rails/no-fixed-ending foundations.  
* **Act structure, midpoint, climax, or target-ending fields.** They would create plot-shape pressure and schema bloat.  
* **Automatic branch reconvergence.** It would weaken branch safety and player agency.  
* **Word-count targets as pacing control.** Rendered prose is receipt, not state.  
* **Prose-as-state or prose-derived mutation.** PG/page plan and SE are authoritative.  
* **Hidden LLM memory.** All state must be explicit, retrievable, replayable, and patch-engine-routed.  
* **Autonomous NPC simulation that writes PG/SE directly.** Any autonomous generation must become a proposal, not a mutation.  
* **BEL/SF collapse.** Public claims, rumors, lies, and contested beliefs must remain BEL unless promoted through explicit authority.  
* **New social-propagation schema fields before validator coverage.** Existing records are enough for the next round.  
* **Research-driven target-ending optimization.** It is seductive and wrong for Worldloom.

---

### **15. Tenth-iteration carryover, if any**

Carryover is narrow and concrete:

1. **Runtime/deployed MCP verification remains undone.** I inspected source only; no running MCP server was invoked.  
2. **Generated `dist/` currency remains unverified.** The expected `tools/world-mcp/dist/src/server.js` was not present in the inspected GitHub tree.  
3. **A true archive-excluded global grep was not available.** GitHub search returned archive hits; I manually rejected them.  
4. **Full fixture corpus was not exhaustively inspected.** Targeted validator/MCP/patch-engine tests were inspected; run a full fixture lint for padded IDs, retired fields, and archive references.  
5. **Indirect social propagation should be the next hardening target.** Direct witness coverage is now real; the remaining gap is public/institutional/artifact/document/trace propagation.  
6. **Promotion-package safety validation should be added before more canon-promotion work.** It is the most important active P1 because it protects the only legal bridge from story-local truth into world canon.

