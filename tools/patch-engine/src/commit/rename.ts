import { open, readFile, rename, unlink } from "node:fs/promises";

import { contentHashForText } from "../ops/shared.js";
import type { StagedWrite } from "../ops/types.js";
import type { FileWriteReceipt } from "../envelope/schema.js";

export async function commitStaged(staged: StagedWrite[]): Promise<FileWriteReceipt[]> {
  const receipts: FileWriteReceipt[] = [];

  for (const write of staged) {
    const priorHash = await hashExistingFile(write.target_file_path);
    const handle = await open(write.temp_file_path, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }

    await rename(write.temp_file_path, write.target_file_path);
    receipts.push({
      file_path: write.target_file_path,
      prior_hash: priorHash,
      new_hash: write.new_hash,
      ops_applied: write.noop === true ? 0 : 1
    });
  }

  return receipts;
}

export async function unlinkAllTempFiles(staged: StagedWrite[]): Promise<void> {
  await Promise.all(
    staged.map(async (write) => {
      try {
        await unlink(write.temp_file_path);
      } catch (error) {
        if (!isNodeError(error) || error.code !== "ENOENT") {
          throw error;
        }
      }
    })
  );
}

async function hashExistingFile(filePath: string): Promise<string> {
  try {
    return contentHashForText(await readFile(filePath, "utf8"));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
