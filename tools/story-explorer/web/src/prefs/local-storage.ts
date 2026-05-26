export type ThemePreference = 'light' | 'dark' | 'system';

const KEY_PREFIX = 'worldloom-story-explorer:';
const THEME_KEY = `${KEY_PREFIX}theme`;
const memoryFallback = new Map<string, string>();

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function keyForLastViewed(storySlug: string): string {
  return `${KEY_PREFIX}last-viewed:${storySlug}`;
}

function readValue(key: string): string | null {
  const target = storage();
  if (target === null) {
    return memoryFallback.get(key) ?? null;
  }
  try {
    return target.getItem(key) ?? memoryFallback.get(key) ?? null;
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

function writeValue(key: string, value: string): void {
  memoryFallback.set(key, value);
  const target = storage();
  if (target === null) {
    return;
  }
  try {
    target.setItem(key, value);
  } catch {
    // Keep the in-memory fallback populated for private-browsing or quota failures.
  }
}

export function getLastViewedPage(storySlug: string): string | null {
  return readValue(keyForLastViewed(storySlug));
}

export function setLastViewedPage(storySlug: string, pageId: string): void {
  writeValue(keyForLastViewed(storySlug), pageId);
}

export function getTheme(): ThemePreference {
  const value = readValue(THEME_KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function setTheme(theme: ThemePreference): void {
  writeValue(THEME_KEY, theme);
}
