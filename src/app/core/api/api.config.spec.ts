import { describe, expect, it } from 'vitest';

import { resolveApiBaseUrl } from './api.config';

describe('resolveApiBaseUrl', () => {
  it('uses a browser runtime override first', () => {
    expect(resolveApiBaseUrl({ apiBaseUrl: ' https://api.example.test ' }, { API_BASE_URL: 'https://ssr.test' }))
      .toBe('https://api.example.test');
  });

  it('uses API_BASE_URL during SSR', () => {
    expect(resolveApiBaseUrl(undefined, { API_BASE_URL: 'https://ssr.example.test' }))
      .toBe('https://ssr.example.test');
  });

  it('has no development-host fallback on the server', () => {
    expect(resolveApiBaseUrl(undefined, {}, null)).toBe('');
  });
});
