# World-Index Ticket Checks

Use these focused checks for `world-index`, index-backed build/sync/verify, atomic-source parser tickets, and `world-mcp` tickets whose behavior depends on index freshness or `file_versions` rows. They supplement the main implement-ticket workflow.

## Reassessment

- For `world-index` content tickets that mention adjudication YAML placement or `unexpected_yaml_section`, inspect `tools/world-index/src/parse/yaml.ts` before trusting any ticket claim about a canonical adjudication YAML section; the live parser may treat all adjudication fenced YAML as out-of-section.
- For `world-mcp` stale-index or live-corpus tickets, inspect both the retrieval-side stale-index check and the index producer that writes the rows under review. In particular, distinguish disk-backed file rows from synthetic atomic logical rows such as retired root markdown concern names.
- For end-to-end tests that copy a live world tree or fixture, inspect copied generated-state directories such as `_index/` before trusting a "fresh build" proof path. Strip or account for inherited generated state so setup drift is not misdiagnosed as current-ticket fallout.
- For cleanup/removal tickets, separate parser utility deletion from dispatch/mode removal. A ticket can remove legacy world-build activation while retaining markdown/YAML parser utilities, fixtures, or tests that still exercise hybrid documents or direct parser contracts.
- For staged tool/schema tickets whose public API is world-agnostic but helper code is world-scoped, verify whether the missing scope can be derived internally before broadening the public contract.
- For markdown-to-record or legacy-world atomization tickets, check for attribution/comment markers that sit immediately before headings in the source and become orphaned at generated record boundaries. Compare against any pre-migration snapshot before removing or reattaching them so cosmetic cleanup does not hide content loss.
- When a ticket repairs malformed authority-bearing frontmatter on whole-file records, rerun a post-fix node-id probe before final closeout; fixing the frontmatter can change the truthful record-node shape from a fallback path-style id to the structured record id now emitted by the parser.

## Verification

- For index-backed build/sync/verify tickets, prefer temp-copy probes over live-world `_index/` state when proving rebuild behavior or unresolved-reference cleanup.
- For schema or migration build probes, prefer the package's existing atomic fixture builders or generated-fixture harnesses over copying legacy fixture directories, unless the ticket specifically owns legacy-mode behavior.
- For atomic-source `world-index verify` tickets, remember that retired logical file names such as `INSTITUTIONS.md` can be synthetic in atomic worlds but real disk-backed files in legacy fixtures. Skip or special-case them only after proving the backing file is absent or the fixture mode is truly atomic.
- When replacing a drafted tool/index command with a manual probe, confirm the probe uses the same artifact root, package/module-resolution root, and source-node/filter boundary as the live producer path. Do not scan a broader substrate ad hoc and treat that result as equivalent evidence.
- When proof moves to a temp copy or alternate root, retarget all dependent readonly queries and follow-on commands to that same rebuilt artifact root instead of mixing live generated state with temp-copy proof.
- For sync or `file_versions` tests, confirm the mutation changes the exact tracked content hash. Avoid whitespace-only touches when parser or hash normalization may erase them; for semantic-neutral atomic YAML edits, a YAML comment touch can prove the reparse without changing record data.
- When a command is expected to reject a world before build/sync, assert the rejection does not create or mutate `_index/world.db`, WAL/SHM files, or other derived artifacts unless the ticket explicitly owns that side effect.

## Closeout

- If final verification intentionally uses a live world instead of a temp copy, inspect the private `worlds/` repo status and classify any `_index/` changes as expected derived dirt, cleaned state, or unexpected source fallout.
- If synthetic logical nodes or derived helper rows change, inspect adjacent build/count/verify helpers and expectations in the same seam. Existing proof code may need to count those derived rows explicitly or exempt them from parser-vs-index drift checks just as it already does for older synthetic artifacts.
- For atomic-source record checks, do not filter solely by `node_type`: primary `_source/entities/*.yaml` records can emit `named_entity` nodes that are disk-backed source rows, while derived helper entities such as `entity:*` are synthetic and may need different visibility or drift treatment.
- If a ticket mechanically atomized or split markdown into record files, inspect generated records for orphaned source comments or attribution markers at body ends, before YAML-only fields, or before carried separators. Resolve each marker against the source snapshot before final verification.
