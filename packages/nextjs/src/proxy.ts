declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;

import type { Geo } from '@netloc8/netloc8-js';
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
} from '@netloc8/netloc8-js';

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

/**
 * Header-to-Geo field mapping for setting request headers.
 */
const GEO_HEADER_MAP: Array<[keyof Geo, string]> = [
    ['ip', 'x-netloc8-ip'],
    ['ipVersion', 'x-netloc8-ip-version'],
    ['continent', 'x-netloc8-continent'],
    ['continentName', 'x-netloc8-continent-name'],
    ['country', 'x-netloc8-country'],
    ['countryName', 'x-netloc8-country-name'],
    ['isEU', 'x-netloc8-is-eu'],
    ['region', 'x-netloc8-region'],
    ['regionName', 'x-netloc8-region-name'],
    ['city', 'x-netloc8-city'],
    ['postalCode', 'x-netloc8-postal-code'],
    ['latitude', 'x-netloc8-latitude'],
    ['longitude', 'x-netloc8-longitude'],
    ['timezone', 'x-netloc8-timezone'],
    ['accuracyRadius', 'x-netloc8-accuracy-radius'],
    ['precision', 'x-netloc8-precision'],
    ['isLimited', 'x-netloc8-is-limited'],
    ['limitReason', 'x-netloc8-limit-reason'],
    ['timezoneFromClient', 'x-netloc8-timezone-from-client'],
];

/**
 * Set x-netloc8-* request headers from a Geo object.
 */
function setGeoHeaders(requestHeaders: Headers, geo: Geo): void {
    for (const [field, header] of GEO_HEADER_MAP) {
        const value = geo[field];
        if (value !== undefined && value !== null) {
            requestHeaders.set(header, encodeURIComponent(String(value)));
        }
    }
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
        for (const [, headerName] of GEO_HEADER_MAP) {
            requestHeaders.delete(headerName);
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
            cookieGeo.timezoneFromClient === true &&
            cookieGeo.ip === clientIp
        ) ? { timezone: cookieGeo.timezone, timezoneFromClient: cookieGeo.timezoneFromClient } : undefined;

        // 3. Extract platform headers (zero-cost)
        const platformGeo = getGeoFromPlatformHeaders(request.headers);

        // 4. Decide whether to call the API
        let apiGeo: Geo | undefined;

        if (clientIp && isPublicIp(clientIp) && !platformGeo.timezone && !cookieTimezone) {
            const raw = await fetchGeo(clientIp, { apiKey, apiUrl, timeout, clientId: typeof __PKG_NAME__ !== 'undefined' ? `${__PKG_NAME__}/${__PKG_VERSION__}` : undefined });
            if (raw) {
                apiGeo = normalizeApiResponse(raw, clientIp);
            }
        }

        // 5. Reconcile all sources — only pass timezone fields from cookie
        //    to prevent client-side spoofing of location data
        const trustedCookie = cookieGeo.ip ? {
            ip: cookieGeo.ip,
            timezone: cookieGeo.timezone,
            timezoneFromClient: cookieGeo.timezoneFromClient,
        } : undefined;

        const geo = reconcileGeo({
            cookie: trustedCookie,
            platform: platformGeo,
            api: apiGeo,
            ip: clientIp,
        });

        // Apply trusted cookie timezone if available
        if (cookieTimezone) {
            geo.timezone = cookieTimezone.timezone;
            geo.timezoneFromClient = cookieTimezone.timezoneFromClient;
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
        if (!cookieValue || cookieGeo.ip !== clientIp) {
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
        const locale = (geo.country && localeMap[geo.country]) || defaultLocale;

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
