'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Geo } from '@netloc8/netloc8-js';
import { COOKIE_NAME, fetchMyGeo, normalizeApiResponse } from '@netloc8/netloc8-js';
import { GeoContext } from './context';

interface NetLoc8ProviderProps {
    initialGeo?: Geo;
    publishableKey?: string;
    apiUrl?: string;
    children: ReactNode;
}

/**
 * Provider component that makes geolocation data available to all child
 * components via the useGeo() hook.
 *
 * Two usage modes:
 *
 * 1. **Server proxy (Next.js):** Pass `initialGeo` from the server. The
 *    provider only reconciles the browser timezone on mount.
 *
 * 2. **Client-side SPA:** Pass `publishableKey` (a `pk_` key). The provider
 *    fetches geo data from the API on mount via GET /api/v1/ip/me, then
 *    reconciles the browser timezone.
 */
export function NetLoc8Provider({ initialGeo, publishableKey, apiUrl, children }: NetLoc8ProviderProps): ReactNode {
    const [geo, setGeo] = useState<Geo>(initialGeo ?? {});

    useEffect(() => {
        let cancelled = false;

        async function init() {
            let currentGeo: Geo = initialGeo ?? {};

            // Client-side fetch when publishableKey is provided and no server data
            if (publishableKey && !initialGeo) {
                const raw = await fetchMyGeo({ apiKey: publishableKey, apiUrl });

                if (cancelled) {
                    return;
                }

                if (raw) {
                    currentGeo = normalizeApiResponse(raw);
                    setGeo(currentGeo);

                    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(currentGeo))}; path=/; secure; samesite=lax; max-age=2592000`;
                }
            }

            // Timezone reconciliation — runs in both modes
            const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

            if (browserTz !== currentGeo.timezone || currentGeo.timezoneFromClient !== true) {
                if (!cancelled) {
                    setGeo((prevGeo: Geo) => {
                        const updatedGeo: Geo = {
                            ...prevGeo,
                            timezone: browserTz,
                            timezoneFromClient: true,
                        };

                        document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(updatedGeo))}; path=/; secure; samesite=lax; max-age=2592000`;
                        return updatedGeo;
                    });
                }
            }
        }

        init();

        return () => {
            cancelled = true;
        };
    }, []); // Only run once on mount

    return (
        <GeoContext.Provider value={geo}>
            {children}
        </GeoContext.Provider>
    );
}
