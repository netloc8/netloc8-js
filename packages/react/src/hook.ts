"use client";

import { useContext } from "react";
import { GeoContext, type GeoContextValue } from "./context";

/**
 * Hook to access geolocation data in client components.
 *
 * Returns `{ geo, isLoading, error }` following the standard
 * data-fetching hook pattern (SWR, React Query, Apollo).
 *
 * - `geo` — the current `Geo` object (empty `{}` while loading)
 * - `isLoading` — `true` while the initial lookup is in flight
 * - `error` — non-null if the lookup failed
 *
 * @throws {Error} if called outside a NetLoc8Provider.
 *
 * @example
 * const { geo, isLoading, error } = useGeo();
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <p>Geo unavailable</p>;
 * return <p>Hello from {geo.location?.city}</p>;
 */
export function useGeo(): GeoContextValue {
    const ctx = useContext(GeoContext);

    if (ctx === null) {
        throw new Error("useGeo() must be used inside a <NetLoc8Provider>.");
    }

    return ctx;
}
