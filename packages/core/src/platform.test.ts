import { describe, test, expect } from 'bun:test';
import { getGeoFromPlatformHeaders } from './platform';

describe('getGeoFromPlatformHeaders', () => {
    test('extracts Vercel headers', () => {
        const headers = new Headers({
            'x-vercel-ip-country': 'US',
            'x-vercel-ip-country-region': 'CA',
            'x-vercel-ip-city': 'San%20Francisco',
            'x-vercel-ip-latitude': '37.7749',
            'x-vercel-ip-longitude': '-122.4194',
            'x-vercel-ip-timezone': 'America/Los_Angeles',
        });

        const geo = getGeoFromPlatformHeaders(headers);
        expect(geo.country).toBe('US');
        expect(geo.region).toBe('CA');
        expect(geo.city).toBe('San Francisco');
        expect(geo.latitude).toBe(37.7749);
        expect(geo.longitude).toBe(-122.4194);
        expect(geo.timezone).toBe('America/Los_Angeles');
    });

    test('extracts Cloudflare header', () => {
        const headers = new Headers({
            'cf-ipcountry': 'DE',
        });

        const geo = getGeoFromPlatformHeaders(headers);
        expect(geo.country).toBe('DE');
    });

    test('extracts CloudFront header', () => {
        const headers = new Headers({
            'cloudfront-viewer-country': 'FR',
        });

        const geo = getGeoFromPlatformHeaders(headers);
        expect(geo.country).toBe('FR');
    });

    test('Vercel takes precedence over Cloudflare', () => {
        const headers = new Headers({
            'x-vercel-ip-country': 'US',
            'cf-ipcountry': 'DE',
        });

        const geo = getGeoFromPlatformHeaders(headers);
        expect(geo.country).toBe('US');
    });

    test('returns empty object for no platform headers', () => {
        const headers = new Headers();
        const geo = getGeoFromPlatformHeaders(headers);
        expect(geo).toEqual({});
    });
});
