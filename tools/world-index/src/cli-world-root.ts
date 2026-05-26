import { existsSync } from "node:fs";
import path from "node:path";

export type WorldRootSource = "explicit_flag" | "env_var" | "auto_discovery";

export interface WorldRootResolution {
  ok: true;
  worldRoot: string;
  source: WorldRootSource;
  attempted: string[];
}

export interface WorldRootResolutionFailure {
  ok: false;
  message: string;
  attempted: string[];
}

export type ResolveWorldRootResult = WorldRootResolution | WorldRootResolutionFailure;

const MARKERS = ["docs/FOUNDATIONS.md", "worlds"] as const;

export function resolveWorldRoot(opts: {
  flag?: string | undefined;
  envVar?: string | undefined;
  cwd: string;
}): ResolveWorldRootResult {
  const attempted: string[] = [];

  if (opts.flag !== undefined && opts.flag.length > 0) {
    const resolved = path.resolve(opts.flag);
    attempted.push(`--world-root=${resolved}`);
    if (isWorldRoot(resolved)) {
      return { ok: true, worldRoot: resolved, source: "explicit_flag", attempted };
    }
    return {
      ok: false,
      message: `--world-root=${resolved} is not a valid worldloom project root (must contain ${markerText()}).`,
      attempted
    };
  }

  if (opts.envVar !== undefined && opts.envVar.length > 0) {
    const resolved = path.resolve(opts.envVar);
    attempted.push(`WORLDLOOM_ROOT=${resolved}`);
    if (isWorldRoot(resolved)) {
      return { ok: true, worldRoot: resolved, source: "env_var", attempted };
    }
    return {
      ok: false,
      message: `WORLDLOOM_ROOT=${resolved} is not a valid worldloom project root (must contain ${markerText()}).`,
      attempted
    };
  }

  let cursor = path.resolve(opts.cwd);
  while (true) {
    attempted.push(`auto-discovery: ${cursor}`);
    if (isWorldRoot(cursor)) {
      return { ok: true, worldRoot: cursor, source: "auto_discovery", attempted };
    }

    const parent = path.dirname(cursor);
    if (parent === cursor) {
      break;
    }
    cursor = parent;
  }

  return {
    ok: false,
    message: `World root resolution failed. Provide --world-root <path>, set WORLDLOOM_ROOT, or run from a directory inside a worldloom project (auto-discovery walks up looking for ${markerText()}).`,
    attempted
  };
}

export function formatWorldRootTrace(resolution: WorldRootResolution): string {
  return `[world-root] ${resolution.worldRoot} (source: ${resolution.source})`;
}

export function formatWorldRootFailure(failure: WorldRootResolutionFailure): string {
  const attempted = failure.attempted.length === 0
    ? ""
    : `\nAttempted:\n${failure.attempted.map((entry) => `- ${entry}`).join("\n")}`;
  return `${failure.message}${attempted}`;
}

function isWorldRoot(dir: string): boolean {
  return MARKERS.every((marker) => existsSync(path.join(dir, marker)));
}

function markerText(): string {
  return MARKERS.join(" + ");
}
