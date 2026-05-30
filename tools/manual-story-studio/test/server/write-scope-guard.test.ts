import assert from "node:assert/strict";
import test from "node:test";

import { wrapRouterWritable } from "../../src/server/write-scope-guard.js";

interface RecordedRoute {
  method: string;
  path: string;
}

interface StubRouter {
  routes: RecordedRoute[];
  route: (options: { method?: string | string[]; url?: string; path?: string }) => void;
  addRoute: (options: { method?: string | string[]; url?: string; path?: string }) => void;
  get: (path: string, handler?: unknown) => void;
  head: (path: string, handler?: unknown) => void;
  post: (path: string, handler?: unknown) => void;
  put: (path: string, handler?: unknown) => void;
  patch: (path: string, handler?: unknown) => void;
  delete: (path: string, handler?: unknown) => void;
  options: (path: string, handler?: unknown) => void;
}

function createStubRouter(): StubRouter {
  const routes: RecordedRoute[] = [];
  const recordMethod = (method: string) => (path: string) => {
    routes.push({ method, path });
  };
  return {
    routes,
    route(options) {
      const method = Array.isArray(options.method) ? options.method[0] : options.method;
      routes.push({
        method: (method ?? "<unknown>").toUpperCase(),
        path: options.url ?? options.path ?? "<unknown>",
      });
    },
    addRoute(options) {
      const method = Array.isArray(options.method) ? options.method[0] : options.method;
      routes.push({
        method: (method ?? "<unknown>").toUpperCase(),
        path: options.url ?? options.path ?? "<unknown>",
      });
    },
    get: recordMethod("GET"),
    head: recordMethod("HEAD"),
    post: recordMethod("POST"),
    put: recordMethod("PUT"),
    patch: recordMethod("PATCH"),
    delete: recordMethod("DELETE"),
    options: recordMethod("OPTIONS"),
  };
}

test("POST registration outside wrapRouterWritable throws at registration time", () => {
  const stub = createStubRouter();
  // Install the guard via a no-op wrap so the method functions are intercepted.
  wrapRouterWritable(stub, () => {});

  assert.throws(
    () => stub.post("/api/x", () => {}),
    /write-scope fence violation: POST \/api\/x/,
  );
});

test("POST registration inside wrapRouterWritable succeeds", () => {
  const stub = createStubRouter();
  wrapRouterWritable(stub, (writable) => {
    writable.post("/api/x", () => {});
  });

  assert.equal(stub.routes.filter((r) => r.method === "POST" && r.path === "/api/x").length, 1);
});

test("PUT / PATCH / DELETE registrations outside wrapRouterWritable throw", () => {
  const stub = createStubRouter();
  wrapRouterWritable(stub, () => {});

  assert.throws(() => stub.put("/api/y", () => {}), /write-scope fence violation: PUT \/api\/y/);
  assert.throws(
    () => stub.patch("/api/z", () => {}),
    /write-scope fence violation: PATCH \/api\/z/,
  );
  assert.throws(
    () => stub.delete("/api/q", () => {}),
    /write-scope fence violation: DELETE \/api\/q/,
  );
});

test("GET registration outside wrapRouterWritable succeeds (reads are unrestricted)", () => {
  const stub = createStubRouter();
  wrapRouterWritable(stub, () => {});

  stub.get("/api/world", () => {});
  assert.equal(
    stub.routes.filter((r) => r.method === "GET" && r.path === "/api/world").length,
    1,
  );
});

test("OPTIONS is treated as a write method (fence-violation outside scope)", () => {
  const stub = createStubRouter();
  wrapRouterWritable(stub, () => {});

  assert.throws(
    () => stub.options("/api/x", () => {}),
    /write-scope fence violation: OPTIONS \/api\/x/,
  );
});

test("router.route({ method: 'POST', ... }) outside wrap throws (generic entry point guarded)", () => {
  const stub = createStubRouter();
  wrapRouterWritable(stub, () => {});

  assert.throws(
    () => stub.route({ method: "POST", url: "/api/x" }),
    /write-scope fence violation: POST \/api\/x/,
  );
});

test("router.route({ method: 'POST', ... }) inside wrap succeeds", () => {
  const stub = createStubRouter();
  wrapRouterWritable(stub, (writable) => {
    writable.route({ method: "POST", url: "/api/inside" });
  });

  assert.equal(
    stub.routes.filter((r) => r.method === "POST" && r.path === "/api/inside").length,
    1,
  );
});

test("insideScope flips back to false after register returns (sync)", () => {
  const stub = createStubRouter();
  wrapRouterWritable(stub, (writable) => {
    writable.post("/api/inside", () => {});
  });

  assert.throws(
    () => stub.post("/api/after", () => {}),
    /write-scope fence violation: POST \/api\/after/,
  );
});

test("insideScope flips back to false after register's promise resolves (async)", async () => {
  const stub = createStubRouter();
  await wrapRouterWritable(stub, async (writable) => {
    await Promise.resolve();
    writable.post("/api/async", () => {});
  });

  assert.throws(
    () => stub.post("/api/after-async", () => {}),
    /write-scope fence violation: POST \/api\/after-async/,
  );
});
