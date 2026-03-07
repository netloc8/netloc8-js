'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Geo } from '@netloc8/netloc8-js';
import { COOKIE_NAME } from '@netloc8/netloc8-js';
import { GeoContext } from './context';

interface NetLoc8ProviderProps {
    initialGeo?: Geo;
    children: ReactNode;
}

/**
 * Provider component that makes geolocation data available to all child
 * components via the useGeo() hook.
 *
 * Handles the critical timezone reconciliation: on mount, reads the browser's
 * Intl.DateTimeFormat timezone and, if it differs from the server-detected
 * timezone, updates the cookie and context state with the more-accurate
 * browser value.
 */
export function NetLoc8Provider({ initialGeo, children }: NetLoc8ProviderProps): ReactNode {
    const [geo, setGeo] = useState<Geo>(initialGeo ?? {});

    useEffect(() => {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (browserTz !== geo.timezone || geo.timezoneFromClient !== true) {
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
    }, []); // Only run once on mount to reconcile initial server state

    return (
        <GeoContext.Provider value={geo}>
            {children}
        </GeoContext.Provider>
    );
}
