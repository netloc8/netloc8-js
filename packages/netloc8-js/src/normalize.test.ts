import { describe, test, expect } from 'bun:test';
import { normalizeApiResponse } from './normalize';

describe('normalizeApiResponse', () => {
    test('maps a full API response', () => {
        const raw = {
            ip: '8.8.8.8',
            ipVersion: 4,
            continent: 'NA',
            continentName: 'North America',
            country: 'US',
            countryName: 'United States',
            isEU: false,
            region: 'CA',
            regionName: 'California',
            city: 'Mountain View',
            postalCode: '94035',
            latitude: 37.386,
            longitude: -122.0838,
            timezone: 'America/Los_Angeles',
            accuracyRadius: 621,
            precision: 'city',
        };

        const geo = normalizeApiResponse(raw, '8.8.8.8');

        expect(geo.ip).toBe('8.8.8.8');
        expect(geo.ipVersion).toBe(4);
        expect(geo.continent).toBe('NA');
        expect(geo.continentName).toBe('North America');
        expect(geo.country).toBe('US');
        expect(geo.countryName).toBe('United States');
        expect(geo.isEU).toBe(false);
        expect(geo.region).toBe('CA');
        expect(geo.regionName).toBe('California');
        expect(geo.city).toBe('Mountain View');
        expect(geo.postalCode).toBe('94035');
        expect(geo.latitude).toBe(37.386);
        expect(geo.longitude).toBe(-122.0838);
        expect(geo.timezone).toBe('America/Los_Angeles');
        expect(geo.accuracyRadius).toBe(621);
        expect(geo.precision).toBe('city');
        expect(geo.timezoneFromClient).toBe(false);
    });

    test('falls back to ip param when raw.ip is missing', () => {
        const raw = { country: 'US' };
        const geo = normalizeApiResponse(raw, '1.2.3.4');
        expect(geo.ip).toBe('1.2.3.4');
    });

    test('sets timezoneFromClient to false', () => {
        const geo = normalizeApiResponse({}, '8.8.8.8');
        expect(geo.timezoneFromClient).toBe(false);
    });

    test('handles partial response (missing fields)', () => {
        const raw = {
            ip: '8.8.8.8',
            country: 'US',
            countryName: 'United States',
        };

        const geo = normalizeApiResponse(raw, '8.8.8.8');
        expect(geo.country).toBe('US');
        expect(geo.city).toBeUndefined();
        expect(geo.latitude).toBeUndefined();
        expect(geo.timezone).toBeUndefined();
    });
});
