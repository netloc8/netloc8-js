/**
 * Shared browser signal collection.
 *
 * Used by both request headers (api.ts) and RUM beacons (telemetry/rum.ts)
 * to avoid duplicating browser-sniffing logic.
 *
 * All functions are safe to call in Node.js — guards prevent access to
 * browser-only APIs and return undefined/fallbacks.
 */

/** Returns the browser's IANA timezone, or undefined if unavailable or server-side. */
export function getTimezone(): string | undefined {
    // Only read timezone in a browser context — Intl is available in Node.js
    // but returns the server's timezone, not the user's.
    if (typeof window === "undefined" || typeof Intl === "undefined") {
        return undefined;
    }
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return undefined;
    }
}

/** Returns the browser's preferred language (e.g. 'en-US'), or undefined. */
export function getLanguage(): string | undefined {
    // biome-ignore lint/suspicious/noExplicitAny: navigator.languages is not in the standard Navigator type
    const nav = typeof navigator !== "undefined" ? (navigator as any) : undefined;
    return nav?.languages?.[0] ?? nav?.language ?? undefined;
}

/** Returns the effective connection type (e.g. '4g', '3g'), or undefined. */
export function getConnectionType(): string | undefined {
    // biome-ignore lint/suspicious/noExplicitAny: navigator.connection is not in the standard Navigator type
    const nav = typeof navigator !== "undefined" ? (navigator as any) : undefined;
    return nav?.connection?.effectiveType ?? undefined;
}

/** Classifies the device as desktop, mobile, or tablet from the User-Agent. */
export function getDeviceType(): "desktop" | "mobile" | "tablet" {
    if (typeof navigator === "undefined") {
        return "desktop";
    }
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) {
        return "tablet";
    }
    if (/mobile|iphone|android/i.test(ua) && !/tablet/i.test(ua)) {
        return "mobile";
    }
    return "desktop";
}
