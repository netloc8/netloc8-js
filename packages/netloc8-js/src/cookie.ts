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

        // Explicitly pick known properties to avoid prototype pollution or unexpected data
        const safeGeo: Partial<Geo> = {};

        if (typeof parsed.ip === 'string') safeGeo.ip = parsed.ip;
        if (typeof parsed.ipVersion === 'number') safeGeo.ipVersion = parsed.ipVersion;
        if (typeof parsed.continent === 'string') safeGeo.continent = parsed.continent;
        if (typeof parsed.continentName === 'string') safeGeo.continentName = parsed.continentName;
        if (typeof parsed.country === 'string') safeGeo.country = parsed.country;
        if (typeof parsed.countryName === 'string') safeGeo.countryName = parsed.countryName;
        if (typeof parsed.isEU === 'boolean') safeGeo.isEU = parsed.isEU;
        if (typeof parsed.region === 'string') safeGeo.region = parsed.region;
        if (typeof parsed.regionName === 'string') safeGeo.regionName = parsed.regionName;
        if (typeof parsed.city === 'string') safeGeo.city = parsed.city;
        if (typeof parsed.postalCode === 'string') safeGeo.postalCode = parsed.postalCode;
        if (typeof parsed.latitude === 'number') safeGeo.latitude = parsed.latitude;
        if (typeof parsed.longitude === 'number') safeGeo.longitude = parsed.longitude;
        if (typeof parsed.timezone === 'string') safeGeo.timezone = parsed.timezone;
        if (typeof parsed.accuracyRadius === 'number') safeGeo.accuracyRadius = parsed.accuracyRadius;
        if (typeof parsed.precision === 'string') safeGeo.precision = parsed.precision;
        if (typeof parsed.isLimited === 'boolean') safeGeo.isLimited = parsed.isLimited;
        if (typeof parsed.limitReason === 'string') safeGeo.limitReason = parsed.limitReason;
        if (typeof parsed.timezoneFromClient === 'boolean') safeGeo.timezoneFromClient = parsed.timezoneFromClient;

        return safeGeo;
    } catch {
        return {};
    }
}
