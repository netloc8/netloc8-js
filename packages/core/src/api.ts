import type { FetchGeoOptions, ApiErrorResponse } from './types';
import { CLIENT_ID, DEFAULT_API_URL } from './constants';
import { getTimezone, getLanguage, getConnectionType } from './signals';

/** Cached RTT from the last API request (measured via Resource Timing). */
let cachedRttMs: number | undefined;

/**
 * Collect browser validation headers when available.
 * These are sent on every request for timezone/language cross-validation.
 * Safe to call in Node.js — guards prevent access to browser-only APIs.
 */
function getBrowserHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    const tz = getTimezone();
    if ( tz ) {
        headers['X-NL8-TZ'] = tz;
    }

    const lang = getLanguage();
    if ( lang ) {
        headers['X-NL8-Lang'] = lang;
    }

    const conn = getConnectionType();
    if ( conn ) {
        headers['X-NL8-Conn'] = conn;
    }

    // Include cached RTT from a previous request
    if ( cachedRttMs !== undefined ) {
        headers['X-NL8-RTT'] = String(cachedRttMs);
    }

    return headers;
}

/**
 * After a fetch completes, try to measure the client-perceived round-trip
 * time using the Resource Timing API. This is stored and sent as X-NL8-RTT
 * on the next request (not the current one, since timing isn't available
 * until after the response arrives).
 */
function measureRtt(): void {
    if ( typeof performance === 'undefined' ) {
        return;
    }

    try {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        for ( let i = entries.length - 1; i >= 0; i-- ) {
            const entry = entries[i];
            if ( entry.name.includes('api.netloc8.com') || entry.name.includes('/v1/ip/') ) {
                const rtt = Math.round(entry.responseStart - entry.requestStart);
                if ( rtt > 0 && rtt < 30000 ) {
                    cachedRttMs = rtt;
                }
                break;
            }
        }
    } catch {
        // Resource Timing not available
    }
}

/**
 * Parse a non-OK API response into a structured error, or return null
 * if the body isn't parseable.
 */
async function parseApiError(response: Response): Promise<ApiErrorResponse | null> {
    try {
        const body = await response.json();
        if ( typeof body === 'object' && body !== null && 'error' in body ) {
            return body as ApiErrorResponse;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Log a structured API error with its error code and message.
 */
function logApiError(context: string, apiError: ApiErrorResponse | null, status: number): void {
    if ( apiError?.error?.code ) {
        console.warn(`[netloc8] ${context}: ${apiError.error.code} — ${apiError.error.message ?? 'Unknown error'} (HTTP ${status})`);
    } else {
        console.warn(`[netloc8] ${context}: HTTP ${status}`);
    }
}

/**
 * Fetch geolocation data for an IP address from the NetLoc8 API.
 *
 * Returns the raw API JSON on success.
 * Returns null on error/timeout — errors are logged with structured error
 * codes when available.
 * Never throws.
 */
export async function fetchGeo(
    ipAddress: string,
    options?: FetchGeoOptions
): Promise<Record<string, unknown> | null> {
    const apiKey = options?.apiKey ?? process.env.NETLOC8_API_KEY;
    const apiUrl = options?.apiUrl ?? process.env.NETLOC8_API_URL ?? DEFAULT_API_URL;
    const timeout = options?.timeout ?? 1500;
    const clientId = options?.clientId ?? CLIENT_ID;

    if (!apiKey) {
        console.warn('[netloc8] No API key provided. Set NETLOC8_API_KEY or pass apiKey in options.');
        return null;
    }

    const url = `${apiUrl}/v1/ip/${encodeURIComponent(ipAddress)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'X-NetLoc8-Client': clientId,
                'Accept': 'application/json',
                ...getBrowserHeaders(),
            },
            signal: AbortSignal.timeout(timeout),
        });

        measureRtt();

        if (!response.ok) {
            const apiError = await parseApiError(response);
            logApiError(`Geo lookup failed for ${ipAddress}`, apiError, response.status);
            return null;
        }

        return await response.json() as Record<string, unknown>;
    } catch (error) {
        console.warn(`[netloc8] Geo lookup failed for ${ipAddress}: ${(error as Error).message}`);
        return null;
    }
}

/**
 * Fetch only the timezone for an IP address.
 *
 * Returns the IANA timezone string or null.
 */
export async function fetchTimezone(
    ipAddress: string,
    options?: FetchGeoOptions
): Promise<string | null> {
    const apiKey = options?.apiKey ?? process.env.NETLOC8_API_KEY;
    const apiUrl = options?.apiUrl ?? process.env.NETLOC8_API_URL ?? DEFAULT_API_URL;
    const timeout = options?.timeout ?? 1500;
    const clientId = options?.clientId ?? CLIENT_ID;

    if (!apiKey) {
        console.warn('[netloc8] No API key provided. Set NETLOC8_API_KEY or pass apiKey in options.');
        return null;
    }

    const url = `${apiUrl}/v1/ip/${encodeURIComponent(ipAddress)}/timezone`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'X-NetLoc8-Client': clientId,
                'Accept': 'application/json',
                ...getBrowserHeaders(),
            },
            signal: AbortSignal.timeout(timeout),
        });

        measureRtt();

        if (!response.ok) {
            const apiError = await parseApiError(response);
            logApiError(`Timezone lookup failed for ${ipAddress}`, apiError, response.status);
            return null;
        }

        return await response.json() as string;
    } catch (error) {
        console.warn(`[netloc8] Timezone lookup failed for ${ipAddress}: ${(error as Error).message}`);
        return null;
    }
}

/**
 * Fetch geolocation data for the caller's own IP from the NetLoc8 API.
 *
 * Calls GET /v1/ip/me which auto-detects the caller's IP and returns
 * the full Geo response. Intended for browser-side usage with a publishable
 * key (pk_).
 *
 * Returns the raw API JSON or null on error/timeout.
 * Never throws.
 */
export async function fetchMyGeo(
    options?: FetchGeoOptions
): Promise<Record<string, unknown> | null> {
    const apiKey = options?.apiKey ?? process.env.NETLOC8_API_KEY;
    const apiUrl = options?.apiUrl ?? process.env.NETLOC8_API_URL ?? DEFAULT_API_URL;
    const timeout = options?.timeout ?? 1500;
    const clientId = options?.clientId ?? CLIENT_ID;

    if (!apiKey) {
        console.warn('[netloc8] No API key provided. Set NETLOC8_API_KEY or pass apiKey in options.');
        return null;
    }

    const url = `${apiUrl}/v1/ip/me`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'X-NetLoc8-Client': clientId,
                'Accept': 'application/json',
                ...getBrowserHeaders(),
            },
            signal: AbortSignal.timeout(timeout),
        });

        measureRtt();

        if (!response.ok) {
            const apiError = await parseApiError(response);
            logApiError('Self geo lookup failed', apiError, response.status);
            return null;
        }

        return await response.json() as Record<string, unknown>;
    } catch (error) {
        console.warn(`[netloc8] Self geo lookup failed: ${(error as Error).message}`);
        return null;
    }
}

/**
 * Fetch only the timezone for the caller's own IP.
 *
 * Calls GET /v1/ip/me/timezone which auto-detects the caller's IP.
 * Intended for browser-side usage with a publishable key (pk_).
 *
 * Returns the IANA timezone string or null.
 */
export async function fetchMyTimezone(
    options?: FetchGeoOptions
): Promise<string | null> {
    const apiKey = options?.apiKey ?? process.env.NETLOC8_API_KEY;
    const apiUrl = options?.apiUrl ?? process.env.NETLOC8_API_URL ?? DEFAULT_API_URL;
    const timeout = options?.timeout ?? 1500;
    const clientId = options?.clientId ?? CLIENT_ID;

    if (!apiKey) {
        console.warn('[netloc8] No API key provided. Set NETLOC8_API_KEY or pass apiKey in options.');
        return null;
    }

    const url = `${apiUrl}/v1/ip/me/timezone`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'X-NetLoc8-Client': clientId,
                'Accept': 'application/json',
                ...getBrowserHeaders(),
            },
            signal: AbortSignal.timeout(timeout),
        });

        measureRtt();

        if (!response.ok) {
            const apiError = await parseApiError(response);
            logApiError('Self timezone lookup failed', apiError, response.status);
            return null;
        }

        return await response.json() as string;
    } catch (error) {
        console.warn(`[netloc8] Self timezone lookup failed: ${(error as Error).message}`);
        return null;
    }
}
