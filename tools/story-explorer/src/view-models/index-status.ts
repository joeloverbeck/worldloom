export type IndexStatus =
  | { kind: "fresh"; version: number }
  | { kind: "missing"; remedy: string }
  | { kind: "version_mismatch"; expected: number; found: number; remedy: string }
  | { kind: "empty"; remedy: string }
  | { kind: "stale"; driftedFiles: string[]; remedy: string }
  | { kind: "open_failed"; error: string };
