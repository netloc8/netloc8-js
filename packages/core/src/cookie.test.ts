import { describe, test, expect } from 'bun:test';
import { serializeCookie, parseCookie, COOKIE_NAME, COOKIE_OPTIONS } from './cookie';
import type { Geo } from './types';

describe('cookie', () => {
    test('COOKIE_NAME is __netloc8_geo', () => {
        expect(COOKIE_NAME).toBe('__netloc8_geo');
    });

    test('COOKIE_OPTIONS has sensible defaults', () => {
        expect(COOKIE_OPTIONS.path).toBe('/');
        expect(COOKIE_OPTIONS.httpOnly).toBe(false);
        expect(COOKIE_OPTIONS.sameSite).toBe('lax');
        expect(COOKIE_OPTIONS.maxAge).toBe(2_592_000);
    });

    test('round-trips a full nested Geo object', () => {
        const geo: Geo = {
            query: { type: 'ip', value: '8.8.8.8', ipVersion: 4 },
            location: {
                continent: { code: 'NA', name: 'North America' },
                country: { code: 'US', name: 'United States', flag: '🇺🇸', unions: [] },
                region: { code: 'CA', name: 'California' },
                city: 'Mountain View',
                postalCode: '94043',
                coordinates: { latitude: 37.386, longitude: -122.084, accuracyRadius: 621 },
                timezone: 'America/Los_Angeles',
                utcOffset: '-07:00',
                geoConfidence: 1.0,
                timezoneFromClient: false,
            },
            network: { asn: 'AS15169', organization: 'Google LLC', domain: 'google.com' },
            sources: { geo: ['dbip'], asn: ['ipinfo'], tz: ['derived'] },
            meta: { precision: 'city', tier: 'free', requestId: 'abc-123', degraded: false },
        };

        const serialized = serializeCookie(geo);
        const parsed = parseCookie(serialized);

        expect(parsed.query?.type).toBe('ip');
        expect(parsed.query?.value).toBe('8.8.8.8');
        expect(parsed.query?.ipVersion).toBe(4);
        expect(parsed.location?.continent?.code).toBe('NA');
        expect(parsed.location?.country?.code).toBe('US');
        expect(parsed.location?.country?.flag).toBe('🇺🇸');
        expect(parsed.location?.country?.unions).toEqual([]);
        expect(parsed.location?.region?.code).toBe('CA');
        expect(parsed.location?.city).toBe('Mountain View');
        expect(parsed.location?.coordinates?.latitude).toBe(37.386);
        expect(parsed.location?.timezone).toBe('America/Los_Angeles');
        expect(parsed.location?.timezoneFromClient).toBe(false);
        expect(parsed.network?.asn).toBe('AS15169');
        expect(parsed.sources?.geo).toEqual(['dbip']);
        expect(parsed.meta?.precision).toBe('city');
        expect(parsed.meta?.degraded).toBe(false);
    });

    test('returns empty object for undefined input', () => {
        expect(parseCookie(undefined)).toEqual({});
    });

    test('returns empty object for empty string', () => {
        expect(parseCookie('')).toEqual({});
    });

    test('returns empty object for invalid JSON', () => {
        expect(parseCookie('not-json')).toEqual({});
    });

    test('returns empty object for non-object JSON', () => {
        expect(parseCookie(encodeURIComponent('"string"'))).toEqual({});
        expect(parseCookie(encodeURIComponent('42'))).toEqual({});
        expect(parseCookie(encodeURIComponent('null'))).toEqual({});
    });

    test('rejects non-string values in unions array', () => {
        const malicious = {
            location: { country: { code: 'DE', unions: ['EU', 42, null, true] } },
        };
        const parsed = parseCookie(encodeURIComponent(JSON.stringify(malicious)));
        expect(parsed.location?.country?.unions).toEqual(['EU']);
    });

    test('rejects non-string values in sources arrays', () => {
        const malicious = {
            sources: { geo: ['dbip', 123, null], asn: [true] },
        };
        const parsed = parseCookie(encodeURIComponent(JSON.stringify(malicious)));
        expect(parsed.sources?.geo).toEqual(['dbip']);
        expect(parsed.sources?.asn).toEqual([]);
    });

    test('ignores unexpected properties (only known Geo fields are copied)', () => {
        const malicious = {
            evil: true,
            constructor: { prototype: { admin: true } },
            query: { type: 'ip', value: '8.8.8.8' },
        };
        const parsed = parseCookie(encodeURIComponent(JSON.stringify(malicious)));
        expect(parsed.query?.value).toBe('8.8.8.8');
        // Unknown top-level properties should not appear on the result
        expect((parsed as Record<string, unknown>).evil).toBeUndefined();
    });

    test('handles EU country with unions', () => {
        const geo: Geo = {
            location: { country: { code: 'DE', name: 'Germany', unions: ['EU'] } },
        };
        const serialized = serializeCookie(geo);
        const parsed = parseCookie(serialized);
        expect(parsed.location?.country?.unions).toEqual(['EU']);
    });
});
