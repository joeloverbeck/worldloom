// Prompt HTTP routes.
//
// SPEC-102 §4 Files to touch — four endpoints under
// /api/worlds/:slug/manual-stories/:msSlug/...:
//
//   POST   .../prompts/preview     — compose + lint, no write
//   POST   .../prompts             — compose + lint + write (with optional
//                                     lint_override for soft-finding saves)
//   GET    .../prompts             — list saved prompts (id / created_at /
//                                     directive snippet)
//   GET    .../prompts/:promptId   — read one saved prompt + sidecar
//
// Write routes register inside wrapRouterWritable; the preview route is a
// pure compose with no side effects and lives in the read-routes group.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { FastifyInstance, FastifyReply } from "fastify";

import YAML from "yaml";

import { composePrompt } from "../../prompt/compose.js";
import type {
  PromptComposeInput,
  PromptComposeResult,
  PromptLintFinding,
  PromptRunSidecar,
} from "../../prompt/types.js";
import { listSegments, readSegmentSidecar } from "../../read/segments.js";
import { err, ok, type ReadResult } from "../../read/result.js";
import { writePrompt } from "../../write/prompts.js";
import {
  resolveManualStoryRoot,
  type ManualStoryRoot,
} from "../../write/sandbox.js";
import { blockIfHealthDisallows } from "../health-gate.js";
import { mapReadErrorToHttpReply } from "../read-error-http.js";

export interface PromptsRouteOptions {
  repoRoot: string;
}

interface ComposeBody {
  moment_directive?: string;
  included_cast?: string[];
  included_records?: string[];
  // SPEC-102 path-shaped internal composer input. Accepted directly for
  // back-compat with the landed SPEC-102 callers.
  included_template_path?: string | null;
  // SPEC-104 ID-shaped public API. The routes layer resolves the ID to
  // <manualStoryRoot>/records/beat-templates/<id>.yaml and populates
  // included_template_path internally. Mutually exclusive with
  // included_template_path on a single request.
  selected_template?: string | null;
}

interface SaveBody extends ComposeBody {
  lint_override?: {
    findings: PromptLintFinding[];
    copied_anyway_at: string;
  };
}

function resolveRootOrNull(
  repoRoot: string,
  worldSlug: string,
  msSlug: string,
): ManualStoryRoot | null {
  try {
    const root = resolveManualStoryRoot(repoRoot, worldSlug, msSlug);
    if (!existsSync(root.absolutePath)) return null;
    return root;
  } catch {
    return null;
  }
}

function badRequest(reply: FastifyReply, message: string): FastifyReply {
  return reply.code(400).send({ error: "invalid_input", message });
}

function resolveBeatTemplatePath(
  manualStoryRoot: string,
  templateId: string,
): string {
  return path.join(
    manualStoryRoot,
    "records",
    "beat-templates",
    `${templateId}.yaml`,
  );
}

function buildComposeInput(
  root: ManualStoryRoot,
  repoRoot: string,
  body: ComposeBody,
): PromptComposeInput | { error: string; code?: "not_found" } {
  if (
    !body ||
    typeof body !== "object" ||
    typeof body.moment_directive !== "string"
  ) {
    return { error: "moment_directive required" };
  }
  const built: PromptComposeInput = {
    manualStoryRoot: root.absolutePath,
    repoRoot,
    moment_directive: body.moment_directive,
    included_cast: Array.isArray(body.included_cast) ? body.included_cast : [],
    included_records: Array.isArray(body.included_records)
      ? body.included_records
      : [],
  };

  const pathProvided =
    typeof body.included_template_path === "string" &&
    body.included_template_path.length > 0;
  const idProvided =
    typeof body.selected_template === "string" &&
    body.selected_template.length > 0;
  if (pathProvided && idProvided) {
    return {
      error:
        "Pass exactly one of selected_template or included_template_path; both received",
    };
  }
  if (pathProvided) {
    built.included_template_path = body.included_template_path as string;
  } else if (idProvided) {
    const id = body.selected_template as string;
    const resolved = resolveBeatTemplatePath(root.absolutePath, id);
    if (!existsSync(resolved)) {
      return { error: `Beat template ${id} not found`, code: "not_found" };
    }
    built.included_template_path = resolved;
  }
  return built;
}

function snippet(text: string, maxLen = 120): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > maxLen
    ? `${oneLine.slice(0, maxLen - 1)}…`
    : oneLine;
}

// Convert the stored absolute or repo-relative template path back to its
// mtemplate-N id so PromptHistory can display the template the author
// used without a second lookup.
function deriveTemplateIdFromPath(p: string | null): string | null {
  if (!p) return null;
  const m = /(mtemplate-\d+)\.yaml$/.exec(p);
  return m ? m[1] ?? null : null;
}

function linkedSegmentsByPrompt(manualStoryRoot: string): ReadResult<Map<string, string[]>> {
  const byPrompt = new Map<string, string[]>();
  const segments = listSegments({ manualStoryRoot });
  if (!segments.ok) return err(segments.error);
  for (const segment of segments.value) {
    const sidecar = readSegmentSidecar({
      manualStoryRoot,
      segmentId: segment.id,
    });
    if (!sidecar.ok) return err(sidecar.error);
    if (!sidecar.value.prompt_id) continue;
    const existing = byPrompt.get(sidecar.value.prompt_id) ?? [];
    existing.push(segment.id);
    byPrompt.set(sidecar.value.prompt_id, existing);
  }
  return ok(byPrompt);
}

export async function registerPromptsReadRoutes(
  server: FastifyInstance,
  options: PromptsRouteOptions,
): Promise<void> {
  server.post<{
    Params: { slug: string; msSlug: string };
    Body: ComposeBody;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/prompts/preview",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "manual_story_not_found" });
      const built = buildComposeInput(root, options.repoRoot, request.body ?? {});
      if ("error" in built) {
        if (built.code === "not_found") {
          return reply.code(404).send({ error: "template_not_found", message: built.error });
        }
        return badRequest(reply, built.error);
      }
      const blocked = blockIfHealthDisallows(
        reply,
        root.absolutePath,
        "prompt_copy",
      );
      if (blocked) return blocked;
      const result = await composePrompt(built);
      return result;
    },
  );

  server.get<{
    Params: { slug: string; msSlug: string };
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/prompts",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "manual_story_not_found" });
      const promptRunsDir = path.join(root.absolutePath, "prompt-runs");
      if (!existsSync(promptRunsDir)) return { prompts: [] };
      const entries = readdirSync(promptRunsDir);
      const linkedByPrompt = linkedSegmentsByPrompt(root.absolutePath);
      if (!linkedByPrompt.ok) {
        return mapReadErrorToHttpReply(reply, linkedByPrompt.error);
      }
      const prompts: Array<{
        id: string;
        created_at: string;
        moment_directive_snippet: string;
        linked_segments: string[];
        selected_template: string | null;
      }> = [];
      for (const name of entries) {
        if (!/^PROMPT-\d+\.yaml$/.test(name)) continue;
        try {
          const text = readFileSync(path.join(promptRunsDir, name), "utf8");
          const sidecar = YAML.parse(text) as PromptRunSidecar;
          prompts.push({
            id: sidecar.id,
            created_at: sidecar.created_at,
            moment_directive_snippet: snippet(sidecar.moment_directive ?? ""),
            linked_segments: linkedByPrompt.value.get(sidecar.id) ?? [],
            selected_template: deriveTemplateIdFromPath(
              sidecar.included_template_path ?? null,
            ),
          });
        } catch {
          // skip malformed sidecars
        }
      }
      prompts.sort((a, b) => {
        const an = Number(/-(\d+)$/.exec(a.id)?.[1] ?? "0");
        const bn = Number(/-(\d+)$/.exec(b.id)?.[1] ?? "0");
        return an - bn;
      });
      return { prompts };
    },
  );

  server.get<{
    Params: { slug: string; msSlug: string; promptId: string };
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/prompts/:promptId",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "manual_story_not_found" });
      const id = request.params.promptId;
      if (!/^PROMPT-\d+$/.test(id)) {
        return reply.code(400).send({ error: "invalid_input", message: "bad prompt id" });
      }
      const mdPath = path.join(root.absolutePath, "prompts", `${id}.md`);
      const sidecarPath = path.join(
        root.absolutePath,
        "prompt-runs",
        `${id}.yaml`,
      );
      if (!existsSync(mdPath) || !existsSync(sidecarPath)) {
        return reply.code(404).send({ error: "prompt_not_found" });
      }
      const markdown = readFileSync(mdPath, "utf8");
      const sidecar = YAML.parse(readFileSync(sidecarPath, "utf8")) as PromptRunSidecar;
      return { markdown, sidecar };
    },
  );
}

export async function registerPromptsWriteRoutes(
  server: FastifyInstance,
  options: PromptsRouteOptions,
): Promise<void> {
  server.post<{
    Params: { slug: string; msSlug: string };
    Body: SaveBody;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/prompts",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "manual_story_not_found" });
      const body = (request.body ?? {}) as SaveBody;
      const built = buildComposeInput(root, options.repoRoot, body);
      if ("error" in built) {
        if (built.code === "not_found") {
          return reply.code(404).send({ error: "template_not_found", message: built.error });
        }
        return badRequest(reply, built.error);
      }
      const blocked = blockIfHealthDisallows(
        reply,
        root.absolutePath,
        "prompt_save",
      );
      if (blocked) return blocked;
      const result: PromptComposeResult = await composePrompt(built);
      if (result.lint.blockingForCopy && !body.lint_override) {
        return reply.code(409).send({
          error: "lint_blocks_save",
          findings: result.lint.findings,
        });
      }
      const saved = writePrompt(
        body.lint_override
          ? { root, composeResult: result, lint_override: body.lint_override }
          : { root, composeResult: result },
      );
      return reply.code(201).send({
        id: saved.id,
        markdown_path: saved.markdown_path,
        sidecar_path: saved.sidecar_path,
        sidecar: saved.sidecar,
        lint: result.lint,
      });
    },
  );
}
