import type { FastifyInstance } from "fastify";

import { readSearch, type SearchReadOptions } from "../../read/search.js";
import { SEARCH_DOMAINS, SEARCH_RESULT_KINDS, type SearchDomain, type SearchResultKind } from "../../view-models/search-hit.js";
import { invalidRouteParam, isValidRouteSlug } from "./params.js";

export interface SearchRouteOptions {
  repoRoot: string;
}

interface SearchQuery {
  q?: string;
  kinds?: string;
  domains?: string;
  groupBy?: string;
  limit?: string;
  offset?: string;
}

function invalidInput(message: string, field: string): Record<string, string> {
  return {
    error: "invalid_input",
    message,
    field,
  };
}

function parseNonNegativeInteger(value: string | undefined): number | null {
  if (value === undefined) {
    return 0;
  }
  if (!/^[0-9]+$/.test(value)) {
    return null;
  }
  return Number(value);
}

function splitCsv(value: string | undefined): string[] {
  if (value === undefined || value.trim() === "") {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

const RESULT_KIND_SET = new Set<string>(SEARCH_RESULT_KINDS);
const DOMAIN_SET = new Set<string>(SEARCH_DOMAINS);

function parseKinds(value: string | undefined): SearchResultKind[] | null {
  const parts = splitCsv(value);
  if (parts.some((part) => !RESULT_KIND_SET.has(part))) {
    return null;
  }
  return parts as SearchResultKind[];
}

function parseDomains(value: string | undefined): SearchDomain[] | null {
  const parts = splitCsv(value);
  if (parts.some((part) => !DOMAIN_SET.has(part))) {
    return null;
  }
  return parts as SearchDomain[];
}

export async function registerSearchRoute(server: FastifyInstance, options: SearchRouteOptions): Promise<void> {
  server.get<{
    Params: { slug: string; storySlug: string };
    Querystring: SearchQuery;
  }>("/api/worlds/:slug/stories/:storySlug/search", async (request, reply) => {
    // Reject path params that are not plain slugs before they reach any file
    // path (defense in depth is also enforced in src/read/search.ts).
    if (!isValidRouteSlug(request.params.slug)) {
      return reply.code(400).send(invalidRouteParam("slug", request.params.slug, "a lowercase world slug"));
    }
    if (!isValidRouteSlug(request.params.storySlug)) {
      return reply.code(400).send(invalidRouteParam("storySlug", request.params.storySlug, "a lowercase story slug"));
    }

    const query = request.query;
    if (query.q === undefined || query.q.trim() === "") {
      return reply.code(400).send(invalidInput("Search query parameter q is required.", "q"));
    }

    const limit = parseNonNegativeInteger(query.limit);
    if (limit === null) {
      return reply.code(400).send(invalidInput("Search query parameter limit must be a non-negative integer.", "limit"));
    }

    const offset = parseNonNegativeInteger(query.offset);
    if (offset === null) {
      return reply.code(400).send(invalidInput("Search query parameter offset must be a non-negative integer.", "offset"));
    }

    const kinds = parseKinds(query.kinds);
    if (kinds === null) {
      return reply.code(400).send(invalidInput("Search query parameter kinds contains an unknown result kind.", "kinds"));
    }

    const domains = parseDomains(query.domains);
    if (domains === null) {
      return reply.code(400).send(invalidInput("Search query parameter domains contains an unknown domain.", "domains"));
    }

    if (query.groupBy !== undefined && query.groupBy !== "scene_or_unscened_range") {
      return reply
        .code(400)
        .send(invalidInput("Search query parameter groupBy must be scene_or_unscened_range.", "groupBy"));
    }

    const readOptions: SearchReadOptions = {
      kinds,
      domains,
      limit,
      offset,
    };

    return readSearch(request.params.slug, request.params.storySlug, query.q, readOptions, options.repoRoot);
  });
}
