import { describe, test, expect } from "bun:test";
import { getTimezone, getLanguage, getConnectionType, getDeviceType } from "./signals";

describe("getTimezone", () => {
    test("returns undefined when window is not defined (server)", () => {
        const original = globalThis.window;
        // @ts-expect-error — ensure window is undefined
        delete (globalThis as any).window;
        expect(getTimezone()).toBeUndefined();
        if (original !== undefined) {
            (globalThis as any).window = original;
        }
    });

    test("returns a timezone string when window and Intl are available", () => {
        const original = globalThis.window;
        // @ts-expect-error — minimal mock
        (globalThis as any).window = {};
        const tz = getTimezone();
        // Intl is available in Bun, so this should return a timezone
        expect(typeof tz).toBe("string");
        if (original !== undefined) {
            (globalThis as any).window = original;
        } else {
            // @ts-expect-error — restore
            delete (globalThis as any).window;
        }
    });
});

describe("getLanguage", () => {
    test("returns undefined when navigator is not defined", () => {
        const original = globalThis.navigator;
        // @ts-expect-error — remove navigator
        delete (globalThis as any).navigator;
        expect(getLanguage()).toBeUndefined();
        if (original !== undefined) {
            (globalThis as any).navigator = original;
        }
    });

    test("returns a language string when navigator.language is available", () => {
        const original = globalThis.navigator;
        (globalThis as any).navigator = {
            language: "en-US",
            languages: ["en-US"],
            userAgent: "Mozilla/5.0",
        };
        expect(getLanguage()).toBe("en-US");
        if (original !== undefined) {
            (globalThis as any).navigator = original;
        } else {
            // @ts-expect-error — restore
            delete (globalThis as any).navigator;
        }
    });
});

describe("getConnectionType", () => {
    test("returns undefined when navigator is not defined", () => {
        const original = globalThis.navigator;
        // @ts-expect-error — remove navigator
        delete (globalThis as any).navigator;
        expect(getConnectionType()).toBeUndefined();
        if (original !== undefined) {
            (globalThis as any).navigator = original;
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
        expect(getConnectionType()).toBe("4g");
        if (original !== undefined) {
            (globalThis as any).navigator = original;
        } else {
            // @ts-expect-error — restore
            delete (globalThis as any).navigator;
        }
    });
});

describe("getDeviceType", () => {
    test("returns desktop when navigator is not defined", () => {
        const original = globalThis.navigator;
        // @ts-expect-error — remove navigator
        delete (globalThis as any).navigator;
        expect(getDeviceType()).toBe("desktop");
        if (original !== undefined) {
            (globalThis as any).navigator = original;
        }
    });

    test("returns desktop for non-mobile user agent", () => {
        const original = globalThis.navigator;
        (globalThis as any).navigator = {
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        };
        expect(getDeviceType()).toBe("desktop");
        if (original !== undefined) {
            (globalThis as any).navigator = original;
        } else {
            // @ts-expect-error — restore
            delete (globalThis as any).navigator;
        }
    });

    test("returns mobile for mobile user agent", () => {
        const original = globalThis.navigator;
        (globalThis as any).navigator = {
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15",
        };
        expect(getDeviceType()).toBe("mobile");
        if (original !== undefined) {
            (globalThis as any).navigator = original;
        } else {
            // @ts-expect-error — restore
            delete (globalThis as any).navigator;
        }
    });

    test("returns tablet for iPad user agent", () => {
        const original = globalThis.navigator;
        (globalThis as any).navigator = {
            userAgent: "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15",
        };
        expect(getDeviceType()).toBe("tablet");
        if (original !== undefined) {
            (globalThis as any).navigator = original;
        } else {
            // @ts-expect-error — restore
            delete (globalThis as any).navigator;
        }
    });
});
