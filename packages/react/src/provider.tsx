declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;

'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Geo } from '@netloc8/core';
import { COOKIE_NAME, COOKIE_OPTIONS, serializeCookie, fetchMyGeo, normalizeApiResponse } from '@netloc8/core';
import { GeoContext } from './context';

interface NetLoc8ProviderProps {
    initialGeo?: Geo;
    publishableKey?: string;
    apiUrl?: string;
    children: ReactNode;
}

/**
 * Write the geo cookie using the shared COOKIE_OPTIONS constants.
 */
function writeGeoCookie(geo: Geo): void {
    const value = serializeCookie(geo);
    const parts = [`${COOKIE_NAME}=${value}`, `path=${COOKIE_OPTIONS.path}`];

    if (COOKIE_OPTIONS.secure && globalThis.location?.protocol === 'https:') {
        parts.push('secure');
    }

    if (COOKIE_OPTIONS.sameSite) {
        parts.push(`samesite=${COOKIE_OPTIONS.sameSite}`);
    }

    if (COOKIE_OPTIONS.maxAge !== undefined) {
        parts.push(`max-age=${COOKIE_OPTIONS.maxAge}`);
    }

    document.cookie = parts.join('; ');
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
                const raw = await fetchMyGeo({ apiKey: publishableKey, apiUrl, clientId: typeof __PKG_NAME__ !== 'undefined' ? `${__PKG_NAME__}/${__PKG_VERSION__}` : undefined });

                if (cancelled) {
                    return;
                }

                if (raw) {
                    currentGeo = normalizeApiResponse(raw);
                    setGeo(currentGeo);
                    writeGeoCookie(currentGeo);
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

                        writeGeoCookie(updatedGeo);
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
