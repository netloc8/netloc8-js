'use client';

import type { Geo, RumConfig } from '@netloc8/core';
import React, { useEffect, useState, useMemo } from 'react';
import {
    fetchMyGeo,
    normalizeApiResponse,
    parseCookie,
    serializeCookie,
    COOKIE_NAME,
} from '@netloc8/core';
import { GeoContext } from './context';

export interface NetLoc8ProviderProps {
    children: React.ReactNode;
    /** Server-resolved geo data (from `getGeo()` in a Server Component). */
    initialGeo?: Partial<Geo>;
    /** Publishable API key (pk_) for browser-side geo lookups. */
    publishableKey?: string;
    /** @default 'proxy' */
    mode?: 'direct' | 'proxy';
    /** Enable RUM beacon collection. @default true */
    rum?: boolean;
    /** RUM beacon endpoint override. */
    rumEndpoint?: string;
    /** Fraction of page loads that collect RUM (0–1). @default 1.0 */
    rumSampleRate?: number;
}

/**
 * Provides geo data to all child components via React context.
 *
 * In **proxy** mode (default), uses server-resolved `initialGeo` from
 * the Next.js proxy. Only reconciles the browser timezone.
 *
 * In **direct** mode, calls the NetLoc8 API directly from the browser
 * using a publishable key (pk_). Faster for static-site or non-Next.js
 * deployments.
 */
export function NetLoc8Provider({
    children,
    initialGeo,
    publishableKey,
    mode = 'proxy',
    rum = true,
    rumEndpoint,
    rumSampleRate,
}: NetLoc8ProviderProps): React.JSX.Element {
    const [geo, setGeo] = useState<Geo>(() => initialGeo ?? {});

    // Direct-mode: fetch geo from the API on mount
    useEffect(() => {
        if (mode !== 'direct' || !publishableKey) {
            return;
        }

        let cancelled = false;
        fetchMyGeo({ apiKey: publishableKey }).then((raw) => {
            if (cancelled || !raw) {
                return;
            }
            const fetched = normalizeApiResponse(raw);
            setGeo((prev) => ({ ...prev, ...fetched }));
        });
        return () => { cancelled = true; };
    }, [mode, publishableKey]);

    // Timezone reconciliation — always runs regardless of mode
    useEffect(() => {
        // Read the browser timezone
        let browserTz: string | undefined;
        try {
            browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return;
        }

        if (!browserTz) {
            return;
        }

        setGeo((prev) => {
            const currentTz = prev.location?.timezone;

            // If we already have a timezone from the API and it matches, nothing to do
            if (currentTz === browserTz && prev.location?.timezoneFromClient === false) {
                return prev;
            }

            // If timezone differs or was missing, use browser timezone
            const updated: Geo = {
                ...prev,
                location: {
                    ...prev.location,
                    timezone: browserTz,
                    timezoneFromClient: true,
                },
            };

            // Write to cookie
            try {
                document.cookie = `${COOKIE_NAME}=${serializeCookie(updated)}; path=/; max-age=2592000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
            } catch {
                // Cookie write failed — SSR or cookie disabled
            }

            return updated;
        });
    }, []);

    // Sync cookie when geo changes from direct mode fetch
    useEffect(() => {
        if (mode !== 'direct') {
            return;
        }

        // Only write cookie if we have meaningful data
        if (!geo.query?.value && !geo.location?.country?.code) {
            return;
        }

        try {
            document.cookie = `${COOKIE_NAME}=${serializeCookie(geo)}; path=/; max-age=2592000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
        } catch {
            // Cookie write failed
        }
    }, [mode, geo]);

    // RUM telemetry — lazy-loaded, zero cost when disabled
    useEffect(() => {
        if (!rum) {
            return;
        }

        // Sample rate check — skip collection for this page load
        if (typeof rumSampleRate === 'number' && Math.random() > rumSampleRate) {
            return;
        }

        let teardown: (() => void) | undefined;

        import('@netloc8/core/telemetry/rum').then((mod) => {
            teardown = mod.initRum({
                endpoint: rumEndpoint,
                sampleRate: rumSampleRate,
            });
        }).catch(() => {
            // web-vitals not available — silently skip
        });

        return () => { teardown?.(); };
    }, [rum, rumEndpoint, rumSampleRate]);

    const value = useMemo(() => geo, [geo]);

    return (
        <GeoContext.Provider value={value}>
            {children}
        </GeoContext.Provider>
    );
}
