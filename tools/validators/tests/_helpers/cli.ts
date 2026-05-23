import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const worldValidateCliPath = path.resolve(import.meta.dirname, "../../src/cli/world-validate.js");

export interface CheckedRun {
  command: string;
  args: string[];
  cwd: string;
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

export interface CheckedSpawnOptions {
  cwd?: string;
  expectedStatus?: number;
}

export function runWorldValidate(args: string[], options: CheckedSpawnOptions = {}): CheckedRun {
  return runChecked(process.execPath, [worldValidateCliPath, ...args], options);
}

export function runChecked(command: string, args: string[], options: CheckedSpawnOptions = {}): CheckedRun {
  const cwd = options.cwd ?? process.cwd();
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  const run: CheckedRun = {
    command,
    args,
    cwd,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr
  };
  if (result.error) {
    run.error = result.error;
  }

  assertNoSpawnError(run);
  if (options.expectedStatus !== undefined) {
    assertExitStatus(run, options.expectedStatus);
  }
  return run;
}

export function execChecked(command: string, args: string[], options: CheckedSpawnOptions = {}): string {
  return runChecked(command, args, { ...options, expectedStatus: options.expectedStatus ?? 0 }).stdout.trim();
}

export function assertExitStatus(run: CheckedRun, expectedStatus: number): void {
  assertNoSpawnError(run);
  assert.equal(run.status, expectedStatus, formatRun(run));
}

export function parseJsonOutput<T>(run: CheckedRun, stream: "stdout" | "stderr" = "stdout"): T {
  assertNoSpawnError(run);
  const output = run[stream];
  assert.notEqual(output.trim(), "", `Expected nonempty ${stream} before JSON parse.\n${formatRun(run)}`);
  try {
    return JSON.parse(output) as T;
  } catch (error) {
    assert.fail(`Failed to parse ${stream} as JSON: ${error instanceof Error ? error.message : String(error)}\n${formatRun(run)}`);
  }
}

function assertNoSpawnError(run: CheckedRun): void {
  if (run.error) {
    assert.fail(`Child process failed to launch: ${run.error.message}\n${formatRun(run)}`);
  }
}

function formatRun(run: CheckedRun): string {
  return [
    `command: ${[run.command, ...run.args].join(" ")}`,
    `cwd: ${run.cwd}`,
    `status: ${String(run.status)}`,
    `signal: ${String(run.signal)}`,
    `error: ${run.error?.message ?? "<none>"}`,
    `stdout:\n${run.stdout || "<empty>"}`,
    `stderr:\n${run.stderr || "<empty>"}`
  ].join("\n");
}
