import type { Geo } from './types';

/**
 * Extract geo information from platform/CDN request headers.
 * Supports Vercel, Cloudflare, and CloudFront.
 *
 * Returns a partial Geo object — fields not provided by the platform are absent.
 */
export function getGeoFromPlatformHeaders(headers: Headers): Partial<Geo> {
    const geo: Partial<Geo> = {};

    // Vercel headers
    const vercelCountry = headers.get('x-vercel-ip-country');
    if (vercelCountry) {
        geo.country = vercelCountry;
    }

    const vercelRegion = headers.get('x-vercel-ip-country-region');
    if (vercelRegion) {
        geo.region = vercelRegion;
    }

    const vercelCity = headers.get('x-vercel-ip-city');
    if (vercelCity !== null) {
        geo.city = decodeURIComponent(vercelCity);
    }

    const vercelLat = headers.get('x-vercel-ip-latitude');
    if (vercelLat) {
        geo.latitude = parseFloat(vercelLat);
    }

    const vercelLng = headers.get('x-vercel-ip-longitude');
    if (vercelLng) {
        geo.longitude = parseFloat(vercelLng);
    }

    const vercelTz = headers.get('x-vercel-ip-timezone');
    if (vercelTz) {
        geo.timezone = vercelTz;
    }

    // Cloudflare headers
    const cfCountry = headers.get('cf-ipcountry');
    if (cfCountry && !geo.country) {
        geo.country = cfCountry;
    }

    // CloudFront headers
    const cfrontCountry = headers.get('cloudfront-viewer-country');
    if (cfrontCountry && !geo.country) {
        geo.country = cfrontCountry;
    }

    return geo;
}
