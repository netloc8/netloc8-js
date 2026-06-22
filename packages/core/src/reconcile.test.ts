import { describe, expect, test } from "bun:test";
import { reconcileGeo } from "./reconcile";
import type { Geo } from "./types";

describe("reconcileGeo", () => {
    test("merges cookie + platform + api with correct priority", () => {
        const cookie: Partial<Geo> = {
            query: { value: "8.8.8.8" },
            location: {
                country: { code: "US" },
                city: "Old City",
                timezone: "America/Chicago",
                timezoneFromClient: true,
            },
        };

        const platform: Partial<Geo> = {
            location: {
                country: { code: "US" },
                region: { code: "CA" },
            },
        };

        const api: Partial<Geo> = {
            query: { type: "ip", value: "8.8.8.8", ipVersion: 4 },
            location: {
                country: { code: "US", name: "United States" },
                city: "Mountain View",
                timezone: "America/Los_Angeles",
                timezoneFromClient: false,
            },
            network: { asn: "AS15169" },
        };

        const result = reconcileGeo({ cookie, platform, api, ip: "8.8.8.8" });

        // API takes priority for most fields
        expect(result.location?.city).toBe("Mountain View");
        expect(result.location?.country?.name).toBe("United States");
        expect(result.location?.timezone).toBe("America/Los_Angeles");
        expect(result.network?.asn).toBe("AS15169");

        // Platform's region survives (API didn't set it)
        expect(result.location?.region?.code).toBe("CA");

        // IP is set
        expect(result.query?.value).toBe("8.8.8.8");
    });

    test("falls back to cookie when no API or platform data", () => {
        const cookie: Partial<Geo> = {
            query: { value: "8.8.8.8" },
            location: {
                country: { code: "US" },
                city: "Cached City",
            },
        };

        const result = reconcileGeo({ cookie, ip: "8.8.8.8" });

        expect(result.location?.country?.code).toBe("US");
        expect(result.location?.city).toBe("Cached City");
    });

    test("preserves cookie timezoneFromClient when IP matches", () => {
        const cookie: Partial<Geo> = {
            query: { value: "8.8.8.8" },
            location: {
                timezone: "America/Chicago",
                timezoneFromClient: true,
            },
        };

        const result = reconcileGeo({ cookie, ip: "8.8.8.8" });

        expect(result.location?.timezone).toBe("America/Chicago");
        expect(result.location?.timezoneFromClient).toBe(true);
    });

    test("marks cookie timezone as stale when IP changes", () => {
        const cookie: Partial<Geo> = {
            query: { value: "1.1.1.1" },
            location: {
                timezone: "America/Chicago",
                timezoneFromClient: true,
            },
        };

        const result = reconcileGeo({ cookie, ip: "8.8.8.8" });

        // Timezone is kept but marked as no longer client-confirmed
        expect(result.location?.timezone).toBe("America/Chicago");
        expect(result.location?.timezoneFromClient).toBe(false);
    });

    test("handles empty sources", () => {
        const result = reconcileGeo({ ip: "8.8.8.8" });

        expect(result.query?.value).toBe("8.8.8.8");
        expect(result.location).toBeUndefined();
    });

    test("deep-merges nested objects without clobbering", () => {
        const cookie: Partial<Geo> = {
            location: {
                country: { code: "US", name: "United States" },
                coordinates: { latitude: 37.0, longitude: -122.0, accuracyRadius: 1000 },
            },
        };

        const api: Partial<Geo> = {
            location: {
                country: { code: "US", flag: "🇺🇸" },
                coordinates: { latitude: 37.386, longitude: -122.084 },
            },
        };

        const result = reconcileGeo({ cookie, api, ip: "8.8.8.8" });

        // API overwrites lat/lng but cookie's accuracyRadius survives
        expect(result.location?.coordinates?.latitude).toBe(37.386);
        expect(result.location?.coordinates?.longitude).toBe(-122.084);
        expect(result.location?.coordinates?.accuracyRadius).toBe(1000);

        // API adds flag, cookie's name survives
        expect(result.location?.country?.code).toBe("US");
        expect(result.location?.country?.name).toBe("United States");
        expect(result.location?.country?.flag).toBe("🇺🇸");
    });

    test("works with platform-only data", () => {
        const platform: Partial<Geo> = {
            location: {
                country: { code: "DE" },
            },
        };

        const result = reconcileGeo({ platform, ip: "1.2.3.4" });

        expect(result.query?.value).toBe("1.2.3.4");
        expect(result.location?.country?.code).toBe("DE");
    });
});
