import type { Geo } from './types';

/** Lazy-cached Intl.DisplayNames instance for country code → name lookups. */
let regionNames: Intl.DisplayNames | undefined;

function getRegionNames(): Intl.DisplayNames | undefined {
    if (regionNames) {
        return regionNames;
    }
    try {
        regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        return regionNames;
    } catch {
        return undefined;
    }
}

/**
 * Extract geo information from platform/CDN request headers.
 * Supports Vercel, Cloudflare, and CloudFront.
 *
 * Returns a partial Geo object — fields not provided by the platform are absent.
 */
export function getGeoFromPlatformHeaders(headers: Headers): Partial<Geo> {
    const geo: Partial<Geo> = {};

    // --- Vercel headers ---

    const vercelCountry = headers.get('x-vercel-ip-country');
    if (vercelCountry) {
        if (!geo.location) geo.location = {};
        if (!geo.location.country) geo.location.country = {};
        geo.location.country.code = vercelCountry;
    }

    const vercelRegion = headers.get('x-vercel-ip-country-region');
    if (vercelRegion) {
        if (!geo.location) geo.location = {};
        if (!geo.location.region) geo.location.region = {};
        geo.location.region.code = vercelRegion;
    }

    const vercelCity = headers.get('x-vercel-ip-city');
    if (vercelCity !== null) {
        if (!geo.location) geo.location = {};
        try {
            geo.location.city = decodeURIComponent(vercelCity);
        } catch {
            geo.location.city = vercelCity;
        }
    }

    const vercelLat = headers.get('x-vercel-ip-latitude');
    if (vercelLat) {
        const lat = parseFloat(vercelLat);
        if (isFinite(lat)) {
            if (!geo.location) geo.location = {};
            if (!geo.location.coordinates) geo.location.coordinates = {};
            geo.location.coordinates.latitude = lat;
        }
    }

    const vercelLng = headers.get('x-vercel-ip-longitude');
    if (vercelLng) {
        const lng = parseFloat(vercelLng);
        if (isFinite(lng)) {
            if (!geo.location) geo.location = {};
            if (!geo.location.coordinates) geo.location.coordinates = {};
            geo.location.coordinates.longitude = lng;
        }
    }

    const vercelTz = headers.get('x-vercel-ip-timezone');
    if (vercelTz) {
        if (!geo.location) geo.location = {};
        geo.location.timezone = vercelTz;
    }

    // --- Cloudflare headers ---

    const cfCountry = headers.get('cf-ipcountry');
    if (cfCountry && !geo.location?.country?.code) {
        if (!geo.location) geo.location = {};
        if (!geo.location.country) geo.location.country = {};
        geo.location.country.code = cfCountry;
    }

    // --- CloudFront headers ---

    const cfrontCountry = headers.get('cloudfront-viewer-country');
    if (cfrontCountry && !geo.location?.country?.code) {
        if (!geo.location) geo.location = {};
        if (!geo.location.country) geo.location.country = {};
        geo.location.country.code = cfrontCountry;
    }

    // --- Enrich country code → name via Intl.DisplayNames (zero-cost, no API call) ---

    if (geo.location?.country?.code && !geo.location.country.name) {
        const names = getRegionNames();
        if (names) {
            const name = names.of(geo.location.country.code);
            if (name) {
                geo.location.country.name = name;
            }
        }
    }

    return geo;
}
