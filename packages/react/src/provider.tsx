"use client";

import type { Geo, RumConfig } from "@netloc8/core";
import {
    COOKIE_NAME,
    COOKIE_OPTIONS,
    fetchMyGeo,
    normalizeApiResponse,
    parseCookie,
    serializeCookie,
} from "@netloc8/core";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { GeoContext, type GeoContextValue } from "./context";

export interface NetLoc8ProviderProps {
    children: React.ReactNode;
    /** Geo data resolved on the server (from `getGeo()` in a Server Component). */
    geo?: Partial<Geo>;
    /** API key for browser-side geo lookups (must be a publishable key `pk_`). */
    apiKey?: string;
    /**
     * How geo data is fetched.
     *
     * Auto-detected when omitted:
     * - `apiKey` → `'direct'`
     * - `geo` (or neither) → `'proxy'`
     */
    mode?: "direct" | "proxy";
    /** Content to render while geo data is loading. */
    loading?: React.ReactNode;
    /** Enable RUM beacon collection. @default true */
    rum?: boolean;
    /** RUM beacon endpoint override. */
    rumEndpoint?: string;
    /** Fraction of page loads that collect RUM (0–1). @default 1.0 */
    rumSampleRate?: number;
}

/**
 * Determine whether we already have geo data available synchronously.
 * This prevents unnecessary loading states when data exists in
 * `geo` prop (proxy mode) or the cookie (repeat visits).
 */
function hasGeoData(geo: Geo): boolean {
    return !!(geo.location?.country?.code || geo.location?.timezone || geo.query?.value);
}

/**
 * Read cached geo data from the __netloc8 cookie, if available.
 * Returns the parsed Geo object or undefined.
 */
function readCachedGeo(): Geo | undefined {
    try {
        if (typeof document === "undefined") {
            return undefined;
        }

        const cookieStr = document.cookie
            .split("; ")
            .find((c) => c.startsWith(`${COOKIE_NAME}=`))
            ?.slice(COOKIE_NAME.length + 1);

        if (cookieStr) {
            const cached = parseCookie(cookieStr) as Geo;
            if (hasGeoData(cached)) {
                return cached;
            }
        }
    } catch {
        // SSR or cookie unavailable
    }
    return undefined;
}

/**
 * Provides geo data to all child components via React context.
 *
 * Mode is auto-detected from props:
 * - Pass `apiKey` → **direct** mode (calls the edge API from the browser)
 * - Pass `geo` → **proxy** mode (uses server-resolved data)
 *
 * You can override with the explicit `mode` prop if needed.
 */
export function NetLoc8Provider({
    children,
    geo: initialGeo,
    apiKey,
    mode: explicitMode,
    loading: loadingContent,
    rum = true,
    rumEndpoint,
    rumSampleRate,
}: NetLoc8ProviderProps): React.JSX.Element {
    // Auto-detect mode: apiKey → direct, otherwise → proxy
    const mode = explicitMode ?? (apiKey ? "direct" : "proxy");

    // Guard: warn if a secret key is passed to the client-side Provider
    if (apiKey?.startsWith("sk_")) {
        console.error(
            "[netloc8] Secret keys (sk_) must not be used in client components. Use a publishable key (pk_) instead.",
        );
    }

    // Seed geo state from the prop (proxy) or cookie cache (direct repeat visits)
    const [geo, setGeo] = useState<Geo>(() => {
        if (initialGeo && hasGeoData(initialGeo as Geo)) {
            return initialGeo as Geo;
        }
        if (mode === "direct") {
            return readCachedGeo() ?? {};
        }
        return initialGeo ?? {};
    });

    const [isLoading, setIsLoading] = useState<boolean>(() => {
        // Proxy mode with geo prop — data is already available
        if (mode === "proxy" && initialGeo && hasGeoData(initialGeo as Geo)) {
            return false;
        }
        // Direct mode — true only if we have no cached data
        if (mode === "direct" && apiKey) {
            return !hasGeoData(geo);
        }
        return false;
    });
    const [error, setError] = useState<Error | null>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: geo is seed data, not a dependency
    useEffect(() => {
        if (mode !== "direct" || !apiKey) {
            return;
        }

        // Cookie already provided data — no need to fetch
        if (hasGeoData(geo)) {
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        fetchMyGeo({ apiKey })
            .then((raw) => {
                if (cancelled) {
                    return;
                }
                if (!raw) {
                    setError(new Error("Geo lookup returned no data"));
                    setIsLoading(false);
                    return;
                }
                const fetched = normalizeApiResponse(raw);
                setGeo((prev) => ({ ...prev, ...fetched }));
                setIsLoading(false);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setIsLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [mode, apiKey]); // eslint-disable-line react-hooks/exhaustive-deps — geo is seed data, not a dependency

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

            // If we already have a browser-confirmed timezone that matches, nothing to do
            if (currentTz === browserTz && prev.location?.timezoneFromClient === true) {
                return prev;
            }

            // If timezone differs, was missing, or hasn't been browser-confirmed yet
            const updated: Geo = {
                ...prev,
                location: {
                    ...prev.location,
                    timezone: browserTz,
                    timezoneFromClient: true,
                },
            };

            // Write to cookie using shared options
            try {
                document.cookie = `${COOKIE_NAME}=${serializeCookie(updated)}; path=${COOKIE_OPTIONS.path}; max-age=${COOKIE_OPTIONS.maxAge}; SameSite=${COOKIE_OPTIONS.sameSite}${COOKIE_OPTIONS.secure ? "; Secure" : ""}`;
            } catch {
                // Cookie write failed — SSR or cookie disabled
            }

            return updated;
        });
    }, []);

    // Sync cookie when geo changes from direct mode fetch
    useEffect(() => {
        if (mode !== "direct") {
            return;
        }

        // Only write cookie if we have meaningful data
        if (!geo.query?.value && !geo.location?.country?.code) {
            return;
        }

        try {
            document.cookie = `${COOKIE_NAME}=${serializeCookie(geo)}; path=/; max-age=2592000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
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
        if (typeof rumSampleRate === "number" && Math.random() > rumSampleRate) {
            return;
        }

        let teardown: (() => void) | undefined;

        import("@netloc8/core/telemetry/rum")
            .then((mod) => {
                teardown = mod.initRum({
                    endpoint: rumEndpoint,
                    sampleRate: rumSampleRate,
                });
            })
            .catch(() => {
                // web-vitals not available — silently skip
            });

        return () => {
            teardown?.();
        };
    }, [rum, rumEndpoint, rumSampleRate]);

    const value: GeoContextValue = useMemo(() => ({ geo, isLoading, error }), [geo, isLoading, error]);

    // Show loading content while geo data is being fetched
    if (isLoading && loadingContent !== undefined) {
        return <GeoContext.Provider value={value}>{loadingContent}</GeoContext.Provider>;
    }

    return <GeoContext.Provider value={value}>{children}</GeoContext.Provider>;
}
