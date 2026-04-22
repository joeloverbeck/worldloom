import { syncWorldIndex } from "./shared";

export function sync(worldRoot: string, worldSlug: string): number {
  return syncWorldIndex(worldRoot, worldSlug).exitCode;
}
