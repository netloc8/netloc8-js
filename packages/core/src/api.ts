import { CLIENT_ID, DEFAULT_API_URL } from "./constants";
import { getConnectionType, getLanguage, getTimezone } from "./signals";
import type { ApiErrorResponse, FetchGeoOptions } from "./types";
import { ApiError } from "./types";

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
    if (tz) {
        headers["X-NL8-TZ"] = tz;
    }

    const lang = getLanguage();
    if (lang) {
        headers["X-NL8-Lang"] = lang;
    }

    const conn = getConnectionType();
    if (conn) {
        headers["X-NL8-Conn"] = conn;
    }

    // Include cached RTT from a previous request
    if (cachedRttMs !== undefined) {
        headers["X-NL8-RTT"] = String(cachedRttMs);
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
    if (typeof performance === "undefined") {
        return;
    }

    try {
        const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            if (entry.name.includes("api.netloc8.com") || entry.name.includes("/v1/ip/")) {
                const rtt = Math.round(entry.responseStart - entry.requestStart);
                if (rtt > 0 && rtt < 30000) {
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
        if (typeof body === "object" && body !== null && "error" in body) {
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
    if (apiError?.error?.code) {
        console.warn(
            `[netloc8] ${context}: ${apiError.error.code} — ${apiError.error.message ?? "Unknown error"} (HTTP ${status})`,
        );
    } else {
        console.warn(`[netloc8] ${context}: HTTP ${status}`);
    }
}

/**
 * Shared fetch implementation used by all public API functions.
 * Handles header setup, timeout, error parsing, and RTT measurement.
 *
 * Returns the parsed JSON body, or null on error/timeout.
 * Never throws.
 */
export async function fetchApi<T>(
    url: string,
    context: string,
    options?: FetchGeoOptions & {
        method?: string;
        body?: unknown;
    },
): Promise<T | null> {
    const apiKey = options?.apiKey ?? process.env.NETLOC8_API_KEY;
    const timeout = options?.timeout ?? 1500;
    const clientId = options?.clientId ?? CLIENT_ID;
    const allowAnonymous = options?.allowAnonymous === true;
    const method = options?.method ?? "GET";
    const body = options?.body;

    if (!apiKey && !allowAnonymous) {
        console.warn("[netloc8] No API key provided. Set NETLOC8_API_KEY or pass apiKey in options.");
        return null;
    }

    try {
        const headers: Record<string, string> = {
            "X-NetLoc8-Client": clientId,
            Accept: "application/json",
            ...getBrowserHeaders(),
        };
        if (apiKey) {
            headers["X-API-Key"] = apiKey;
        }
        if (body) {
            headers["Content-Type"] = "application/json";
        }
        if (typeof window === "undefined" && typeof navigator === "undefined") {
            headers["User-Agent"] = clientId;
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(timeout),
        });

        measureRtt();

        if (!response.ok) {
            const apiError = await parseApiError(response);
            logApiError(context, apiError, response.status);
            if (options?.throwOnError) {
                const code = apiError?.error?.code ?? "";
                const message = apiError?.error?.message ?? response.statusText;
                const requestId = apiError?.meta?.requestId;
                throw new ApiError(response.status, code, message, requestId);
            }
            return null;
        }

        if (response.status === 204) {
            return {} as T;
        }

        return (await response.json()) as T;
    } catch (error) {
        console.warn(`[netloc8] ${context}: ${(error as Error).message}`);
        if (options?.throwOnError) {
            throw error;
        }
        return null;
    }
}

/**
 * Resolve the API base URL from options or environment.
 */
export function resolveApiUrl(options?: FetchGeoOptions): string {
    return options?.apiUrl ?? process.env.NETLOC8_API_URL ?? DEFAULT_API_URL;
}

/**
 * Fetch geolocation data for an IP address from the NetLoc8 API.
 *
 * Returns the raw API JSON on success.
 * Returns null on error/timeout — errors are logged with structured error
 * codes when available.
 * Never throws.
 */
export async function fetchGeo(ipAddress: string, options?: FetchGeoOptions): Promise<Record<string, unknown> | null> {
    const url = `${resolveApiUrl(options)}/v1/ip/${encodeURIComponent(ipAddress)}`;
    return fetchApi<Record<string, unknown>>(url, `Geo lookup failed for ${ipAddress}`, options);
}

/**
 * Fetch only the timezone for an IP address.
 *
 * Returns the IANA timezone string or null.
 */
export async function fetchTimezone(ipAddress: string, options?: FetchGeoOptions): Promise<string | null> {
    const url = `${resolveApiUrl(options)}/v1/ip/${encodeURIComponent(ipAddress)}/timezone`;
    return fetchApi<string>(url, `Timezone lookup failed for ${ipAddress}`, options);
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
export async function fetchMyGeo(options?: FetchGeoOptions): Promise<Record<string, unknown> | null> {
    const url = `${resolveApiUrl(options)}/v1/ip/me`;
    return fetchApi<Record<string, unknown>>(url, "Self geo lookup failed", options);
}

/**
 * Fetch only the timezone for the caller's own IP.
 *
 * Calls GET /v1/ip/me/timezone which auto-detects the caller's IP.
 * Intended for browser-side usage with a publishable key (pk_).
 *
 * Returns the IANA timezone string or null.
 */
export async function fetchMyTimezone(options?: FetchGeoOptions): Promise<string | null> {
    const url = `${resolveApiUrl(options)}/v1/ip/me/timezone`;
    return fetchApi<string>(url, "Self timezone lookup failed", options);
}

/**
 * Validate whether a string is a valid IP address via the NetLoc8 API.
 *
 * Returns true if the address is a valid IPv4 or IPv6 address, false
 * otherwise. Returns null on error/timeout.
 *
 * For local-only validation without an API call, use the `normalizeIp`
 * and `isPublicIp` helpers from this package instead.
 */
export async function fetchValidation(ipAddress: string, options?: FetchGeoOptions): Promise<boolean | null> {
    const url = `${resolveApiUrl(options)}/v1/ip/${encodeURIComponent(ipAddress)}/validation`;
    return fetchApi<boolean>(url, `Validation failed for ${ipAddress}`, options);
}
