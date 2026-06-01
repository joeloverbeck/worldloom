export type ReadResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ReadError };

export interface ReadError {
  code: string;
  path: string;
  cause?: unknown;
  repair_hint: string;
}

export function ok<T>(value: T): ReadResult<T> {
  return { ok: true, value };
}

export function err<T = never>(error: ReadError): ReadResult<T> {
  return { ok: false, error };
}
