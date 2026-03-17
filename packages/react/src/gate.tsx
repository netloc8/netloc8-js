'use client';

import type { ReactNode } from 'react';
import { useGeo } from './hook';

export interface GeoGateProps {
    country?: string | string[];
    region?: string | string[];
    city?: string | string[];
    eu?: boolean;
    not?: boolean;
    fallback?: ReactNode;
    children: ReactNode;
}

/**
 * Conditionally render children based on the user's geolocation.
 *
 * Multiple values can be passed as an array for OR matching within a field.
 * When multiple fields are specified, ALL must match (AND logic).
 */
export function GeoGate({
    country,
    region,
    city,
    eu,
    not = false,
    fallback = null,
    children,
}: GeoGateProps): ReactNode {
    const geo = useGeo();

    const checks: boolean[] = [];

    if (eu !== undefined) {
        checks.push(geo.isEU === eu);
    }

    if (country !== undefined) {
        const countries = Array.isArray(country) ? country : [country];
        checks.push(geo.country !== undefined && countries.includes(geo.country));
    }

    if (region !== undefined) {
        const regions = Array.isArray(region) ? region : [region];
        checks.push(geo.region !== undefined && regions.includes(geo.region));
    }

    if (city !== undefined) {
        const cities = Array.isArray(city) ? city : [city];
        checks.push(geo.city !== undefined && cities.includes(geo.city));
    }

    // If no props specified, matches everything
    let matches = checks.length === 0 || checks.every(Boolean);

    if (not) {
        matches = !matches;
    }

    return matches ? children : fallback;
}
