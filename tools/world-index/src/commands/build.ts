import { buildWorldIndex } from "./shared";

export function build(worldRoot: string, worldSlug: string): number {
  return buildWorldIndex(worldRoot, worldSlug).exitCode;
}
