'use client';

import React from 'react';
import { useGeo } from './hook';

export interface GeoGateProps {
    children: React.ReactNode;
    /** Fallback content when gate conditions are not met. */
    fallback?: React.ReactNode;
    /** Content to render while geo data is still loading. */
    loading?: React.ReactNode;
    /** Match country code (ISO 3166-1 alpha-2, e.g. "US"). */
    country?: string | string[];
    /** Match region code (ISO 3166-2 subdivision, e.g. "CA"). */
    region?: string | string[];
    /** Match city name. */
    city?: string | string[];
    /** Match EU membership. true = EU only, false = non-EU only. */
    eu?: boolean;
}

function matches(value: string | undefined, criteria: string | string[] | undefined): boolean {
    if (criteria === undefined) {
        return true;
    }
    if (value === undefined) {
        return false;
    }
    if (Array.isArray(criteria)) {
        return criteria.includes(value);
    }
    return value === criteria;
}

/**
 * Conditionally render children based on geo properties.
 *
 * All specified props must match (logical AND). Omitted props are ignored.
 *
 * While geo data is loading, renders the `loading` prop (or nothing).
 * Once loaded, evaluates conditions and renders `children` or `fallback`.
 *
 * @example
 * <GeoGate country="US" region="CA" loading={<Skeleton />}>
 *   <p>California only</p>
 * </GeoGate>
 */
export function GeoGate({
    children,
    fallback = null,
    loading: loadingContent = null,
    country,
    region,
    city,
    eu,
}: GeoGateProps): React.ReactNode {
    const { geo, isLoading } = useGeo();

    // While loading, show loading content instead of flashing fallback
    if (isLoading) {
        return <>{loadingContent}</>;
    }

    const countryMatch = matches(geo.location?.country?.code, country);
    const regionMatch = matches(geo.location?.region?.code, region);
    const cityMatch = matches(geo.location?.city, city);

    let euMatch = true;
    if (eu !== undefined) {
        const isEU = geo.location?.country?.unions?.includes('EU') ?? false;
        euMatch = eu === isEU;
    }

    if (countryMatch && regionMatch && cityMatch && euMatch) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
