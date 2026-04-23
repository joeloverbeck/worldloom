import { existsSync } from "node:fs";
import path from "node:path";

import { emitAdditionalContext, readHookInput, type SubagentStartInput } from "./lib/hook-io";
import { logDecision } from "./lib/logging";
import { resolveRepoRoot } from "./lib/pathing";

function buildAdditionalContext(cwd?: string): string {
  const repoRoot = resolveRepoRoot(cwd);
  const hasWorldMcpPackage = existsSync(path.join(repoRoot, "tools", "world-mcp", "package.json"));

  if (hasWorldMcpPackage) {
    return [
      "Worldloom localization subagent discipline:",
      "1. Search exact ids first (CF-NNNN, CH-NNNN, PA-NNNN, M-N, DA-NNNN, CHAR-NNNN, PR-NNNN, BATCH-NNNN, AU-NNNN, RP-NNNN).",
      "2. Search exact entity names second.",
      "3. Match heading paths third.",
      "4. Expand backlinks or dependencies fourth.",
      "5. Use lexical search fifth; never semantic-only.",
      "Preferred tool order: mcp__worldloom__search_nodes, then mcp__worldloom__get_node, then mcp__worldloom__get_neighbors.",
      "Avoid wholesale reads of large world files. Return node ids and structured evidence bundles unless prose is explicitly requested."
    ].join("\n");
  }

  return [
    "Worldloom localization subagent discipline:",
    "Use grep or exact-id search first, then targeted reads.",
    "Do not open large world files wholesale.",
    "Return node ids, file paths, and evidence excerpts rather than narrative summaries unless prose is explicitly requested."
  ].join("\n");
}

async function main(): Promise<void> {
  const input = await readHookInput<SubagentStartInput>();
  const additionalContext = buildAdditionalContext(input.cwd);
  emitAdditionalContext("SubagentStart", additionalContext);
  logDecision("info", "hook4-subagent-localization", {
    agent_id: input.agent_id ?? null,
    agent_type: input.agent_type ?? null
  }, input.cwd);
}

main().catch((error) => {
  logDecision("error", "hook4-subagent-localization", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
