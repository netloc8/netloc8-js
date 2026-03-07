import { describe, test, expect } from 'bun:test';
import { reconcileGeo } from './reconcile';
import type { Geo } from './types';

describe('reconcileGeo', () => {
    test('fast path: cookie with timezoneFromClient and matching IP', () => {
        const cookie: Partial<Geo> = {
            ip: '8.8.8.8',
            country: 'US',
            city: 'Mountain View',
            timezone: 'America/Los_Angeles',
            timezoneFromClient: true,
        };

        const result = reconcileGeo({ cookie, ip: '8.8.8.8' });
        expect(result).toEqual(cookie);
    });

    test('API overwrites platform headers', () => {
        const platform: Partial<Geo> = {
            country: 'US',
        };

        const api: Partial<Geo> = {
            country: 'US',
            city: 'Dallas',
            timezone: 'America/Chicago',
            timezoneFromClient: false,
        };

        const result = reconcileGeo({ platform, api, ip: '8.8.8.8' });
        expect(result.city).toBe('Dallas');
        expect(result.timezone).toBe('America/Chicago');
        expect(result.ip).toBe('8.8.8.8');
    });

    test('platform headers used when no API response', () => {
        const platform: Partial<Geo> = {
            country: 'DE',
            timezone: 'Europe/Berlin',
        };

        const result = reconcileGeo({ platform, ip: '1.2.3.4' });
        expect(result.country).toBe('DE');
        expect(result.timezone).toBe('Europe/Berlin');
    });

    test('preserves browser timezone when IP changes', () => {
        const cookie: Partial<Geo> = {
            ip: '8.8.8.8',
            country: 'US',
            timezone: 'America/Los_Angeles',
            timezoneFromClient: true,
        };

        const api: Partial<Geo> = {
            country: 'DE',
            timezone: 'Europe/Berlin',
            timezoneFromClient: false,
        };

        const result = reconcileGeo({ cookie, api, ip: '1.2.3.4' });
        // Location should come from API (new IP)
        expect(result.country).toBe('DE');
        // But timezone should be preserved from cookie (browser-confirmed), marked stale
        expect(result.timezone).toBe('America/Los_Angeles');
        expect(result.timezoneFromClient).toBe(false);
    });

    test('returns minimal geo with just IP when no sources', () => {
        const result = reconcileGeo({ ip: '8.8.8.8' });
        expect(result.ip).toBe('8.8.8.8');
        expect(result.country).toBeUndefined();
    });
});
