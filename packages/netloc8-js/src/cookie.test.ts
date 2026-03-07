import { describe, test, expect } from 'bun:test';
import { serializeCookie, parseCookie, COOKIE_NAME, COOKIE_OPTIONS } from './cookie';
import type { Geo } from './types';

describe('cookie constants', () => {
    test('COOKIE_NAME is __netloc8_geo', () => {
        expect(COOKIE_NAME).toBe('__netloc8_geo');
    });

    test('COOKIE_OPTIONS has correct defaults', () => {
        expect(COOKIE_OPTIONS.path).toBe('/');
        expect(COOKIE_OPTIONS.httpOnly).toBe(false);
        expect(COOKIE_OPTIONS.secure).toBe(true);
        expect(COOKIE_OPTIONS.sameSite).toBe('lax');
        expect(COOKIE_OPTIONS.maxAge).toBe(2_592_000);
    });
});

describe('serializeCookie / parseCookie round-trip', () => {
    test('round-trips a full Geo object', () => {
        const geo: Geo = {
            ip: '8.8.8.8',
            country: 'US',
            city: 'Mountain View',
            timezone: 'America/Los_Angeles',
            timezoneFromClient: true,
        };

        const serialized = serializeCookie(geo);
        const parsed = parseCookie(serialized);

        expect(parsed.ip).toBe('8.8.8.8');
        expect(parsed.country).toBe('US');
        expect(parsed.city).toBe('Mountain View');
        expect(parsed.timezone).toBe('America/Los_Angeles');
        expect(parsed.timezoneFromClient).toBe(true);
    });

    test('round-trips an empty Geo object', () => {
        const serialized = serializeCookie({});
        const parsed = parseCookie(serialized);
        expect(parsed).toEqual({});
    });
});

describe('parseCookie edge cases', () => {
    test('returns empty object for undefined', () => {
        expect(parseCookie(undefined)).toEqual({});
    });

    test('returns empty object for empty string', () => {
        expect(parseCookie('')).toEqual({});
    });

    test('returns empty object for corrupt JSON', () => {
        expect(parseCookie('not-json')).toEqual({});
    });

    test('returns empty object for non-object JSON', () => {
        expect(parseCookie(encodeURIComponent('"string"'))).toEqual({});
    });
});
