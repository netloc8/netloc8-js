import type {
    Geo,
    GeoContinent,
    GeoCoordinates,
    GeoCountry,
    GeoMeta,
    GeoNetwork,
    GeoRegion,
    GeoSources,
} from "./types";

/**
 * Normalize a NetLoc8 API response into the SDK's Geo type.
 *
 * The API returns a nested structure with query, location, network,
 * sources, and meta fields. This function validates and copies those
 * fields into a typed Geo object.
 */
export function normalizeApiResponse(raw: Record<string, unknown>, ip?: string): Geo {
    const rawQuery = raw.query as Record<string, unknown> | undefined;
    const rawLocation = raw.location as Record<string, unknown> | undefined;
    const rawNetwork = raw.network as Record<string, unknown> | undefined;
    const rawSources = raw.sources as Record<string, unknown> | undefined;
    const rawMeta = raw.meta as Record<string, unknown> | undefined;

    const geo: Geo = {
        query: {
            type: rawQuery?.type as string | undefined,
            value: (rawQuery?.value as string | undefined) ?? ip,
            ipVersion: rawQuery?.ipVersion as number | undefined,
        },
    };

    if (rawLocation) {
        geo.location = {
            continent: rawLocation.continent as GeoContinent | undefined,
            country: rawLocation.country as GeoCountry | undefined,
            region: rawLocation.region as GeoRegion | undefined,
            district: rawLocation.district as string | undefined,
            city: rawLocation.city as string | undefined,
            postalCode: rawLocation.postalCode as string | undefined,
            coordinates: rawLocation.coordinates as GeoCoordinates | undefined,
            timezone: rawLocation.timezone as string | undefined,
            utcOffset: rawLocation.utcOffset as string | undefined,
            geoConfidence: rawLocation.geoConfidence as number | undefined,
            timezoneFromClient: false,
        };
    }

    if (rawNetwork) {
        geo.network = rawNetwork as GeoNetwork;
    }

    if (rawSources) {
        geo.sources = rawSources as GeoSources;
    }

    if (rawMeta) {
        geo.meta = rawMeta as GeoMeta;
    }

    return geo;
}
