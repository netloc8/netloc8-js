import type { Geo } from '@netloc8/core';

/**
 * Header-to-Geo field mapping.
 */
const HEADER_MAP: Array<[string, keyof Geo, 'string' | 'number' | 'boolean']> = [
    ['x-netloc8-ip', 'ip', 'string'],
    ['x-netloc8-ip-version', 'ipVersion', 'number'],
    ['x-netloc8-continent', 'continent', 'string'],
    ['x-netloc8-continent-name', 'continentName', 'string'],
    ['x-netloc8-country', 'country', 'string'],
    ['x-netloc8-country-name', 'countryName', 'string'],
    ['x-netloc8-is-eu', 'isEU', 'boolean'],
    ['x-netloc8-region', 'region', 'string'],
    ['x-netloc8-region-name', 'regionName', 'string'],
    ['x-netloc8-city', 'city', 'string'],
    ['x-netloc8-postal-code', 'postalCode', 'string'],
    ['x-netloc8-latitude', 'latitude', 'number'],
    ['x-netloc8-longitude', 'longitude', 'number'],
    ['x-netloc8-timezone', 'timezone', 'string'],
    ['x-netloc8-accuracy-radius', 'accuracyRadius', 'number'],
    ['x-netloc8-precision', 'precision', 'string'],
    ['x-netloc8-is-limited', 'isLimited', 'boolean'],
    ['x-netloc8-limit-reason', 'limitReason', 'string'],
    ['x-netloc8-timezone-from-client', 'timezoneFromClient', 'boolean'],
];

/**
 * Get the full geolocation data for the current request.
 * Must be called from a Server Component, Route Handler, or Server Action.
 *
 * Returns the Geo object populated by the proxy. If the proxy did not run
 * (e.g. the route is excluded from the matcher), returns an empty object.
 */
export async function getGeo(): Promise<Geo> {
    try {
        const { headers } = await import('next/headers');
        const h = await headers();
        const geo: Geo = {};

        for (const [header, field, type] of HEADER_MAP) {
            const raw = h.get(header);
            if (raw === null) {
                continue;
            }

            try {
                const decoded = decodeURIComponent(raw);

                if (type === 'number') {
                    const num = parseFloat(decoded);
                    if (!isNaN(num)) {
                        (geo as Record<string, unknown>)[field] = num;
                    }
                } else if (type === 'boolean') {
                    (geo as Record<string, unknown>)[field] = decoded === 'true';
                } else {
                    (geo as Record<string, unknown>)[field] = decoded;
                }
            } catch {
                // Skip this header if decodeURIComponent throws
            }
        }

        return geo;
    } catch {
        return {};
    }
}

/**
 * Get the timezone for the current request.
 * Shorthand for (await getGeo()).timezone.
 */
export async function getTimezone(): Promise<string | undefined> {
    const geo = await getGeo();
    return geo.timezone;
}
