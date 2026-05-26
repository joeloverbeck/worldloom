import { beforeEach, describe, expect, it } from 'vitest';

import { clearHybridSectionCache, parseSections, parseSectionsForRecord } from '../HybridSectionParser';

describe('HybridSectionParser', () => {
  beforeEach(() => {
    clearHybridSectionCache();
  });

  it('splits a STCHAR body into H2 sections', () => {
    expect(
      parseSections([
        'Introductory note outside sections.',
        '## Capabilities',
        'Can read the old gates.',
        '### Limits',
        'Needs lamplight.',
        '## Voice',
        'Speaks in clipped sentences.',
        '## Pressure Behavior',
        '- Freezes under public scrutiny.',
      ].join('\n')),
    ).toEqual({
      Body: 'Introductory note outside sections.',
      Capabilities: 'Can read the old gates.\n### Limits\nNeeds lamplight.',
      Voice: 'Speaks in clipped sentences.',
      'Pressure Behavior': '- Freezes under public scrutiny.',
    });
  });

  it('falls back to Body when no H1 or H2 section headings exist', () => {
    const body = ['Opening text.', '### Local Anchor', 'Still part of body.'].join('\n');

    expect(parseSections(body)).toEqual({ Body: body });
  });

  it('unwraps bold heading text and treats H1 as a split boundary', () => {
    expect(parseSections(['# **Profile**', 'Top-level text.', '## __Voice__', 'Soft.'].join('\n'))).toEqual({
      Profile: 'Top-level text.',
      Voice: 'Soft.',
    });
  });

  it('returns an empty map for an empty body', () => {
    expect(parseSections('   \n')).toEqual({});
  });

  it('memoizes sections per record id and content hash', () => {
    const first = parseSectionsForRecord({
      body: '## Voice\nFirst.',
      contentHash: 'hash-a',
      recordId: 'STCHAR-1',
    });
    const second = parseSectionsForRecord({
      body: '## Voice\nChanged but cached.',
      contentHash: 'hash-a',
      recordId: 'STCHAR-1',
    });
    const third = parseSectionsForRecord({
      body: '## Voice\nChanged and reparsed.',
      contentHash: 'hash-b',
      recordId: 'STCHAR-1',
    });

    expect(second).toBe(first);
    expect(third).not.toBe(first);
    expect(third).toEqual({ Voice: 'Changed and reparsed.' });
  });
});
