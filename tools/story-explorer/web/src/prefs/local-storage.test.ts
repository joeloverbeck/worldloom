import { afterEach, describe, expect, it, vi } from 'vitest';

import { getLastViewedPage, getTheme, setLastViewedPage, setTheme } from './local-storage';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('local-storage preferences', () => {
  it('round-trips last-viewed page and theme with namespaced keys', () => {
    setLastViewedPage('red-bunny', 'PG-7');
    setTheme('dark');

    expect(getLastViewedPage('red-bunny')).toBe('PG-7');
    expect(getTheme()).toBe('dark');
    expect(localStorage.getItem('worldloom-story-explorer:last-viewed:red-bunny')).toBe('PG-7');
    expect(localStorage.getItem('worldloom-story-explorer:theme')).toBe('dark');
  });

  it('falls back to memory when localStorage throws', () => {
    const throwingStorage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    };
    vi.stubGlobal('localStorage', throwingStorage);

    setLastViewedPage('private-mode', 'PG-2');
    setTheme('light');

    expect(getLastViewedPage('private-mode')).toBe('PG-2');
    expect(getTheme()).toBe('light');
  });
});
