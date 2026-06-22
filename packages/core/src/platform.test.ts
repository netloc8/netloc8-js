import { describe, expect, test } from "bun:test";
import { getGeoFromPlatformHeaders } from "./platform";

describe("getGeoFromPlatformHeaders", () => {
    test("extracts Vercel headers into nested Geo", () => {
        const headers = new Headers({
            "x-vercel-ip-country": "US",
            "x-vercel-ip-country-region": "CA",
            "x-vercel-ip-city": "Mountain%20View",
            "x-vercel-ip-latitude": "37.386",
            "x-vercel-ip-longitude": "-122.084",
            "x-vercel-ip-timezone": "America/Los_Angeles",
        });

        const geo = getGeoFromPlatformHeaders(headers);

        expect(geo.location?.country?.code).toBe("US");
        expect(geo.location?.region?.code).toBe("CA");
        expect(geo.location?.city).toBe("Mountain View");
        expect(geo.location?.coordinates?.latitude).toBe(37.386);
        expect(geo.location?.coordinates?.longitude).toBe(-122.084);
        expect(geo.location?.timezone).toBe("America/Los_Angeles");
    });

    test("extracts Cloudflare country header", () => {
        const headers = new Headers({
            "cf-ipcountry": "DE",
        });

        const geo = getGeoFromPlatformHeaders(headers);
        expect(geo.location?.country?.code).toBe("DE");
    });

    test("extracts CloudFront country header", () => {
        const headers = new Headers({
            "cloudfront-viewer-country": "JP",
        });

        const geo = getGeoFromPlatformHeaders(headers);
        expect(geo.location?.country?.code).toBe("JP");
    });

    test("Vercel country takes priority over Cloudflare", () => {
        const headers = new Headers({
            "x-vercel-ip-country": "US",
            "cf-ipcountry": "DE",
        });

        const geo = getGeoFromPlatformHeaders(headers);
        expect(geo.location?.country?.code).toBe("US");
    });

    test("returns empty object when no platform headers present", () => {
        const headers = new Headers({
            "content-type": "application/json",
        });

        const geo = getGeoFromPlatformHeaders(headers);
        expect(geo.location).toBeUndefined();
    });

    test("handles invalid latitude gracefully", () => {
        const headers = new Headers({
            "x-vercel-ip-latitude": "not-a-number",
        });

        const geo = getGeoFromPlatformHeaders(headers);
        expect(geo.location?.coordinates?.latitude).toBeUndefined();
    });

    test("handles partial Vercel headers", () => {
        const headers = new Headers({
            "x-vercel-ip-country": "GB",
        });

        const geo = getGeoFromPlatformHeaders(headers);
        expect(geo.location?.country?.code).toBe("GB");
        expect(geo.location?.region).toBeUndefined();
        expect(geo.location?.city).toBeUndefined();
    });
});
