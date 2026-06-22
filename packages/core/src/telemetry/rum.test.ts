import { describe, expect, test } from "bun:test";
import { initRum } from "./rum";

/**
 * Safely restore a globalThis property to its original value.
 * Handles the case where the property was originally undefined (deletes it).
 */
function restoreGlobal(key: string, original: unknown): void {
    if (original !== undefined) {
        (globalThis as any)[key] = original;
    } else {
        // @ts-expect-error — restore undefined global
        delete (globalThis as any)[key];
    }
}

describe("initRum", () => {
    test("returns a no-op teardown when window is undefined (server)", () => {
        const teardown = initRum();
        expect(typeof teardown).toBe("function");
        // Should not throw
        teardown();
    });

    test("returns a no-op teardown with custom config in server environment", () => {
        const teardown = initRum({
            endpoint: "https://custom.endpoint.com/rum",
            sampleRate: 0.5,
        });
        expect(typeof teardown).toBe("function");
        teardown();
    });

    test("registers listeners and returns a working teardown in browser environment", () => {
        const origWindow = globalThis.window;
        const origDocument = globalThis.document;
        const origNavigator = globalThis.navigator;
        const origPerformance = globalThis.performance;
        const origLocation = (globalThis as any).location;

        // Track addEventListener/removeEventListener calls
        const windowListeners: string[] = [];
        const documentListeners: string[] = [];
        const windowRemoved: string[] = [];
        const documentRemoved: string[] = [];

        // @ts-expect-error — minimal browser mock
        (globalThis as any).window = {
            addEventListener(type: string) {
                windowListeners.push(type);
            },
            removeEventListener(type: string) {
                windowRemoved.push(type);
            },
        };

        // @ts-expect-error — minimal browser mock
        (globalThis as any).document = {
            addEventListener(type: string) {
                documentListeners.push(type);
            },
            removeEventListener(type: string) {
                documentRemoved.push(type);
            },
            visibilityState: "visible",
        };

        (globalThis as any).navigator = {
            sendBeacon: () => true,
        };

        // @ts-expect-error — stub performance so collectNavigationTiming doesn't throw
        (globalThis as any).performance = {
            getEntriesByType: () => [],
        };

        (globalThis as any).location = { pathname: "/" };

        try {
            const teardown = initRum();
            expect(typeof teardown).toBe("function");

            // Should have registered error listeners on window and visibilitychange on document
            expect(windowListeners).toContain("error");
            expect(documentListeners).toContain("visibilitychange");

            // Teardown should remove the same listeners
            teardown();
            expect(windowRemoved).toContain("error");
            expect(documentRemoved).toContain("visibilitychange");
        } finally {
            restoreGlobal("window", origWindow);
            restoreGlobal("document", origDocument);
            restoreGlobal("navigator", origNavigator);
            restoreGlobal("performance", origPerformance);
            restoreGlobal("location", origLocation);
        }
    });

    test("returns no-op teardown when sendBeacon is not available", () => {
        const origWindow = globalThis.window;
        const origDocument = globalThis.document;
        const origNavigator = globalThis.navigator;

        // @ts-expect-error — minimal mock
        (globalThis as any).window = {};
        // @ts-expect-error — minimal mock
        (globalThis as any).document = {};
        // navigator without sendBeacon
        (globalThis as any).navigator = {};

        try {
            const teardown = initRum();
            expect(typeof teardown).toBe("function");
            teardown(); // should not throw
        } finally {
            restoreGlobal("window", origWindow);
            restoreGlobal("document", origDocument);
            restoreGlobal("navigator", origNavigator);
        }
    });
});
