import { describe, test, expect, mock } from 'bun:test';

// Mock next/headers before importing server functions
const mockHeaders = new Map<string, string>();

mock.module('next/headers', () => ({
    headers: async () => ({
        get: (name: string) => mockHeaders.get(name) ?? null,
    }),
}));

// Import after mocking
const { getGeo, getTimezone } = await import('./server');

describe('getGeo', () => {
    test('reads geo data from x-netloc8-* headers', async () => {
        mockHeaders.clear();
        mockHeaders.set('x-netloc8-ip', '8.8.8.8');
        mockHeaders.set('x-netloc8-country', 'US');
        mockHeaders.set('x-netloc8-city', encodeURIComponent('Mountain View'));
        mockHeaders.set('x-netloc8-latitude', '37.386');
        mockHeaders.set('x-netloc8-is-eu', 'false');
        mockHeaders.set('x-netloc8-timezone', 'America%2FLos_Angeles');

        const geo = await getGeo();
        expect(geo.ip).toBe('8.8.8.8');
        expect(geo.country).toBe('US');
        expect(geo.city).toBe('Mountain View');
        expect(geo.latitude).toBe(37.386);
        expect(geo.isEU).toBe(false);
        expect(geo.timezone).toBe('America/Los_Angeles');
    });

    test('returns empty object when no headers are present', async () => {
        mockHeaders.clear();

        const geo = await getGeo();
        expect(geo).toEqual({});
    });
});

describe('getTimezone', () => {
    test('returns timezone string', async () => {
        mockHeaders.clear();
        mockHeaders.set('x-netloc8-timezone', 'America%2FChicago');

        const tz = await getTimezone();
        expect(tz).toBe('America/Chicago');
    });

    test('returns undefined when no timezone header', async () => {
        mockHeaders.clear();

        const tz = await getTimezone();
        expect(tz).toBeUndefined();
    });
});
