import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { fetchGeo, fetchTimezone } from './api';

describe('fetchGeo', () => {
    beforeEach(() => {
        process.env.NETLOC8_API_KEY = 'sk_test_key';
        delete process.env.NETLOC8_API_URL;
    });

    test('returns geo data on success', async () => {
        const mockResponse = {
            ip: '8.8.8.8',
            country: 'US',
            city: 'Mountain View',
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

        expect(capturedUrl).toBe('https://custom.api.com/api/v1/ip/1.2.3.4');
        expect(capturedHeaders['X-API-Key']).toBe('sk_custom');

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
});
