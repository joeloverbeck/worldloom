type RouteOptions = {
  method?: string | string[];
  url?: string;
  path?: string;
};

type RouteRegistrar = (...args: any[]) => unknown;

type WritableRouter = Record<string, any> & {
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

const READ_METHODS = new Set(["GET", "HEAD"]);
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

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

function assertReadOrInsideScope(
  method: unknown,
  routePath: string,
  insideScope: { value: boolean },
): void {
  for (const normalized of normalizeMethods(method)) {
    if (READ_METHODS.has(normalized)) {
      continue;
    }
    if (WRITE_METHODS.has(normalized) && !insideScope.value) {
      throw new Error(`write-scope fence violation: ${normalized} ${routePath}`);
    }
  }
}

function routeOptionsFromArgs(args: unknown[]): RouteOptions | null {
  const [first, second] = args;

  if (
    typeof first === "object" &&
    first !== null &&
    ("method" in first || "url" in first || "path" in first)
  ) {
    return first as RouteOptions;
  }

  if (typeof first === "string" && typeof second === "string") {
    return { method: first, url: second };
  }

  return null;
}

function wrapRouteFunction(
  original: RouteRegistrar,
  insideScope: { value: boolean },
): RouteRegistrar {
  return function guardedRoute(this: unknown, ...args: unknown[]): unknown {
    const options = routeOptionsFromArgs(args);
    if (options) {
      assertReadOrInsideScope(options.method, pathFromOptions(options), insideScope);
    }

    return original.apply(this, args);
  };
}

function wrapMethodFunction(
  method: string,
  original: RouteRegistrar,
  insideScope: { value: boolean },
): RouteRegistrar {
  return function guardedMethod(this: unknown, ...args: unknown[]): unknown {
    const [routePath] = args;
    assertReadOrInsideScope(
      method,
      typeof routePath === "string" ? routePath : "<unknown>",
      insideScope,
    );
    return original.apply(this, args);
  };
}

interface GuardedRouterState<T extends WritableRouter> {
  readonly router: T;
  readonly insideScope: { value: boolean };
}

const GUARD_STATE = new WeakMap<object, GuardedRouterState<WritableRouter>>();

function installGuard<T extends WritableRouter>(router: T): GuardedRouterState<T> {
  const existing = GUARD_STATE.get(router as object);
  if (existing) {
    return existing as GuardedRouterState<T>;
  }

  const insideScope = { value: false };
  const mutableRouter = router as Record<string, unknown>;

  if (typeof router.route === "function") {
    router.route = wrapRouteFunction(router.route, insideScope);
  }

  if (typeof router.addRoute === "function") {
    router.addRoute = wrapRouteFunction(router.addRoute, insideScope);
  }

  for (const method of ROUTE_METHODS) {
    if (typeof mutableRouter[method] === "function") {
      mutableRouter[method] = wrapMethodFunction(
        method.toUpperCase(),
        mutableRouter[method] as RouteRegistrar,
        insideScope,
      );
    }
  }

  const state: GuardedRouterState<T> = { router, insideScope };
  GUARD_STATE.set(router as object, state);
  return state;
}

export function wrapRouterWritable<T extends WritableRouter>(
  router: T,
  register: (writableRouter: T) => void | Promise<void>,
): void | Promise<void> {
  const state = installGuard(router);
  state.insideScope.value = true;

  let result: void | Promise<void>;
  try {
    result = register(router);
  } catch (error) {
    state.insideScope.value = false;
    throw error;
  }

  if (result && typeof (result as Promise<void>).then === "function") {
    return (result as Promise<void>).finally(() => {
      state.insideScope.value = false;
    });
  }

  state.insideScope.value = false;
  return result;
}
