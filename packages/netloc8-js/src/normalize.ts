import type { Geo } from './types';

/**
 * Normalize a NetLoc8 API response into the SDK's Geo type.
 *
 * The API returns a flat structure that matches Geo closely.
 * This function copies the fields and adds timezoneFromClient.
 */
export function normalizeApiResponse(
    raw: Record<string, unknown>,
    ip: string
): Geo {
    return {
        ip: (raw.ip as string) ?? ip,
        ipVersion: raw.ipVersion as number | undefined,
        continent: raw.continent as string | undefined,
        continentName: raw.continentName as string | undefined,
        country: raw.country as string | undefined,
        countryName: raw.countryName as string | undefined,
        isEU: raw.isEU as boolean | undefined,
        region: raw.region as string | undefined,
        regionName: raw.regionName as string | undefined,
        city: raw.city as string | undefined,
        postalCode: raw.postalCode as string | undefined,
        latitude: raw.latitude as number | undefined,
        longitude: raw.longitude as number | undefined,
        timezone: raw.timezone as string | undefined,
        accuracyRadius: raw.accuracyRadius as number | undefined,
        precision: raw.precision as string | undefined,
        timezoneFromClient: false,
    };
}
