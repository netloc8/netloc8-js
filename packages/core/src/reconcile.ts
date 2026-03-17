import type { Geo } from './types';

export interface ReconcileSources {
    cookie?: Partial<Geo>;
    platform?: Partial<Geo>;
    api?: Partial<Geo>;
    ip?: string;
}

/**
 * Deep-merge a source value into the target, skipping undefined values.
 * Only merges plain objects one level at a time — arrays and primitives
 * are replaced rather than merged.
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(source)) {
        if (value === undefined) {
            continue;
        }

        if (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            typeof target[key] === 'object' &&
            target[key] !== null &&
            !Array.isArray(target[key])
        ) {
            deepMerge(target[key] as Record<string, unknown>, value as Record<string, unknown>);
        } else {
            target[key] = value;
        }
    }
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
    const geo: Geo = {};
    if (ip) {
        geo.query = { value: ip };
    }

    // Layer in cookie fields (lowest priority — stale but useful fallback)
    if (cookie) {
        deepMerge(geo as Record<string, unknown>, cookie as Record<string, unknown>);
    }

    // Layer in platform headers (partial — may only have country)
    if (platform) {
        deepMerge(geo as Record<string, unknown>, platform as Record<string, unknown>);
    }

    // Layer in API response (most complete — overwrites platform fields)
    if (api) {
        deepMerge(geo as Record<string, unknown>, api as Record<string, unknown>);
    }

    // If cookie had timezoneFromClient but IP changed,
    // keep the browser timezone but mark it as stale
    if (
        cookie?.location?.timezoneFromClient === true &&
        cookie?.query?.value !== ip &&
        cookie?.location?.timezone
    ) {
        if (!geo.location) geo.location = {};
        geo.location.timezone = cookie.location.timezone;
        geo.location.timezoneFromClient = false;
    }

    // Ensure IP is set
    if (ip) {
        if (!geo.query) geo.query = {};
        geo.query.value = ip;
    }

    return geo;
}
