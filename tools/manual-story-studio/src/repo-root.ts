import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { err, ok, type ReadResult } from "./read/result.js";

interface ResolveRepoRootOptions {
  explicit?: string;
  cwd: string;
  entryPointUrl: string;
}

const MARKER_PATHS = ["worlds", path.join("docs", "FOUNDATIONS.md")];

function hasRepoMarkers(candidate: string): boolean {
  return MARKER_PATHS.every((marker) => existsSync(path.join(candidate, marker)));
}

function findMarkerBearingAncestor(start: string): string | undefined {
  let current = path.resolve(start);

  while (true) {
    if (hasRepoMarkers(current)) return current;

    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function candidateFromEntryPoint(entryPointUrl: string): string {
  const entryPointPath = fileURLToPath(entryPointUrl);
  return path.resolve(path.dirname(entryPointPath), "../../../..");
}

export function resolveRepoRoot(options: ResolveRepoRootOptions): ReadResult<string> {
  if (options.explicit !== undefined && options.explicit.trim() !== "") {
    return ok(path.resolve(options.explicit));
  }

  const cwdCandidate = findMarkerBearingAncestor(options.cwd);
  if (cwdCandidate !== undefined) {
    return ok(cwdCandidate);
  }

  const entryPointCandidate = candidateFromEntryPoint(options.entryPointUrl);
  if (hasRepoMarkers(entryPointCandidate)) {
    return ok(entryPointCandidate);
  }

  return err({
    code: "repo_root_not_found",
    path: path.resolve(options.cwd),
    cause: {
      candidates: [path.resolve(options.cwd), entryPointCandidate],
      required_markers: MARKER_PATHS,
    },
    repair_hint:
      "Run from the worldloom repo root or pass --repo-root <absolute-path-to-worldloom-repo>.",
  });
}
