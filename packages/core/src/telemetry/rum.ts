import { getConnectionType, getDeviceType } from "../signals";
import type { RumConfig } from "../types";

const DEFAULT_ENDPOINT = "https://api.netloc8.com/v1/telemetry/rum";
const MAX_ERRORS = 10;
const MAX_MESSAGE_LEN = 500;
const MAX_STACK_LEN = 2000;

interface RumMetrics {
    lcp?: number;
    fid?: number;
    inp?: number;
    cls?: number;
    ttfb?: number;
    dns?: number;
    tls?: number;
    request?: number;
    response?: number;
}

interface ClientError {
    type: "unhandled_exception" | "resource_load_failure";
    message: string;
    stack?: string;
    resourceUrl?: string;
}

interface RumBeacon {
    path: string;
    deviceType: "desktop" | "mobile" | "tablet";
    connectionType?: string;
    metrics?: RumMetrics;
    errors?: ClientError[];
}

function truncate(str: string, max: number): string {
    return str.length > max ? str.slice(0, max) : str;
}

/**
 * Initialize RUM collection. Lazy-loads `web-vitals` to capture Core Web
 * Vitals, collects navigation timing, and sets up error listeners.
 *
 * Beacons are sent via `navigator.sendBeacon()` on `visibilitychange`
 * (page hide) for maximum delivery reliability with zero latency impact.
 *
 * All collected state is scoped to this invocation — concurrent or
 * sequential calls (e.g. React strict mode double-mount) are fully
 * isolated.
 *
 * Returns a teardown function to remove listeners.
 */
export function initRum(config?: RumConfig): () => void {
    // Guard: RUM only runs in a browser with window, document, and sendBeacon
    if (
        typeof window === "undefined" ||
        typeof document === "undefined" ||
        typeof navigator?.sendBeacon !== "function"
    ) {
        return () => {};
    }

    const endpoint = config?.endpoint ?? DEFAULT_ENDPOINT;

    // Per-invocation state — no module-level singletons, no cross-mount leaks
    const errors: ClientError[] = [];
    const metrics: RumMetrics = {};

    // Collect Navigation Timing
    collectNavigationTiming(metrics);

    // Lazy-import web-vitals — zero cost if not installed
    import("web-vitals")
        .then(({ onLCP, onFID, onINP, onCLS, onTTFB }) => {
            onLCP((metric) => {
                metrics.lcp = Math.round(metric.value);
            });
            onFID((metric) => {
                metrics.fid = Math.round(metric.value);
            });
            onINP((metric) => {
                metrics.inp = Math.round(metric.value);
            });
            onCLS((metric) => {
                metrics.cls = metric.value;
            }); // CLS is unitless, don't round
            onTTFB((metric) => {
                metrics.ttfb = Math.round(metric.value);
            });
        })
        .catch(() => {
            // web-vitals not installed — skip CWV collection, still collect nav timing + errors
        });

    // Error listeners
    function handleError(event: ErrorEvent): void {
        if (errors.length >= MAX_ERRORS) {
            return;
        }
        errors.push({
            type: "unhandled_exception",
            message: truncate(event.message || "Unknown error", MAX_MESSAGE_LEN),
            stack: event.error?.stack ? truncate(event.error.stack, MAX_STACK_LEN) : undefined,
        });
    }

    function handleResourceError(event: Event): void {
        if (errors.length >= MAX_ERRORS) {
            return;
        }
        const target = event.target as HTMLElement & { src?: string; href?: string };
        if (target?.tagName) {
            errors.push({
                type: "resource_load_failure",
                message: `Failed to load ${target.tagName.toLowerCase()}`,
                resourceUrl: truncate(target.src || target.href || "", MAX_MESSAGE_LEN),
            });
        }
    }

    function handleVisibilityChange(): void {
        if (document.visibilityState === "hidden") {
            sendRumBeacon(endpoint, metrics, errors);
        }
    }

    window.addEventListener("error", handleError);
    window.addEventListener("error", handleResourceError, true); // capture phase for resource errors
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Teardown
    return () => {
        window.removeEventListener("error", handleError);
        window.removeEventListener("error", handleResourceError, true);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
}

// --- Internal helpers (pure functions that receive state) ---

function collectNavigationTiming(metrics: RumMetrics): void {
    if (typeof performance === "undefined") {
        return;
    }

    try {
        const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
        const nav = entries[0];
        if (!nav) {
            return;
        }

        if (nav.domainLookupEnd > 0 && nav.domainLookupStart > 0) {
            metrics.dns = Math.round(nav.domainLookupEnd - nav.domainLookupStart);
        }
        if (nav.secureConnectionStart > 0 && nav.connectEnd > 0) {
            metrics.tls = Math.round(nav.connectEnd - nav.secureConnectionStart);
        }
        if (nav.responseStart > 0 && nav.requestStart > 0) {
            metrics.request = Math.round(nav.responseStart - nav.requestStart);
        }
        if (nav.responseEnd > 0 && nav.responseStart > 0) {
            metrics.response = Math.round(nav.responseEnd - nav.responseStart);
        }
    } catch {
        // Navigation timing not available
    }
}

function sendRumBeacon(endpoint: string, metrics: RumMetrics, errors: ClientError[]): void {
    // Only send if we have metrics or errors
    if (Object.keys(metrics).length === 0 && errors.length === 0) {
        return;
    }

    const beacon: RumBeacon = {
        path: typeof location !== "undefined" ? location.pathname : "/",
        deviceType: getDeviceType(),
        connectionType: getConnectionType(),
    };

    if (Object.keys(metrics).length > 0) {
        beacon.metrics = { ...metrics };
    }

    if (errors.length > 0) {
        beacon.errors = errors.slice(0, MAX_ERRORS);
    }

    try {
        const body = JSON.stringify(beacon);

        // 4 KB limit enforced by the API
        if (new Blob([body]).size > 4096) {
            // Drop errors to fit within limit
            delete beacon.errors;
            const trimmed = JSON.stringify(beacon);
            navigator.sendBeacon(endpoint, trimmed);
        } else {
            navigator.sendBeacon(endpoint, body);
        }
    } catch {
        // sendBeacon not available
    }
}
