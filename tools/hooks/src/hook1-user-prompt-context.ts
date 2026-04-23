import { detectWorldSlug } from "./lib/detect-world";
import { emitAdditionalContext, readHookInput, type UserPromptSubmitInput } from "./lib/hook-io";
import {
  detectNamedEntitiesFromPrompt,
  findRelevantNodeIds,
  readProtectedFileWarnings,
  readWorldSummary
} from "./lib/index-query";
import { logDecision } from "./lib/logging";

async function main(): Promise<void> {
  const input = await readHookInput<UserPromptSubmitInput>();
  const prompt = input.prompt ?? "";
  const worldSlug = detectWorldSlug(prompt, input.cwd);

  if (worldSlug === null) {
    return;
  }

  const summary = readWorldSummary(worldSlug, input.cwd);
  const entities = detectNamedEntitiesFromPrompt(worldSlug, prompt, input.cwd).map(
    (match) => match.canonical_name
  );
  const nodeIds = findRelevantNodeIds(worldSlug, prompt, input.cwd);
  const warnings = readProtectedFileWarnings(worldSlug, prompt, input.cwd);

  const lines: string[] = [];
  if (summary !== null) {
    lines.push(
      `Worldloom context: world=${worldSlug} (${summary.topLevelFileCount} top-level files, ${summary.totalLines} lines total).`
    );
  } else {
    lines.push(`Worldloom context: world=${worldSlug}.`);
  }

  if (entities.length > 0) {
    lines.push(`Named entities detected: ${entities.join(", ")}.`);
  }

  if (nodeIds.length > 0) {
    lines.push(`Top relevant nodes: ${nodeIds.join(", ")}.`);
  }

  if (warnings.length > 0) {
    lines.push(`Size warnings: ${warnings.join(" ")}`);
  }

  const additionalContext = lines.join("\n");
  emitAdditionalContext("UserPromptSubmit", additionalContext);
  logDecision("info", "hook1-user-prompt-context", {
    world_slug: worldSlug,
    named_entities: entities,
    node_ids: nodeIds,
    warnings
  }, input.cwd);
}

main().catch((error) => {
  logDecision("error", "hook1-user-prompt-context", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
