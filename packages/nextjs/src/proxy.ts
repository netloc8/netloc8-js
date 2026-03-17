declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;

import type { Geo } from '@netloc8/core';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
    getClientIp,
    isPublicIp,
    getGeoFromPlatformHeaders,
    fetchGeo,
    normalizeApiResponse,
    parseCookie,
    serializeCookie,
    reconcileGeo,
    COOKIE_NAME,
    COOKIE_OPTIONS,
} from '@netloc8/core';

interface CreateProxyOptions {
    timeout?: number;
    apiKey?: string;
    apiUrl?: string;
    testIp?: string;
    handler?: (
        request: NextRequest,
        geo: Geo
    ) => NextResponse | undefined | Promise<NextResponse | undefined>;
}

interface GeoRedirectOptions {
    defaultLocale: string;
    localeMap: Record<string, string>;
    excludePaths?: string[];
}

// --- Header transport ---
// These map nested Geo paths to/from x-netloc8-* request headers
// for the proxy → Server Component transport layer.

interface HeaderEntry {
    header: string;
    get: (geo: Geo) => string | number | boolean | string[] | undefined;
    set: (geo: Geo, raw: string) => void;
    type: 'string' | 'number' | 'boolean' | 'json';
}

const HEADER_ENTRIES: HeaderEntry[] = [
    {
        header: 'x-netloc8-ip',
        get: (g) => g.query?.value,
        set: (g, v) => { if (!g.query) g.query = {}; g.query.value = v; },
        type: 'string',
    },
    {
        header: 'x-netloc8-ip-version',
        get: (g) => g.query?.ipVersion,
        set: (g, v) => { const n = parseFloat(v); if (!Number.isFinite(n)) return; if (!g.query) g.query = {}; g.query.ipVersion = n; },
        type: 'number',
    },
    {
        header: 'x-netloc8-continent-code',
        get: (g) => g.location?.continent?.code,
        set: (g, v) => {
            if (!g.location) g.location = {};
            if (!g.location.continent) g.location.continent = {};
            g.location.continent.code = v;
        },
        type: 'string',
    },
    {
        header: 'x-netloc8-continent-name',
        get: (g) => g.location?.continent?.name,
        set: (g, v) => {
            if (!g.location) g.location = {};
            if (!g.location.continent) g.location.continent = {};
            g.location.continent.name = v;
        },
        type: 'string',
    },
    {
        header: 'x-netloc8-country-code',
        get: (g) => g.location?.country?.code,
        set: (g, v) => {
            if (!g.location) g.location = {};
            if (!g.location.country) g.location.country = {};
            g.location.country.code = v;
        },
        type: 'string',
    },
    {
        header: 'x-netloc8-country-name',
        get: (g) => g.location?.country?.name,
        set: (g, v) => {
            if (!g.location) g.location = {};
            if (!g.location.country) g.location.country = {};
            g.location.country.name = v;
        },
        type: 'string',
    },
    {
        header: 'x-netloc8-country-flag',
        get: (g) => g.location?.country?.flag,
        set: (g, v) => {
            if (!g.location) g.location = {};
            if (!g.location.country) g.location.country = {};
            g.location.country.flag = v;
        },
        type: 'string',
    },
    {
        header: 'x-netloc8-country-unions',
        get: (g) => g.location?.country?.unions,
        set: (g, v) => {
            if (!g.location) g.location = {};
            if (!g.location.country) g.location.country = {};
            try {
                const parsed = JSON.parse(v);
                if (Array.isArray(parsed)) {
                    g.location.country.unions = parsed;
                }
            } catch {
                // Skip malformed JSON
            }
        },
        type: 'json',
    },
    {
        header: 'x-netloc8-region-code',
        get: (g) => g.location?.region?.code,
        set: (g, v) => {
            if (!g.location) g.location = {};
            if (!g.location.region) g.location.region = {};
            g.location.region.code = v;
        },
        type: 'string',
    },
    {
        header: 'x-netloc8-region-name',
        get: (g) => g.location?.region?.name,
        set: (g, v) => {
            if (!g.location) g.location = {};
            if (!g.location.region) g.location.region = {};
            g.location.region.name = v;
        },
        type: 'string',
    },
    {
        header: 'x-netloc8-district',
        get: (g) => g.location?.district,
        set: (g, v) => { if (!g.location) g.location = {}; g.location.district = v; },
        type: 'string',
    },
    {
        header: 'x-netloc8-city',
        get: (g) => g.location?.city,
        set: (g, v) => { if (!g.location) g.location = {}; g.location.city = v; },
        type: 'string',
    },
    {
        header: 'x-netloc8-postal-code',
        get: (g) => g.location?.postalCode,
        set: (g, v) => { if (!g.location) g.location = {}; g.location.postalCode = v; },
        type: 'string',
    },
    {
        header: 'x-netloc8-latitude',
        get: (g) => g.location?.coordinates?.latitude,
        set: (g, v) => {
            if (!g.location) g.location = {};
            if (!g.location.coordinates) g.location.coordinates = {};
            const n = parseFloat(v); if (!Number.isFinite(n)) return;
            g.location.coordinates.latitude = n;
        },
        type: 'number',
    },
    {
        header: 'x-netloc8-longitude',
        get: (g) => g.location?.coordinates?.longitude,
        set: (g, v) => {
            if (!g.location) g.location = {};
            if (!g.location.coordinates) g.location.coordinates = {};
            const n = parseFloat(v); if (!Number.isFinite(n)) return;
            g.location.coordinates.longitude = n;
        },
        type: 'number',
    },
    {
        header: 'x-netloc8-accuracy-radius',
        get: (g) => g.location?.coordinates?.accuracyRadius,
        set: (g, v) => {
            if (!g.location) g.location = {};
            if (!g.location.coordinates) g.location.coordinates = {};
            const n = parseFloat(v); if (!Number.isFinite(n)) return;
            g.location.coordinates.accuracyRadius = n;
        },
        type: 'number',
    },
    {
        header: 'x-netloc8-timezone',
        get: (g) => g.location?.timezone,
        set: (g, v) => { if (!g.location) g.location = {}; g.location.timezone = v; },
        type: 'string',
    },
    {
        header: 'x-netloc8-utc-offset',
        get: (g) => g.location?.utcOffset,
        set: (g, v) => { if (!g.location) g.location = {}; g.location.utcOffset = v; },
        type: 'string',
    },
    {
        header: 'x-netloc8-geo-confidence',
        get: (g) => g.location?.geoConfidence,
        set: (g, v) => { const n = parseFloat(v); if (!Number.isFinite(n)) return; if (!g.location) g.location = {}; g.location.geoConfidence = n; },
        type: 'number',
    },
    {
        header: 'x-netloc8-asn',
        get: (g) => g.network?.asn,
        set: (g, v) => { if (!g.network) g.network = {}; g.network.asn = v; },
        type: 'string',
    },
    {
        header: 'x-netloc8-asn-org',
        get: (g) => g.network?.organization,
        set: (g, v) => { if (!g.network) g.network = {}; g.network.organization = v; },
        type: 'string',
    },
    {
        header: 'x-netloc8-asn-domain',
        get: (g) => g.network?.domain,
        set: (g, v) => { if (!g.network) g.network = {}; g.network.domain = v; },
        type: 'string',
    },
    {
        header: 'x-netloc8-precision',
        get: (g) => g.meta?.precision,
        set: (g, v) => { if (!g.meta) g.meta = {}; g.meta.precision = v; },
        type: 'string',
    },
    {
        header: 'x-netloc8-degraded',
        get: (g) => g.meta?.degraded,
        set: (g, v) => { if (!g.meta) g.meta = {}; g.meta.degraded = v === 'true'; },
        type: 'boolean',
    },
    {
        header: 'x-netloc8-timezone-from-client',
        get: (g) => g.location?.timezoneFromClient,
        set: (g, v) => { if (!g.location) g.location = {}; g.location.timezoneFromClient = v === 'true'; },
        type: 'boolean',
    },
];

/**
 * Set x-netloc8-* request headers from a Geo object.
 */
function setGeoHeaders(requestHeaders: Headers, geo: Geo): void {
    for (const entry of HEADER_ENTRIES) {
        const value = entry.get(geo);
        if (value !== undefined && value !== null) {
            if (entry.type === 'json') {
                requestHeaders.set(entry.header, encodeURIComponent(JSON.stringify(value)));
            } else {
                requestHeaders.set(entry.header, encodeURIComponent(String(value)));
            }
        }
    }
}

/**
 * Read x-netloc8-* request headers back into a Geo object.
 * Used by server.ts to reconstruct Geo on the server side.
 */
export function readGeoHeaders(headers: Headers): Geo {
    const geo: Geo = {};

    for (const entry of HEADER_ENTRIES) {
        const raw = headers.get(entry.header);
        if (raw === null) {
            continue;
        }

        try {
            const decoded = decodeURIComponent(raw);
            entry.set(geo, decoded);
        } catch {
            // Skip this header if decodeURIComponent throws
        }
    }

    return geo;
}

/**
 * Create a Next.js 16 proxy function that resolves geolocation for every
 * matching request.
 *
 * Returns a standard proxy function that can be exported directly from the
 * user's proxy.ts / proxy.js file, or composed with other proxy logic.
 */
export function createProxy(options?: CreateProxyOptions):
    (request: NextRequest) => Promise<NextResponse> {

    return async (request: NextRequest): Promise<NextResponse> => {
        const apiKey = options?.apiKey ?? process.env.NETLOC8_API_KEY;
        const apiUrl = options?.apiUrl ?? process.env.NETLOC8_API_URL;
        const timeout = options?.timeout ?? 1500;

        // Security: Remove any incoming spoofed headers
        const requestHeaders = new Headers(request.headers);
        for (const entry of HEADER_ENTRIES) {
            requestHeaders.delete(entry.header);
        }

        // 1. Determine client IP
        let clientIp: string | undefined;

        if (process.env.NODE_ENV !== 'production') {
            clientIp = options?.testIp ?? process.env.NETLOC8_TEST_IP;
        }

        if (!clientIp) {
            clientIp = getClientIp(request.headers);
        }

        // 2. Check the cookie cache (fast path)
        const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
        const cookieGeo = parseCookie(cookieValue);

        // Cookie fast path: only trust timezone/timezoneFromClient from the
        // client-controlled cookie. Re-resolve other geo fields to prevent
        // spoofing of country/region/city via cookie manipulation.
        const cookieTimezone = (
            cookieGeo.location?.timezoneFromClient === true &&
            cookieGeo.query?.value === clientIp
        ) ? {
            timezone: cookieGeo.location.timezone,
            timezoneFromClient: cookieGeo.location.timezoneFromClient,
        } : undefined;

        // 3. Extract platform headers (zero-cost)
        const platformGeo = getGeoFromPlatformHeaders(request.headers);

        // 4. Decide whether to call the API
        let apiGeo: Geo | undefined;

        if (clientIp && isPublicIp(clientIp) && !platformGeo.location?.country?.code && !cookieTimezone) {
            const raw = await fetchGeo(clientIp, { apiKey, apiUrl, timeout, clientId: typeof __PKG_NAME__ !== 'undefined' ? `${__PKG_NAME__}/${__PKG_VERSION__}` : undefined });
            if (raw) {
                apiGeo = normalizeApiResponse(raw, clientIp);
            }
        }

        // 5. Reconcile all sources — cookie is lowest priority in
        //    reconcileGeo, so platform headers and API data overwrite it.
        //    Pass the full cookie so self-hosted deployments (no platform
        //    headers, API call skipped) still have city/country/region.
        const geo = reconcileGeo({
            cookie: cookieGeo.query?.value ? cookieGeo : undefined,
            platform: platformGeo,
            api: apiGeo,
            ip: clientIp,
        });

        // Apply trusted cookie timezone if available
        if (cookieTimezone) {
            if (!geo.location) geo.location = {};
            geo.location.timezone = cookieTimezone.timezone;
            geo.location.timezoneFromClient = cookieTimezone.timezoneFromClient;
        }

        // 6. Set request headers
        setGeoHeaders(requestHeaders, geo);

        // 7. Build the response — use sanitized headers in the handler
        let handlerResponse: NextResponse | undefined;
        if (options?.handler) {
            const sanitizedRequest = new Request(request.nextUrl.toString(), {
                method: request.method ?? 'GET',
                headers: requestHeaders,
                body: request.body,
                // @ts-expect-error -- NextRequest supports duplex but TS doesn't expose it
                duplex: 'half',
            });
            handlerResponse = await options.handler(
                Object.assign(sanitizedRequest, { nextUrl: request.nextUrl, cookies: request.cookies }) as NextRequest,
                geo
            );
        }

        const response = handlerResponse ?? NextResponse.next({
            request: { headers: requestHeaders },
        });

        // 8. Set/update the cookie if needed
        if (!cookieValue || cookieGeo.query?.value !== clientIp) {
            response.cookies.set(COOKIE_NAME, serializeCookie(geo), {
                path: COOKIE_OPTIONS.path,
                httpOnly: COOKIE_OPTIONS.httpOnly,
                secure: COOKIE_OPTIONS.secure,
                sameSite: COOKIE_OPTIONS.sameSite,
                maxAge: COOKIE_OPTIONS.maxAge,
            });
        }

        return response;
    };
}

/**
 * Create a geo-redirect handler for use with createProxy.
 */
export function withGeoRedirect(
    options: GeoRedirectOptions
): (request: NextRequest, geo: Geo) => NextResponse | undefined {
    const { defaultLocale, localeMap, excludePaths = [] } = options;
    const validLocales = new Set(Object.values(localeMap));
    validLocales.add(defaultLocale);

    return (request: NextRequest, geo: Geo): NextResponse | undefined => {
        const pathname = request.nextUrl.pathname;

        // Skip excluded paths
        for (const prefix of excludePaths) {
            if (pathname.startsWith(prefix)) {
                return undefined;
            }
        }

        // Extract current locale prefix from path
        const segments = pathname.split('/').filter(Boolean);
        const currentPrefix = segments[0];

        // If path already has a valid locale prefix, don't redirect
        if (currentPrefix && validLocales.has(currentPrefix)) {
            return undefined;
        }

        // Look up locale for the user's country
        const countryCode = geo.location?.country?.code;
        const locale = (countryCode && localeMap[countryCode]) || defaultLocale;

        // If resolved locale is the default and path has no locale prefix, no redirect needed
        if (locale === defaultLocale) {
            return undefined;
        }

        // Redirect to locale-prefixed path
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}${pathname}`;
        return NextResponse.redirect(url, 307);
    };
}
