import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";

export interface PerWorldLockOptions {
  lock_mode?: "wait" | "fail_fast";
  wait_timeout_ms?: number;
}

export type PerWorldLock =
  | { ok: true; release: () => Promise<void> }
  | { ok: false; code: "world_locked" };

export async function acquirePerWorldLock(
  worldRoot: string,
  worldSlug: string,
  opts: PerWorldLockOptions = {}
): Promise<PerWorldLock> {
  const lockPath = path.join(worldRoot, "worlds", worldSlug, "_index", ".patch-engine.lock");
  const mode = opts.lock_mode ?? "wait";
  const deadline = Date.now() + (opts.wait_timeout_ms ?? 5000);

  await mkdir(path.dirname(lockPath), { recursive: true });

  while (true) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.close();
      return {
        ok: true,
        release: async () => {
          try {
            await unlink(lockPath);
          } catch (error) {
            if (!isNodeError(error) || error.code !== "ENOENT") {
              throw error;
            }
          }
        }
      };
    } catch (error) {
      if (!isNodeError(error) || error.code !== "EEXIST") {
        throw error;
      }
      if (mode === "fail_fast" || Date.now() >= deadline) {
        return { ok: false, code: "world_locked" };
      }
      await sleep(50);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
