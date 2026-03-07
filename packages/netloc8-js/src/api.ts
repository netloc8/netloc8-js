import type { FetchGeoOptions } from './types';

/**
 * Fetch geolocation data for an IP address from the NetLoc8 API.
 *
 * Returns the raw API JSON or null on error/timeout.
 * Never throws — errors are swallowed with a console.warn for debugging.
 */
export async function fetchGeo(
    ipAddress: string,
    options?: FetchGeoOptions
): Promise<Record<string, unknown> | null> {
    const apiKey = options?.apiKey ?? process.env.NETLOC8_API_KEY;
    const apiUrl = options?.apiUrl ?? process.env.NETLOC8_API_URL ?? 'https://netloc8.com';
    const timeout = options?.timeout ?? 1500;

    if (!apiKey) {
        console.warn('[netloc8] No API key provided. Set NETLOC8_API_KEY or pass apiKey in options.');
        return null;
    }

    const url = `${apiUrl}/api/v1/ip/${encodeURIComponent(ipAddress)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(timeout),
        });

        if (!response.ok) {
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
    const apiUrl = options?.apiUrl ?? process.env.NETLOC8_API_URL ?? 'https://netloc8.com';
    const timeout = options?.timeout ?? 1500;

    if (!apiKey) {
        console.warn('[netloc8] No API key provided. Set NETLOC8_API_KEY or pass apiKey in options.');
        return null;
    }

    const url = `${apiUrl}/api/v1/ip/${encodeURIComponent(ipAddress)}/timezone`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(timeout),
        });

        if (!response.ok) {
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
 * Calls GET /api/v1/ip/me which auto-detects the caller's IP and returns
 * the full Geo response. Intended for browser-side usage with a publishable
 * key (pk_).
 *
 * Returns the raw API JSON or null on error/timeout.
 * Never throws — errors are swallowed with a console.warn for debugging.
 */
export async function fetchMyGeo(
    options?: FetchGeoOptions
): Promise<Record<string, unknown> | null> {
    const apiKey = options?.apiKey ?? process.env.NETLOC8_API_KEY;
    const apiUrl = options?.apiUrl ?? process.env.NETLOC8_API_URL ?? 'https://netloc8.com';
    const timeout = options?.timeout ?? 1500;

    if (!apiKey) {
        console.warn('[netloc8] No API key provided. Set NETLOC8_API_KEY or pass apiKey in options.');
        return null;
    }

    const url = `${apiUrl}/api/v1/ip/me`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(timeout),
        });

        if (!response.ok) {
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
 * Calls GET /api/v1/ip/me/timezone which auto-detects the caller's IP.
 * Intended for browser-side usage with a publishable key (pk_).
 *
 * Returns the IANA timezone string or null.
 */
export async function fetchMyTimezone(
    options?: FetchGeoOptions
): Promise<string | null> {
    const apiKey = options?.apiKey ?? process.env.NETLOC8_API_KEY;
    const apiUrl = options?.apiUrl ?? process.env.NETLOC8_API_URL ?? 'https://netloc8.com';
    const timeout = options?.timeout ?? 1500;

    if (!apiKey) {
        console.warn('[netloc8] No API key provided. Set NETLOC8_API_KEY or pass apiKey in options.');
        return null;
    }

    const url = `${apiUrl}/api/v1/ip/me/timezone`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(timeout),
        });

        if (!response.ok) {
            return null;
        }

        return await response.json() as string;
    } catch (error) {
        console.warn(`[netloc8] Self timezone lookup failed: ${(error as Error).message}`);
        return null;
    }
}
