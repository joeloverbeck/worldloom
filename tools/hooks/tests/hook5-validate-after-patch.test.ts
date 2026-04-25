import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createTempRepoRoot,
  destroyTempRepoRoot,
  runCompiledHook
} from "./_shared";

interface FakeRunPayload {
  verdicts: Array<{
    validator: string;
    severity: "fail" | "warn" | "info";
    code: string;
    message: string;
    location: { file?: string; node_id?: string };
  }>;
  summary?: { fail_count: number };
}

function installFakeValidatorCli(
  repoRoot: string,
  payloadByWorld: Record<string, FakeRunPayload>,
  exitCode = 0
): void {
  const cliDir = path.join(repoRoot, "tools", "validators", "dist", "src", "cli");
  mkdirSync(cliDir, { recursive: true });
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
const slug = args[0];
const payloads = ${JSON.stringify(payloadByWorld)};
const payload = payloads[slug] || { verdicts: [], summary: { fail_count: 0 } };
process.stdout.write(JSON.stringify(payload));
process.exit(${exitCode});
`;
  const cliPath = path.join(cliDir, "world-validate.js");
  writeFileSync(cliPath, script, { mode: 0o755 });
}

function patchReceiptResponse(filePaths: string[]): unknown {
  const receipt = {
    plan_id: "plan-test",
    applied_at: new Date().toISOString(),
    files_written: filePaths.map((file_path) => ({
      file_path,
      prior_hash: "",
      new_hash: "",
      ops_applied: 1
    })),
    new_nodes: [],
    id_allocations_consumed: {},
    index_sync_duration_ms: 1
  };
  return {
    structuredContent: receipt,
    content: [{ type: "text", text: JSON.stringify(receipt) }]
  };
}

test("hook5 ignores tool calls that aren't submit_patch_plan", () => {
  const root = createTempRepoRoot();

  try {
    const result = runCompiledHook(
      "hook5-validate-after-patch.js",
      {
        hook_event_name: "PostToolUse",
        cwd: root,
        tool_name: "Read",
        tool_response: {}
      },
      { cwd: root, projectDir: root }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook5 passes through silently when validator CLI is missing", () => {
  const root = createTempRepoRoot();

  try {
    const result = runCompiledHook(
      "hook5-validate-after-patch.js",
      {
        hook_event_name: "PostToolUse",
        cwd: root,
        tool_name: "mcp__worldloom__submit_patch_plan",
        tool_response: patchReceiptResponse([
          path.join(root, "worlds", "animalia", "_source", "canon", "CF-0042.yaml")
        ])
      },
      { cwd: root, projectDir: root }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook5 stays silent when validator returns no relevant failures", () => {
  const root = createTempRepoRoot();
  installFakeValidatorCli(root, {
    animalia: { verdicts: [], summary: { fail_count: 0 } }
  });

  try {
    const result = runCompiledHook(
      "hook5-validate-after-patch.js",
      {
        hook_event_name: "PostToolUse",
        cwd: root,
        tool_name: "mcp__worldloom__submit_patch_plan",
        tool_response: patchReceiptResponse([
          path.join(root, "worlds", "animalia", "_source", "canon", "CF-0042.yaml")
        ])
      },
      { cwd: root, projectDir: root }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook5 emits a system reminder when structural failures touch a written file", () => {
  const root = createTempRepoRoot();
  installFakeValidatorCli(
    root,
    {
      animalia: {
        verdicts: [
          {
            validator: "record_schema_compliance",
            severity: "fail",
            code: "record.missing_required_field",
            message: "Field 'fact_type' is missing.",
            location: {
              file: "_source/canon/CF-0042.yaml",
              node_id: "CF-0042"
            }
          }
        ],
        summary: { fail_count: 1 }
      }
    },
    1
  );

  try {
    const result = runCompiledHook(
      "hook5-validate-after-patch.js",
      {
        hook_event_name: "PostToolUse",
        cwd: root,
        tool_name: "mcp__worldloom__submit_patch_plan",
        tool_response: patchReceiptResponse([
          path.join(root, "worlds", "animalia", "_source", "canon", "CF-0042.yaml")
        ])
      },
      { cwd: root, projectDir: root }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"hookEventName":"PostToolUse"/);
    assert.match(result.stdout, /<system-reminder>/);
    assert.match(result.stdout, /record_schema_compliance/);
    assert.match(result.stdout, /CF-0042\.yaml/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook5 ignores verdicts on files not in the receipt", () => {
  const root = createTempRepoRoot();
  installFakeValidatorCli(
    root,
    {
      animalia: {
        verdicts: [
          {
            validator: "record_schema_compliance",
            severity: "fail",
            code: "record.missing_required_field",
            message: "Pre-existing failure on a different file.",
            location: { file: "_source/canon/CF-9999.yaml" }
          }
        ],
        summary: { fail_count: 1 }
      }
    },
    1
  );

  try {
    const result = runCompiledHook(
      "hook5-validate-after-patch.js",
      {
        hook_event_name: "PostToolUse",
        cwd: root,
        tool_name: "mcp__worldloom__submit_patch_plan",
        tool_response: patchReceiptResponse([
          path.join(root, "worlds", "animalia", "_source", "canon", "CF-0042.yaml")
        ])
      },
      { cwd: root, projectDir: root }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook5 only surfaces the four spec-listed validators", () => {
  const root = createTempRepoRoot();
  installFakeValidatorCli(
    root,
    {
      animalia: {
        verdicts: [
          {
            validator: "yaml_parse_integrity",
            severity: "fail",
            code: "yaml.parse_error",
            message: "Out-of-scope validator (per spec, hook5 surfaces 4 validators).",
            location: { file: "_source/canon/CF-0042.yaml" }
          },
          {
            validator: "id_uniqueness",
            severity: "fail",
            code: "id.duplicate",
            message: "Duplicate id detected.",
            location: { file: "_source/canon/CF-0042.yaml" }
          }
        ],
        summary: { fail_count: 2 }
      }
    },
    1
  );

  try {
    const result = runCompiledHook(
      "hook5-validate-after-patch.js",
      {
        hook_event_name: "PostToolUse",
        cwd: root,
        tool_name: "mcp__worldloom__submit_patch_plan",
        tool_response: patchReceiptResponse([
          path.join(root, "worlds", "animalia", "_source", "canon", "CF-0042.yaml")
        ])
      },
      { cwd: root, projectDir: root }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /id_uniqueness/);
    assert.doesNotMatch(result.stdout, /yaml_parse_integrity/);
  } finally {
    destroyTempRepoRoot(root);
  }
});
