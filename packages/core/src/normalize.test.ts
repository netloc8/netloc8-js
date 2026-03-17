import { describe, test, expect } from 'bun:test';
import { normalizeApiResponse } from './normalize';

describe('normalizeApiResponse', () => {
    test('maps a full nested API response', () => {
        const raw = {
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
            },
            network: { asn: 'AS15169', organization: 'Google LLC', domain: 'google.com' },
            sources: { geo: ['dbip', 'ip2location'], asn: ['ipinfo'], tz: ['derived'] },
            meta: { precision: 'city', tier: 'free', requestId: 'abc-123', degraded: false },
        };

        const geo = normalizeApiResponse(raw, '8.8.8.8');

        expect(geo.query?.type).toBe('ip');
        expect(geo.query?.value).toBe('8.8.8.8');
        expect(geo.query?.ipVersion).toBe(4);

        expect(geo.location?.continent?.code).toBe('NA');
        expect(geo.location?.continent?.name).toBe('North America');
        expect(geo.location?.country?.code).toBe('US');
        expect(geo.location?.country?.name).toBe('United States');
        expect(geo.location?.country?.flag).toBe('🇺🇸');
        expect(geo.location?.country?.unions).toEqual([]);
        expect(geo.location?.region?.code).toBe('CA');
        expect(geo.location?.region?.name).toBe('California');
        expect(geo.location?.city).toBe('Mountain View');
        expect(geo.location?.postalCode).toBe('94043');
        expect(geo.location?.coordinates?.latitude).toBe(37.386);
        expect(geo.location?.coordinates?.longitude).toBe(-122.084);
        expect(geo.location?.coordinates?.accuracyRadius).toBe(621);
        expect(geo.location?.timezone).toBe('America/Los_Angeles');
        expect(geo.location?.utcOffset).toBe('-07:00');
        expect(geo.location?.geoConfidence).toBe(1.0);
        expect(geo.location?.timezoneFromClient).toBe(false);

        expect(geo.network?.asn).toBe('AS15169');
        expect(geo.network?.organization).toBe('Google LLC');
        expect(geo.network?.domain).toBe('google.com');

        expect(geo.sources?.geo).toEqual(['dbip', 'ip2location']);
        expect(geo.sources?.asn).toEqual(['ipinfo']);

        expect(geo.meta?.precision).toBe('city');
        expect(geo.meta?.tier).toBe('free');
        expect(geo.meta?.requestId).toBe('abc-123');
        expect(geo.meta?.degraded).toBe(false);
    });

    test('falls back to ip param when query.value is missing', () => {
        const raw = { query: { type: 'ip' } };
        const geo = normalizeApiResponse(raw, '1.2.3.4');
        expect(geo.query?.value).toBe('1.2.3.4');
    });

    test('sets timezoneFromClient to false when location exists', () => {
        const raw = { location: { country: { code: 'US' } } };
        const geo = normalizeApiResponse(raw, '8.8.8.8');
        expect(geo.location?.timezoneFromClient).toBe(false);
    });

    test('leaves location undefined when not in response', () => {
        const raw = { query: { type: 'ip', value: '8.8.8.8' } };
        const geo = normalizeApiResponse(raw, '8.8.8.8');
        expect(geo.location).toBeUndefined();
    });

    test('handles empty response', () => {
        const geo = normalizeApiResponse({}, '8.8.8.8');
        expect(geo.query?.value).toBe('8.8.8.8');
        expect(geo.location).toBeUndefined();
        expect(geo.network).toBeUndefined();
        expect(geo.sources).toBeUndefined();
        expect(geo.meta).toBeUndefined();
    });

    test('handles partial location (country only)', () => {
        const raw = {
            query: { type: 'ip', value: '8.8.8.8' },
            location: {
                country: { code: 'US', name: 'United States' },
            },
        };
        const geo = normalizeApiResponse(raw, '8.8.8.8');
        expect(geo.location?.country?.code).toBe('US');
        expect(geo.location?.city).toBeUndefined();
        expect(geo.location?.coordinates).toBeUndefined();
    });

    test('handles EU country with unions', () => {
        const raw = {
            location: {
                country: { code: 'DE', name: 'Germany', flag: '🇩🇪', unions: ['EU'] },
            },
        };
        const geo = normalizeApiResponse(raw);
        expect(geo.location?.country?.unions).toEqual(['EU']);
    });
});
