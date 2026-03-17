import type { Geo } from './types';

export interface ReconcileSources {
    cookie?: Partial<Geo>;
    platform?: Partial<Geo>;
    api?: Partial<Geo>;
    ip?: string;
}

/**
 * Merge geo data from multiple sources into a single authoritative Geo object.
 *
 * Source priority (highest to lowest):
 *   1. Fresh API response  (most complete)
 *   2. Platform headers  (zero-cost, may be partial)
 *   3. Cookie (including timezoneFromClient)  (stale, client-controlled)
 *
 * Cookie location fields are never treated as fully authoritative; they are
 * only used as a fallback when no better data is available. The browser-
 * confirmed timezone (`timezoneFromClient`) is trusted when the IP matches.
 */
export function reconcileGeo(sources: ReconcileSources): Geo {
    const { cookie, platform, api, ip } = sources;

    // Build merged geo from lowest to highest priority
    const geo: Geo = { ip };

    // Layer in cookie fields (lowest priority — stale but useful fallback)
    if (cookie) {
        Object.assign(geo, stripUndefined(cookie));
    }

    // Layer in platform headers (partial — may only have country)
    if (platform) {
        Object.assign(geo, stripUndefined(platform));
    }

    // Layer in API response (most complete — overwrites platform fields)
    if (api) {
        Object.assign(geo, stripUndefined(api));
    }

    // If cookie had timezoneFromClient but IP changed,
    // keep the browser timezone but mark it as stale
    if (
        cookie?.timezoneFromClient === true &&
        cookie?.ip !== ip &&
        cookie?.timezone
    ) {
        geo.timezone = cookie.timezone;
        geo.timezoneFromClient = false;
    }

    // Ensure IP is set
    geo.ip = ip;

    return geo;
}

/**
 * Remove undefined values from an object so Object.assign doesn't overwrite
 * existing values with undefined.
 */
function stripUndefined(obj: Partial<Geo>): Partial<Geo> {
    const result: Partial<Geo> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            (result as Record<string, unknown>)[key] = value;
        }
    }
    return result;
}
