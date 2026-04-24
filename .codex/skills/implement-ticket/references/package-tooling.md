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

For each stale same-seam surface, either truth it in the active ticket or record why it belongs to a separate follow-up. Do not leave known stale package docs/examples unmentioned after changing package-local behavior.

## Verification

- Run producer commands before consumer proofs.
- Run package-local builds/tests from the package root when module resolution depends on package-local dependencies.
- When a proof depends on installed sibling package artifacts, refresh the consumer dependency view and verify the installed artifact exposes the changed runtime or declaration surface.
