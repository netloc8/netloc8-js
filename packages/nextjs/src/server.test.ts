import { describe, test, expect } from 'bun:test';
import { readGeoHeaders } from './proxy';

// server.ts uses readGeoHeaders internally, so we test the same function.
// The getGeo() and getTimezone() functions rely on next/headers which
// requires a Next.js request context and cannot be unit-tested directly.

describe('server.ts readGeoHeaders (used by getGeo)', () => {
    test('reconstructs nested Geo from request headers', () => {
        const headers = new Headers();
        headers.set('x-netloc8-ip', encodeURIComponent('24.216.76.94'));
        headers.set('x-netloc8-country-code', encodeURIComponent('US'));
        headers.set('x-netloc8-region-code', encodeURIComponent('TX'));
        headers.set('x-netloc8-city', encodeURIComponent('Dallas'));
        headers.set('x-netloc8-timezone', encodeURIComponent('America/Chicago'));
        headers.set('x-netloc8-timezone-from-client', encodeURIComponent('true'));

        const geo = readGeoHeaders(headers);

        expect(geo.query?.value).toBe('24.216.76.94');
        expect(geo.location?.country?.code).toBe('US');
        expect(geo.location?.region?.code).toBe('TX');
        expect(geo.location?.city).toBe('Dallas');
        expect(geo.location?.timezone).toBe('America/Chicago');
        expect(geo.location?.timezoneFromClient).toBe(true);
    });

    test('returns empty Geo when no headers present', () => {
        const geo = readGeoHeaders(new Headers());
        expect(geo).toEqual({});
    });
});
