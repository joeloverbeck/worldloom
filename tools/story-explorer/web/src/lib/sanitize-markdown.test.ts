import { describe, expect, it } from 'vitest';

import { sanitizeMarkdown } from './sanitize-markdown';

describe('sanitizeMarkdown', () => {
  it('strips embedded script content and unsafe event handlers', () => {
    const html = sanitizeMarkdown('Hello <img src=x onerror="alert(1)"> <script>alert(1)</script>');

    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('alert(1)');
  });

  it('rewrites story ids to internal links', () => {
    const html = sanitizeMarkdown('Open PG-1 then CHC-2 after SE-3.');

    expect(html).toContain('<a href="/records/PG-1">PG-1</a>');
    expect(html).toContain('<a href="/records/CHC-2">CHC-2</a>');
    expect(html).toContain('<a href="/records/SE-3">SE-3</a>');
  });

  it('hardens external links', () => {
    const html = sanitizeMarkdown('[External](https://example.com)');

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
