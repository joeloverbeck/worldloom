import { readFileSync } from "node:fs";

export interface HookEnvelope {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
}

export interface UserPromptSubmitInput extends HookEnvelope {
  hook_event_name: "UserPromptSubmit";
  prompt?: string;
}

export interface PreToolUseReadInput extends HookEnvelope {
  hook_event_name: "PreToolUse";
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    offset?: number;
    limit?: number;
  };
}

export interface SubagentStartInput extends HookEnvelope {
  hook_event_name: "SubagentStart";
  agent_id?: string;
  agent_type?: string;
}

export function readHookInput<T extends HookEnvelope>(): Promise<T> {
  const chunks: Buffer[] = [];

  process.stdin.on("data", (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  return new Promise<T>((resolve, reject) => {
    process.stdin.on("end", () => {
      try {
        const source = Buffer.concat(chunks).toString("utf8").trim();
        resolve((source.length === 0 ? {} : JSON.parse(source)) as T);
      } catch (error) {
        reject(error);
      }
    });

    process.stdin.on("error", reject);
  });
}

export function emitAdditionalContext(hookEventName: string, additionalContext: string): void {
  if (additionalContext.trim().length === 0) {
    return;
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName,
        additionalContext
      }
    })
  );
}

export function emitPermissionDecision(
  decision: "allow" | "deny" | "ask",
  reason: string
): void {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: decision,
        permissionDecisionReason: reason
      }
    })
  );
}

export function tailContainsToken(transcriptPath: string | undefined, token: string): boolean {
  if (transcriptPath === undefined) {
    return false;
  }

  try {
    const contents = readFileSync(transcriptPath, "utf8");
    const tail = contents.slice(-65536);
    return tail.includes(token);
  } catch {
    return false;
  }
}
