#!/usr/bin/env node

import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const packageRoot = path.resolve(import.meta.dirname, "..");
const testsRoot = path.join(packageRoot, "dist", "tests");
const cliTestBasenames = new Set([
  "cli-world-root.test.js",
  "cli-init.test.js",
  "cli-smoke.test.js"
]);

const allTests = listTests(testsRoot);
const cliTests = allTests.filter((file) => cliTestBasenames.has(path.basename(file)));
const nonCliTests = allTests.filter((file) => !cliTestBasenames.has(path.basename(file)));

if (cliTests.length !== cliTestBasenames.size) {
  const found = new Set(cliTests.map((file) => path.basename(file)));
  const missing = [...cliTestBasenames].filter((name) => !found.has(name));
  console.error(`Missing compiled CLI test(s): ${missing.join(", ")}`);
  process.exit(1);
}

runNodeTest("non-CLI compiled tests", nonCliTests);
for (const testFile of cliTests) {
  runNodeTest(`serial CLI compiled test: ${path.relative(packageRoot, testFile)}`, [testFile]);
}

function listTests(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTests(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".test.js")) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function runNodeTest(label, files) {
  if (files.length === 0) {
    return;
  }

  console.log(`=== ${label} ===`);
  const result = spawnSync(process.execPath, ["--test", ...files], {
    cwd: packageRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  if (result.signal !== null) {
    console.error(`node --test exited from signal ${result.signal}`);
    process.exit(1);
  }
}
