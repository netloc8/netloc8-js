import type { Geo } from "@netloc8/core";
import { DEFAULT_API_URL, fetchTimezone } from "@netloc8/core";
import { headers } from "next/headers";
import { readGeoHeaders } from "./proxy";

/**
 * Read geo data in a Server Component, Route Handler, or Server Action.
 *
 * Reads x-netloc8-* headers set by `createProxy()` and reconstructs a
 * full Geo object.
 */
export async function getGeo(): Promise<Geo> {
    const headerStore = await headers();
    return readGeoHeaders(headerStore);
}

/**
 * Read timezone in a Server Component, Route Handler, or Server Action.
 *
 * 1. Reads the timezone from the geo headers set by the proxy.
 * 2. If empty, fetches from the API using the request IP.
 */
export async function getTimezone(): Promise<string | null> {
    const geo = await getGeo();
    const timezone = geo.location?.timezone;

    if (timezone) {
        return timezone;
    }

    // Fall back to API
    const ip = geo.query?.value;
    if (ip) {
        return await fetchTimezone(ip, {
            apiUrl: process.env.NETLOC8_API_URL ?? DEFAULT_API_URL,
            apiKey: process.env.NETLOC8_API_KEY,
        });
    }

    return null;
}
