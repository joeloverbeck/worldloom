# Package And Tooling Checks

Use this reference for tickets whose owned seam includes `tools/`, package manifests, package-local commands, serializers, hashes/checksums, public exports, or package-local user-facing docs/examples.

## Reassessment

- Inspect the package's `package.json`, `tsconfig.json`, and existing package-local docs/examples before trusting drafted command shapes, module formats, or emitted artifact paths.
- If the ticket compares persisted hashes, checksums, canonical serialization, or drift markers, identify the producer of the stored value and reuse its canonicalization algorithm. If the implementation intentionally differs, record that difference in `Assumption Reassessment` before coding.
- If a new dependency is needed only to preserve an existing package contract, treat the manifest and lockfile update as same-seam fallout. Record package-manager audit, funding, or deprecation output in closeout when remediation is outside scope.

## Closeout Hard Stop

Before final response for a package/tool ticket, inspect adjacent same-package user-facing surfaces even if the ticket did not name them:

- `README.md`
- example config files, such as `.mcp.json.example`
- package-local usage snippets or command examples
- scripts that document or wrap the changed command/API

For each stale same-seam surface, either truth it in the active ticket or record why it belongs to a separate follow-up. When the stale package doc, entrypoint, script, or example is real but outside the active ticket, name the existing owner or create/recommend a bounded follow-up ticket unless the user requested implementation-only with no follow-up drafting; in that case, record the excluded drift in `Assumption Reassessment` or `## Deviations`. Do not leave known stale package docs/examples unmentioned after changing package-local behavior.

## Verification

- Run producer commands before consumer proofs.
- Run package-local builds/tests from the package root when module resolution depends on package-local dependencies.
- When tests consume compiled output such as `dist/tests/**/*.js` and a source or test file was renamed or removed, prevent stale compiled files from remaining in the proof lane. Prefer the package clean script if present; otherwise explicitly check and remove the stale generated file before rerunning the accepted proof, then classify the ignored generated state in closeout.
- When a consumer package depends on a local sibling package via a workspace or `file:` dependency, refresh the consumer's installed dependency view after producer-side package/export changes and before consumer proof; do not assume the consumer is exercising the newly built public surface until that refresh has happened.
- If the consumer dependency is a symlink to the producer package, a producer build plus grepping the consumer-resolved runtime and declaration artifacts is the refresh check. If the dependency is a copied install, run the package install/update step before consumer proof.
- After refreshing a local workspace or `file:` dependency, verify the installed dependency artifact that the consumer will actually resolve contains the new runtime or declaration surface when that surface is the proof target. For TypeScript type/export tickets, this may mean grepping the consumer's installed `.d.ts` file before rerunning the consumer build.
- For public export changes, inspect existing public-surface tests for import-time IO or side-effect guards before choosing a re-export shape. Preserve or extend those guards so a new public constant does not accidentally make a narrow contract import perform filesystem work or other package initialization.
- When a permissive consumer boundary such as an MCP or CLI input schema delegates into a stricter producer API, keep the public consumer schema stable and bridge only after the consumer's local validation. In TypeScript, prefer deriving the producer argument type from the imported function (`Parameters<typeof producerFn>[0]`) unless the producer intentionally exports the named input type in its emitted declarations; do not import private source-only types just to satisfy the consumer build.
