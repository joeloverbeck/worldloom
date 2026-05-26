type RouteOptions = {
  method?: string | string[];
  url?: string;
  path?: string;
};

type RouteRegistrar = (...args: any[]) => unknown;

type ReadOnlyRouter = Record<string, any> & {
  route?: RouteRegistrar;
  addRoute?: RouteRegistrar;
};

const ROUTE_METHODS = [
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
] as const;

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);

function normalizeMethods(method: unknown): string[] {
  if (Array.isArray(method)) {
    return method.flatMap((entry) => normalizeMethods(entry));
  }

  if (typeof method !== "string") {
    return [];
  }

  return [method.toUpperCase()];
}

function pathFromOptions(options: RouteOptions): string {
  return options.url ?? options.path ?? "<unknown>";
}

function assertGetOnly(method: unknown, routePath: string): void {
  for (const normalized of normalizeMethods(method)) {
    if (WRITE_METHODS.has(normalized) || normalized !== "GET") {
      throw new Error(`read-only fence violation: ${normalized} ${routePath}`);
    }
  }
}

function routeOptionsFromArgs(args: unknown[]): RouteOptions | null {
  const [first, second] = args;

  if (typeof first === "object" && first !== null && ("method" in first || "url" in first || "path" in first)) {
    return first as RouteOptions;
  }

  if (typeof first === "string" && typeof second === "string") {
    return { method: first, url: second };
  }

  return null;
}

function wrapRouteFunction(original: RouteRegistrar): RouteRegistrar {
  return function guardedRoute(this: unknown, ...args: unknown[]): unknown {
    const options = routeOptionsFromArgs(args);
    if (options) {
      assertGetOnly(options.method, pathFromOptions(options));
    }

    return original.apply(this, args);
  };
}

function wrapMethodFunction(method: string, original: RouteRegistrar): RouteRegistrar {
  return function guardedMethod(this: unknown, ...args: unknown[]): unknown {
    const [routePath] = args;
    assertGetOnly(method, typeof routePath === "string" ? routePath : "<unknown>");
    return original.apply(this, args);
  };
}

export function wrapRouterReadOnly<T extends ReadOnlyRouter>(router: T): T {
  const mutableRouter = router as Record<string, unknown>;

  if (typeof router.route === "function") {
    router.route = wrapRouteFunction(router.route);
  }

  if (typeof router.addRoute === "function") {
    router.addRoute = wrapRouteFunction(router.addRoute);
  }

  for (const method of ROUTE_METHODS) {
    if (typeof mutableRouter[method] === "function") {
      mutableRouter[method] = wrapMethodFunction(method.toUpperCase(), mutableRouter[method] as RouteRegistrar);
    }
  }

  return router;
}
