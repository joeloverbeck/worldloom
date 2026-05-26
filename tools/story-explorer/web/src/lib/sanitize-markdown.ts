import DOMPurify from 'dompurify';
import { marked } from 'marked';

const internalIdPattern = /\b(PG|CHC|SE)-\d+\b/g;
const safeHrefPattern = /^(https?:|mailto:|\/|\.\/|\.\.\/|#)/i;

function rewriteInternalIds(markdown: string): string {
  return markdown.replace(internalIdPattern, (id) => `[${id}](/records/${id})`);
}

function hardenLinks(container: ParentNode): void {
  for (const link of Array.from(container.querySelectorAll('a'))) {
    const href = link.getAttribute('href');
    if (href === null || !safeHrefPattern.test(href)) {
      link.removeAttribute('href');
      continue;
    }

    if (/^https?:\/\//i.test(href)) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  }
}

export function sanitizeMarkdown(markdown: string): string {
  const html = marked.parse(rewriteInternalIds(markdown), {
    async: false,
    gfm: true,
  }) as string;
  const sanitized = DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
  const template = document.createElement('template');
  template.innerHTML = sanitized;
  hardenLinks(template.content);
  return template.innerHTML;
}
