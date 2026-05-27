const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const PAGE_ID_PATTERN = /^PG-(0|[1-9][0-9]*)$/;

export interface InvalidInputBody {
  error: "invalid_input";
  message: string;
  field: string;
  value: string;
}

export function invalidRouteParam(field: string, value: string, expected: string): InvalidInputBody {
  return {
    error: "invalid_input",
    message: `${field} must be ${expected}.`,
    field,
    value,
  };
}

export function isValidRouteSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

export function isValidPageId(value: string): boolean {
  return PAGE_ID_PATTERN.test(value);
}
