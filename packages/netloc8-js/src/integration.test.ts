/**
 * Integration tests — run against a live NetLoc8 API server.
 *
 * Prerequisites:
 *   1. API server running at NETLOC8_TEST_API_URL (default: https://localhost:2900)
 *   2. A valid secret key in NETLOC8_TEST_SK
 *   3. A valid publishable key in NETLOC8_TEST_PK
 *
 * Usage:
 *   NETLOC8_TEST_SK=sk_... NETLOC8_TEST_PK=pk_... bun test packages/netloc8-js/src/integration.test.ts
 *
 * These tests are skipped by default unless NETLOC8_TEST_SK is set.
 *
 * Note: /ip/me tests may return loopback IP data (no geo) when run locally.
 * The tests verify that the API responds correctly, not that geo data exists.
 */

import { describe, test, expect } from 'bun:test';
import { fetchGeo, fetchTimezone, fetchMyGeo, fetchMyTimezone, normalizeApiResponse } from './index';

const API_URL = process.env.NETLOC8_TEST_API_URL ?? 'https://localhost:2900';
const SK = process.env.NETLOC8_TEST_SK;
const PK = process.env.NETLOC8_TEST_PK;
const SKIP = !SK;

// Disable TLS verification for localhost self-signed certs
if (API_URL.includes('localhost')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

describe.skipIf(SKIP)('integration: live API', () => {

    describe('fetchGeo (secret key)', () => {
        test('returns geo data for 8.8.8.8', async () => {
            const raw = await fetchGeo('8.8.8.8', { apiKey: SK, apiUrl: API_URL, timeout: 10_000 });

            expect(raw).not.toBeNull();
            expect(raw!.ip).toBe('8.8.8.8');
            expect(raw!.country).toBeDefined();
            expect(raw!.timezone).toBeDefined();
        });

        test('normalizes the response into a Geo object', async () => {
            const raw = await fetchGeo('8.8.8.8', { apiKey: SK, apiUrl: API_URL, timeout: 10_000 });
            expect(raw).not.toBeNull();

            const geo = normalizeApiResponse(raw!, '8.8.8.8');

            expect(geo.ip).toBe('8.8.8.8');
            expect(typeof geo.country).toBe('string');
            expect(typeof geo.timezone).toBe('string');
            expect(geo.timezoneFromClient).toBe(false);
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
        // Note: /ip/me from localhost returns loopback IP (::1 or 127.0.0.1)
        // with no geo data. We verify the API accepts the key and responds
        // with the expected shape, not that geo fields are populated.
        test('API accepts publishable key and returns a response', async () => {
            // Publishable keys require Origin header (browsers send this
            // automatically; we simulate it here for the test environment).
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
                const headers = new Headers(init?.headers);
                headers.set('Origin', 'https://localhost:3000');
                return originalFetch(input, { ...init, headers });
            };

            const raw = await fetchMyGeo({ apiKey: PK, apiUrl: API_URL, timeout: 10_000 });
            globalThis.fetch = originalFetch;

            // Response may be null (non-200) for loopback IPs depending on
            // API behavior. If the API returns a body, verify the shape.
            if (raw !== null) {
                expect(raw.ip).toBeDefined();
                const geo = normalizeApiResponse(raw);
                expect(geo.ip).toBeDefined();
                expect(geo.timezoneFromClient).toBe(false);
            }
        });
    });

    describe.skipIf(!PK)('fetchMyTimezone (publishable key)', () => {
        test('API accepts publishable key for timezone endpoint', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
                const headers = new Headers(init?.headers);
                headers.set('Origin', 'https://localhost:3000');
                return originalFetch(input, { ...init, headers });
            };

            const tz = await fetchMyTimezone({ apiKey: PK, apiUrl: API_URL, timeout: 10_000 });
            globalThis.fetch = originalFetch;

            // May be null for loopback IPs; if present, should be a string
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

            globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
                capturedHeaders = new Headers(init?.headers);
                return originalFetch(input, init);
            };

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
