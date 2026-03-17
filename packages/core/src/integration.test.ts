/**
 * Integration tests — run against a live NetLoc8 API server.
 *
 * Prerequisites:
 *   1. API server running at NETLOC8_TEST_API_URL (default: https://api.netloc8.com)
 *   2. A valid secret key in NETLOC8_TEST_SK
 *   3. A valid publishable key in NETLOC8_TEST_PK
 *
 * Usage:
 *   NETLOC8_TEST_SK=sk_... NETLOC8_TEST_PK=pk_... bun test packages/core/src/integration.test.ts
 *
 * These tests are skipped by default unless NETLOC8_TEST_SK is set.
 *
 * Note: /ip/me tests may return loopback IP data (no geo) when run locally.
 * The tests verify that the API responds correctly, not that geo data exists.
 */

import { describe, test, expect } from 'bun:test';
import { fetchGeo, fetchTimezone, fetchMyGeo, fetchMyTimezone, normalizeApiResponse } from './index';

const API_URL = process.env.NETLOC8_TEST_API_URL ?? 'https://api.netloc8.com';
const SK = process.env.NETLOC8_TEST_SK;
const PK = process.env.NETLOC8_TEST_PK;
const SKIP = !SK;

describe.skipIf(SKIP)('integration: live API', () => {

    // Disable TLS verification for localhost self-signed certs —
    // placed inside the test suite so it only runs when tests are not skipped
    if (API_URL.includes('localhost')) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    describe('fetchGeo (secret key)', () => {
        test('returns nested geo data for 8.8.8.8', async () => {
            const raw = await fetchGeo('8.8.8.8', { apiKey: SK, apiUrl: API_URL, timeout: 10_000 });

            expect(raw).not.toBeNull();
            expect(raw!.query).toBeDefined();
            expect((raw!.query as Record<string, unknown>).value).toBe('8.8.8.8');
            expect(raw!.location).toBeDefined();
        });

        test('normalizes the response into a nested Geo object', async () => {
            const raw = await fetchGeo('8.8.8.8', { apiKey: SK, apiUrl: API_URL, timeout: 10_000 });
            expect(raw).not.toBeNull();

            const geo = normalizeApiResponse(raw!, '8.8.8.8');

            expect(geo.query?.value).toBe('8.8.8.8');
            expect(geo.location?.country?.code).toBeDefined();
            expect(geo.location?.timezone).toBeDefined();
            expect(geo.location?.timezoneFromClient).toBe(false);
        });

        test('returns null for an invalid IP', async () => {
            const raw = await fetchGeo('not-an-ip', { apiKey: SK, apiUrl: API_URL, timeout: 10_000 });
            expect(raw).toBeNull();
        });
    });

    describe('fetchTimezone (secret key)', () => {
        test('returns IANA timezone for 8.8.8.8', async () => {
            const tz = await fetchTimezone('8.8.8.8', { apiKey: SK, apiUrl: API_URL, timeout: 10_000 });

            expect(tz).not.toBeNull();
            expect(typeof tz).toBe('string');
            expect(tz!.includes('/')).toBe(true); // e.g. "America/Chicago"
        });
    });

    describe.skipIf(!PK)('fetchMyGeo (publishable key)', () => {
        test('API accepts publishable key and returns a response', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
                const headers = new Headers(init?.headers);
                headers.set('Origin', 'https://localhost:3000');
                return originalFetch(input, { ...init, headers });
            }) as typeof fetch;

            const raw = await fetchMyGeo({ apiKey: PK, apiUrl: API_URL, timeout: 10_000 });
            globalThis.fetch = originalFetch;

            if (raw !== null) {
                expect(raw.query).toBeDefined();
                const geo = normalizeApiResponse(raw);
                expect(geo.query?.value).toBeDefined();
                expect(geo.location?.timezoneFromClient).toBe(false);
            }
        });
    });

    describe.skipIf(!PK)('fetchMyTimezone (publishable key)', () => {
        test('API accepts publishable key for timezone endpoint', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
                const headers = new Headers(init?.headers);
                headers.set('Origin', 'https://localhost:3000');
                return originalFetch(input, { ...init, headers });
            }) as typeof fetch;

            const tz = await fetchMyTimezone({ apiKey: PK, apiUrl: API_URL, timeout: 10_000 });
            globalThis.fetch = originalFetch;

            if (tz !== null) {
                expect(typeof tz).toBe('string');
                expect(tz.includes('/')).toBe(true);
            }
        });
    });

    describe('X-NetLoc8-Client header', () => {
        test('request includes the client identifier header', async () => {
            const originalFetch = globalThis.fetch;
            let capturedHeaders: Headers | undefined;

            globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
                capturedHeaders = new Headers(init?.headers);
                return originalFetch(input, init);
            }) as typeof fetch;

            await fetchGeo('8.8.8.8', { apiKey: SK, apiUrl: API_URL, timeout: 10_000 });
            globalThis.fetch = originalFetch;

            expect(capturedHeaders).toBeDefined();
            const clientHeader = capturedHeaders!.get('X-NetLoc8-Client');
            expect(clientHeader).not.toBeNull();
            expect(clientHeader!).toContain('@netloc8/');
        });
    });

    describe('authentication', () => {
        test('rejects invalid API key', async () => {
            const raw = await fetchGeo('8.8.8.8', { apiKey: 'sk_invalid', apiUrl: API_URL, timeout: 10_000 });
            expect(raw).toBeNull();
        });
    });
});
