import { describe, expect, test } from "bun:test";
import { getConnectionType, getDeviceType, getLanguage, getTimezone } from "./signals";

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

describe("getTimezone", () => {
    test("returns undefined when window is not defined (server)", () => {
        const original = globalThis.window;
        // @ts-expect-error — ensure window is undefined
        delete (globalThis as any).window;
        try {
            expect(getTimezone()).toBeUndefined();
        } finally {
            restoreGlobal("window", original);
        }
    });

    test("returns a timezone string when window and Intl are available", () => {
        const original = globalThis.window;
        // @ts-expect-error — minimal mock
        (globalThis as any).window = {};
        try {
            const tz = getTimezone();
            // Intl is available in Bun, so this should return a timezone
            expect(typeof tz).toBe("string");
        } finally {
            restoreGlobal("window", original);
        }
    });
});

describe("getLanguage", () => {
    test("returns undefined when navigator is not defined", () => {
        const original = globalThis.navigator;
        // @ts-expect-error — remove navigator
        delete (globalThis as any).navigator;
        try {
            expect(getLanguage()).toBeUndefined();
        } finally {
            restoreGlobal("navigator", original);
        }
    });

    test("returns a language string when navigator.language is available", () => {
        const original = globalThis.navigator;
        (globalThis as any).navigator = {
            language: "en-US",
            languages: ["en-US"],
            userAgent: "Mozilla/5.0",
        };
        try {
            expect(getLanguage()).toBe("en-US");
        } finally {
            restoreGlobal("navigator", original);
        }
    });
});

describe("getConnectionType", () => {
    test("returns undefined when navigator is not defined", () => {
        const original = globalThis.navigator;
        // @ts-expect-error — remove navigator
        delete (globalThis as any).navigator;
        try {
            expect(getConnectionType()).toBeUndefined();
        } finally {
            restoreGlobal("navigator", original);
        }
    });

    test("returns undefined when navigator.connection is not available", () => {
        expect(getConnectionType()).toBeUndefined();
    });

    test("returns connection type when navigator.connection is available", () => {
        const original = globalThis.navigator;
        (globalThis as any).navigator = {
            connection: {
                effectiveType: "4g",
            },
        };
        try {
            expect(getConnectionType()).toBe("4g");
        } finally {
            restoreGlobal("navigator", original);
        }
    });
});

describe("getDeviceType", () => {
    test("returns desktop when navigator is not defined", () => {
        const original = globalThis.navigator;
        // @ts-expect-error — remove navigator
        delete (globalThis as any).navigator;
        try {
            expect(getDeviceType()).toBe("desktop");
        } finally {
            restoreGlobal("navigator", original);
        }
    });

    test("returns desktop for non-mobile user agent", () => {
        const original = globalThis.navigator;
        (globalThis as any).navigator = {
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        };
        try {
            expect(getDeviceType()).toBe("desktop");
        } finally {
            restoreGlobal("navigator", original);
        }
    });

    test("returns mobile for mobile user agent", () => {
        const original = globalThis.navigator;
        (globalThis as any).navigator = {
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15",
        };
        try {
            expect(getDeviceType()).toBe("mobile");
        } finally {
            restoreGlobal("navigator", original);
        }
    });

    test("returns tablet for iPad user agent", () => {
        const original = globalThis.navigator;
        (globalThis as any).navigator = {
            userAgent: "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15",
        };
        try {
            expect(getDeviceType()).toBe("tablet");
        } finally {
            restoreGlobal("navigator", original);
        }
    });
});
