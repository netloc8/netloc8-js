import type { Geo } from "./types";

/**
 * Check whether a Geo object represents a location within the European Union.
 *
 * Uses the `unions` array on the country field, which the API populates
 * with political/economic union memberships (e.g. `["EU"]`).
 *
 * @example
 * const { geo } = useGeo();
 * if ( isEU( geo ) ) {
 *     showCookieConsent();
 * }
 */
export function isEU(geo: Geo): boolean {
    return geo.location?.country?.unions?.includes("EU") ?? false;
}
