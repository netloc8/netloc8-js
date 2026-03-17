import type { Geo, CookieOptions } from './types';

/** Cookie name used by the plugin. */
export const COOKIE_NAME = '__netloc8_geo';

/** Default cookie options. `secure` is disabled in development for http://localhost. */
export const COOKIE_OPTIONS: CookieOptions = {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 2_592_000, // 30 days
};

/**
 * Serialize a Geo object into a cookie value string (JSON, URI-encoded).
 */
export function serializeCookie(geo: Geo): string {
    return encodeURIComponent(JSON.stringify(geo));
}

/**
 * Parse a cookie value string back into a Geo object.
 * Returns an empty object if corrupt or unparseable.
 */
export function parseCookie(value: string | undefined): Partial<Geo> {
    if (!value) {
        return {};
    }

    try {
        const decoded = decodeURIComponent(value);
        const parsed = JSON.parse(decoded);

        if (typeof parsed !== 'object' || parsed === null) {
            return {};
        }

        // Explicitly reconstruct known Geo properties to avoid prototype pollution
        const geo: Partial<Geo> = {};

        // query
        if (typeof parsed.query === 'object' && parsed.query !== null) {
            geo.query = {};
            if (typeof parsed.query.type === 'string') geo.query.type = parsed.query.type;
            if (typeof parsed.query.value === 'string') geo.query.value = parsed.query.value;
            if (typeof parsed.query.ipVersion === 'number') geo.query.ipVersion = parsed.query.ipVersion;
        }

        // location
        if (typeof parsed.location === 'object' && parsed.location !== null) {
            const loc = parsed.location;
            geo.location = {};

            if (typeof loc.continent === 'object' && loc.continent !== null) {
                geo.location.continent = {};
                if (typeof loc.continent.code === 'string') geo.location.continent.code = loc.continent.code;
                if (typeof loc.continent.name === 'string') geo.location.continent.name = loc.continent.name;
            }

            if (typeof loc.country === 'object' && loc.country !== null) {
                geo.location.country = {};
                if (typeof loc.country.code === 'string') geo.location.country.code = loc.country.code;
                if (typeof loc.country.name === 'string') geo.location.country.name = loc.country.name;
                if (typeof loc.country.flag === 'string') geo.location.country.flag = loc.country.flag;
                if (Array.isArray(loc.country.unions)) {
                    geo.location.country.unions = loc.country.unions.filter((u: unknown) => typeof u === 'string');
                }
            }

            if (typeof loc.region === 'object' && loc.region !== null) {
                geo.location.region = {};
                if (typeof loc.region.code === 'string') geo.location.region.code = loc.region.code;
                if (typeof loc.region.name === 'string') geo.location.region.name = loc.region.name;
            }

            if (typeof loc.district === 'string') geo.location.district = loc.district;
            if (typeof loc.city === 'string') geo.location.city = loc.city;
            if (typeof loc.postalCode === 'string') geo.location.postalCode = loc.postalCode;

            if (typeof loc.coordinates === 'object' && loc.coordinates !== null) {
                geo.location.coordinates = {};
                if (typeof loc.coordinates.latitude === 'number') geo.location.coordinates.latitude = loc.coordinates.latitude;
                if (typeof loc.coordinates.longitude === 'number') geo.location.coordinates.longitude = loc.coordinates.longitude;
                if (typeof loc.coordinates.accuracyRadius === 'number') geo.location.coordinates.accuracyRadius = loc.coordinates.accuracyRadius;
            }

            if (typeof loc.timezone === 'string') geo.location.timezone = loc.timezone;
            if (typeof loc.utcOffset === 'string') geo.location.utcOffset = loc.utcOffset;
            if (typeof loc.geoConfidence === 'number') geo.location.geoConfidence = loc.geoConfidence;
            if (typeof loc.timezoneFromClient === 'boolean') geo.location.timezoneFromClient = loc.timezoneFromClient;
        }

        // network
        if (typeof parsed.network === 'object' && parsed.network !== null) {
            geo.network = {};
            if (typeof parsed.network.asn === 'string') geo.network.asn = parsed.network.asn;
            if (typeof parsed.network.organization === 'string') geo.network.organization = parsed.network.organization;
            if (typeof parsed.network.domain === 'string') geo.network.domain = parsed.network.domain;
        }

        // sources
        if (typeof parsed.sources === 'object' && parsed.sources !== null) {
            geo.sources = {};
            if (Array.isArray(parsed.sources.geo)) {
                geo.sources.geo = parsed.sources.geo.filter((s: unknown) => typeof s === 'string');
            }
            if (Array.isArray(parsed.sources.asn)) {
                geo.sources.asn = parsed.sources.asn.filter((s: unknown) => typeof s === 'string');
            }
            if (Array.isArray(parsed.sources.tz)) {
                geo.sources.tz = parsed.sources.tz.filter((s: unknown) => typeof s === 'string');
            }
        }

        // meta
        if (typeof parsed.meta === 'object' && parsed.meta !== null) {
            geo.meta = {};
            if (typeof parsed.meta.precision === 'string') geo.meta.precision = parsed.meta.precision;
            if (typeof parsed.meta.tier === 'string') geo.meta.tier = parsed.meta.tier;
            if (typeof parsed.meta.requestId === 'string') geo.meta.requestId = parsed.meta.requestId;
            if (typeof parsed.meta.degraded === 'boolean') geo.meta.degraded = parsed.meta.degraded;
        }

        return geo;
    } catch {
        return {};
    }
}
