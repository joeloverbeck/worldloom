import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";

import { createTempRepoRoot, destroyTempRepoRoot } from "../tools/_shared";

test("stdio server entrypoint stays alive as a child process until stdin closes", async () => {
  const root = createTempRepoRoot();
  const child = spawn(
    "node",
    [path.join("/home/joeloverbeck/projects/worldloom", "tools", "world-mcp", "dist", "src", "server.js")],
    {
      cwd: path.join(root, "tools", "world-mcp"),
      stdio: ["pipe", "pipe", "pipe"]
    }
  );

  const stderr: string[] = [];
  child.stderr.on("data", (chunk) => {
    stderr.push(String(chunk));
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 250));

    assert.equal(child.exitCode, null);
    assert.equal(stderr.join(""), "");

    child.kill("SIGTERM");

    const closeResult = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
      child.once("close", (code, signal) => resolve({ code, signal }));
      child.once("error", reject);
    });

    assert.ok(closeResult.code === 0 || closeResult.signal === "SIGTERM");
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
    }
    destroyTempRepoRoot(root);
  }
});
