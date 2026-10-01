import { describe, expect, test } from 'bun:test';
import { resolveVideoUrl } from './video';

const FULL =
  'https://www.tiktok.com/@rogaroga/video/7301234567890123456?is_from_webapp=1&sender_device=pc';

// A fetch that answers from a table of redirects, and records the calls.
function fakeFetch(redirects: Record<string, string | null>) {
  const calls: string[] = [];
  const impl = (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    const location = redirects[url];
    return Promise.resolve(
      new Response(null, {
        status: location ? 301 : 200,
        headers: location ? { location } : {},
      })
    );
  };
  return { calls, impl: impl as typeof fetch };
}

describe('resolveVideoUrl', () => {
  test('a full video link is returned without any request', async () => {
    const { calls, impl } = fakeFetch({});
    expect(await resolveVideoUrl(FULL, impl)).toBe(
      'https://www.tiktok.com/@rogaroga/video/7301234567890123456'
    );
    expect(calls).toEqual([]);
  });

  test('a vm.tiktok.com link resolves to the canonical video link', async () => {
    const { impl } = fakeFetch({ 'https://vm.tiktok.com/ZMabc123/': FULL });
    expect(await resolveVideoUrl('https://vm.tiktok.com/ZMabc123/', impl)).toBe(
      'https://www.tiktok.com/@rogaroga/video/7301234567890123456'
    );
  });

  test('follows a relative redirect and the /t/ form', async () => {
    const { impl } = fakeFetch({
      'https://www.tiktok.com/t/ZTabc/': '/@rogaroga/video/7301234567890123456',
    });
    expect(await resolveVideoUrl('https://www.tiktok.com/t/ZTabc/', impl)).toBe(
      'https://www.tiktok.com/@rogaroga/video/7301234567890123456'
    );
  });

  test('never follows a redirect outside TikTok', async () => {
    const { calls, impl } = fakeFetch({
      'https://vm.tiktok.com/ZMevil/': 'http://169.254.169.254/latest/',
    });
    expect(
      await resolveVideoUrl('https://vm.tiktok.com/ZMevil/', impl)
    ).toBeNull();
    expect(calls).toEqual(['https://vm.tiktok.com/ZMevil/']);
  });

  test('gives up when the short link leads nowhere', async () => {
    const { impl } = fakeFetch({ 'https://vm.tiktok.com/ZMgone/': null });
    expect(
      await resolveVideoUrl('https://vm.tiktok.com/ZMgone/', impl)
    ).toBeNull();
  });

  test('stops after a few hops', async () => {
    const { calls, impl } = fakeFetch({
      'https://vm.tiktok.com/A/': 'https://vm.tiktok.com/B/',
      'https://vm.tiktok.com/B/': 'https://vm.tiktok.com/A/',
    });
    expect(await resolveVideoUrl('https://vm.tiktok.com/A/', impl)).toBeNull();
    expect(calls.length).toBeLessThanOrEqual(4);
  });

  test('other links are not fetched', async () => {
    const { calls, impl } = fakeFetch({});
    expect(await resolveVideoUrl('https://example.com/x', impl)).toBeNull();
    expect(await resolveVideoUrl('https://vimeo.com/1', impl)).toBeNull();
    expect(calls).toEqual([]);
  });

  test('a network error is a miss, not a crash', async () => {
    const failing = (() =>
      Promise.reject(new Error('timeout'))) as unknown as typeof fetch;
    expect(
      await resolveVideoUrl('https://vm.tiktok.com/ZMx/', failing)
    ).toBeNull();
  });
});
