import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { fetchGeo, fetchTimezone, fetchMyGeo, fetchMyTimezone } from './api';

describe('fetchGeo', () => {
    beforeEach(() => {
        process.env.NETLOC8_API_KEY = 'sk_test_key';
        delete process.env.NETLOC8_API_URL;
    });

    test('returns geo data on success', async () => {
        const mockResponse = {
            query: { type: 'ip', value: '8.8.8.8', ipVersion: 4 },
            location: { country: { code: 'US' }, city: 'Mountain View' },
        };

        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(() =>
            Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))
        ) as unknown as typeof fetch;

        const result = await fetchGeo('8.8.8.8');
        expect(result).toEqual(mockResponse);

        globalThis.fetch = originalFetch;
    });

    test('returns null on non-ok response', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(() =>
            Promise.resolve(new Response('Not found', { status: 404 }))
        ) as unknown as typeof fetch;

        const result = await fetchGeo('0.0.0.0');
        expect(result).toBeNull();

        globalThis.fetch = originalFetch;
    });

    test('returns null on network error', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(() =>
            Promise.reject(new Error('Network error'))
        ) as unknown as typeof fetch;

        const result = await fetchGeo('8.8.8.8');
        expect(result).toBeNull();

        globalThis.fetch = originalFetch;
    });

    test('returns null when no API key is set', async () => {
        delete process.env.NETLOC8_API_KEY;

        const result = await fetchGeo('8.8.8.8');
        expect(result).toBeNull();
    });

    test('uses new /v1/ path prefix (not /api/v1/)', async () => {
        const originalFetch = globalThis.fetch;
        let capturedUrl = '';

        globalThis.fetch = mock((url: string | URL | Request) => {
            capturedUrl = url as string;
            return Promise.resolve(new Response('{}', { status: 200 }));
        }) as unknown as typeof fetch;

        await fetchGeo('1.2.3.4');

        expect(capturedUrl).toBe('https://api.netloc8.com/v1/ip/1.2.3.4');

        globalThis.fetch = originalFetch;
    });

    test('uses custom apiKey and apiUrl', async () => {
        const originalFetch = globalThis.fetch;
        let capturedUrl = '';
        let capturedHeaders: Record<string, string> = {};

        globalThis.fetch = mock((url: string | URL | Request, init?: RequestInit) => {
            capturedUrl = url as string;
            capturedHeaders = Object.fromEntries(
                (init?.headers as Headers)?.entries?.() ?? Object.entries(init?.headers ?? {})
            );
            return Promise.resolve(new Response('{}', { status: 200 }));
        }) as unknown as typeof fetch;

        await fetchGeo('1.2.3.4', {
            apiKey: 'sk_custom',
            apiUrl: 'https://custom.api.com',
        });

        expect(capturedUrl).toBe('https://custom.api.com/v1/ip/1.2.3.4');
        expect(capturedHeaders['X-API-Key']).toBe('sk_custom');

        globalThis.fetch = originalFetch;
    });

    test('sends X-NL8-TZ browser validation header when Intl is available', async () => {
        const originalFetch = globalThis.fetch;
        const originalWindow = globalThis.window;
        let capturedHeaders: Record<string, string> = {};

        // Mock window so getTimezone() detects a browser environment
        // @ts-expect-error — minimal mock
        globalThis.window = {};

        globalThis.fetch = mock((_url: string | URL | Request, init?: RequestInit) => {
            capturedHeaders = Object.fromEntries(
                (init?.headers as Headers)?.entries?.() ?? Object.entries(init?.headers ?? {})
            );
            return Promise.resolve(new Response('{}', { status: 200 }));
        }) as unknown as typeof fetch;

        await fetchGeo('8.8.8.8');

        // Intl is available in Bun, and window is now mocked, so this should be present
        expect(capturedHeaders['X-NL8-TZ']).toBeDefined();
        expect(typeof capturedHeaders['X-NL8-TZ']).toBe('string');

        globalThis.fetch = originalFetch;
        globalThis.window = originalWindow;
    });

    test('encodes IP address in URL', async () => {
        const originalFetch = globalThis.fetch;
        let capturedUrl = '';

        globalThis.fetch = mock((url: string | URL | Request) => {
            capturedUrl = url as string;
            return Promise.resolve(new Response('{}', { status: 200 }));
        }) as unknown as typeof fetch;

        await fetchGeo('2001:4860:4860::8888');

        expect(capturedUrl).toContain(encodeURIComponent('2001:4860:4860::8888'));

        globalThis.fetch = originalFetch;
    });
});

describe('fetchTimezone', () => {
    beforeEach(() => {
        process.env.NETLOC8_API_KEY = 'sk_test_key';
    });

    test('returns timezone string on success', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(() =>
            Promise.resolve(new Response(JSON.stringify('America/Chicago'), { status: 200 }))
        ) as unknown as typeof fetch;

        const result = await fetchTimezone('8.8.8.8');
        expect(result).toBe('America/Chicago');

        globalThis.fetch = originalFetch;
    });

    test('returns null on failure', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(() =>
            Promise.resolve(new Response('', { status: 404 }))
        ) as unknown as typeof fetch;

        const result = await fetchTimezone('0.0.0.0');
        expect(result).toBeNull();

        globalThis.fetch = originalFetch;
    });

    test('returns null when no API key', async () => {
        delete process.env.NETLOC8_API_KEY;

        const result = await fetchTimezone('8.8.8.8');
        expect(result).toBeNull();
    });

    test('uses /v1/ip/.../timezone path', async () => {
        const originalFetch = globalThis.fetch;
        let capturedUrl = '';

        globalThis.fetch = mock((url: string | URL | Request) => {
            capturedUrl = url as string;
            return Promise.resolve(new Response(JSON.stringify('America/Chicago'), { status: 200 }));
        }) as unknown as typeof fetch;

        await fetchTimezone('8.8.8.8');
        expect(capturedUrl).toBe('https://api.netloc8.com/v1/ip/8.8.8.8/timezone');

        globalThis.fetch = originalFetch;
    });
});

describe('fetchMyGeo', () => {
    beforeEach(() => {
        process.env.NETLOC8_API_KEY = 'pk_test_key';
        delete process.env.NETLOC8_API_URL;
    });

    test('returns geo data on success', async () => {
        const mockResponse = {
            query: { type: 'ip', value: '24.216.76.94', ipVersion: 4 },
            location: { country: { code: 'US' }, city: 'Dallas' },
        };

        const originalFetch = globalThis.fetch;
        let capturedUrl = '';
        globalThis.fetch = mock((url: string | URL | Request) => {
            capturedUrl = url as string;
            return Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }));
        }) as unknown as typeof fetch;

        const result = await fetchMyGeo();
        expect(result).toEqual(mockResponse);
        expect(capturedUrl).toBe('https://api.netloc8.com/v1/ip/me');

        globalThis.fetch = originalFetch;
    });

    test('returns null on failure', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(() =>
            Promise.resolve(new Response('', { status: 500 }))
        ) as unknown as typeof fetch;

        const result = await fetchMyGeo();
        expect(result).toBeNull();

        globalThis.fetch = originalFetch;
    });

    test('returns null when no API key', async () => {
        delete process.env.NETLOC8_API_KEY;

        const result = await fetchMyGeo();
        expect(result).toBeNull();
    });

    test('uses custom publishable key and apiUrl', async () => {
        const originalFetch = globalThis.fetch;
        let capturedUrl = '';
        let capturedHeaders: Record<string, string> = {};

        globalThis.fetch = mock((url: string | URL | Request, init?: RequestInit) => {
            capturedUrl = url as string;
            capturedHeaders = Object.fromEntries(
                (init?.headers as Headers)?.entries?.() ?? Object.entries(init?.headers ?? {})
            );
            return Promise.resolve(new Response('{}', { status: 200 }));
        }) as unknown as typeof fetch;

        await fetchMyGeo({
            apiKey: 'pk_custom',
            apiUrl: 'https://custom.api.com',
        });

        expect(capturedUrl).toBe('https://custom.api.com/v1/ip/me');
        expect(capturedHeaders['X-API-Key']).toBe('pk_custom');

        globalThis.fetch = originalFetch;
    });
});

describe('fetchMyTimezone', () => {
    beforeEach(() => {
        process.env.NETLOC8_API_KEY = 'pk_test_key';
    });

    test('returns timezone string on success', async () => {
        const originalFetch = globalThis.fetch;
        let capturedUrl = '';
        globalThis.fetch = mock((url: string | URL | Request) => {
            capturedUrl = url as string;
            return Promise.resolve(new Response(JSON.stringify('America/Chicago'), { status: 200 }));
        }) as unknown as typeof fetch;

        const result = await fetchMyTimezone();
        expect(result).toBe('America/Chicago');
        expect(capturedUrl).toBe('https://api.netloc8.com/v1/ip/me/timezone');

        globalThis.fetch = originalFetch;
    });

    test('returns null on failure', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(() =>
            Promise.resolve(new Response('', { status: 404 }))
        ) as unknown as typeof fetch;

        const result = await fetchMyTimezone();
        expect(result).toBeNull();

        globalThis.fetch = originalFetch;
    });

    test('returns null when no API key', async () => {
        delete process.env.NETLOC8_API_KEY;

        const result = await fetchMyTimezone();
        expect(result).toBeNull();
    });
});
