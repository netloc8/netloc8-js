"use client";

import type { Geo } from "@netloc8/core";
import { type Context, createContext } from "react";

/**
 * Shape of the GeoContext value — follows the industry-standard
 * { data, isLoading, error } pattern (SWR, React Query, Apollo).
 */
export interface GeoContextValue {
    /** The current geolocation data. Empty `{}` while loading. */
    geo: Geo;
    /** True while the initial geo lookup is in progress. */
    isLoading: boolean;
    /** Non-null if the geo lookup failed. */
    error: Error | null;
}

/**
 * Internal sentinel — `null` means no provider is present.
 * The public default is cast so consumers see the correct type.
 */
export const GeoContext: Context<GeoContextValue> = createContext<GeoContextValue>(null as unknown as GeoContextValue);
