import { describe, expect, test } from "bun:test";
import type { Geo } from "@netloc8/core";
import { readGeoHeaders } from "./proxy";

describe("header transport round-trip", () => {
    // Test that setGeoHeaders → readGeoHeaders preserves all fields.
    // We import readGeoHeaders directly; setGeoHeaders is internal,
    // so we manually set headers to simulate what setGeoHeaders would produce.

    function makeHeaders(geo: Geo): Headers {
        const headers = new Headers();

        // Manually replicate what setGeoHeaders does
        const headerMap: [string, string | undefined][] = [
            ["x-netloc8-ip", geo.query?.value],
            ["x-netloc8-ip-version", geo.query?.ipVersion?.toString()],
            ["x-netloc8-continent-code", geo.location?.continent?.code],
            ["x-netloc8-continent-name", geo.location?.continent?.name],
            ["x-netloc8-country-code", geo.location?.country?.code],
            ["x-netloc8-country-name", geo.location?.country?.name],
            ["x-netloc8-country-flag", geo.location?.country?.flag],
            [
                "x-netloc8-country-unions",
                geo.location?.country?.unions ? JSON.stringify(geo.location.country.unions) : undefined,
            ],
            ["x-netloc8-region-code", geo.location?.region?.code],
            ["x-netloc8-region-name", geo.location?.region?.name],
            ["x-netloc8-district", geo.location?.district],
            ["x-netloc8-city", geo.location?.city],
            ["x-netloc8-postal-code", geo.location?.postalCode],
            ["x-netloc8-latitude", geo.location?.coordinates?.latitude?.toString()],
            ["x-netloc8-longitude", geo.location?.coordinates?.longitude?.toString()],
            ["x-netloc8-accuracy-radius", geo.location?.coordinates?.accuracyRadius?.toString()],
            ["x-netloc8-timezone", geo.location?.timezone],
            ["x-netloc8-utc-offset", geo.location?.utcOffset],
            ["x-netloc8-geo-confidence", geo.location?.geoConfidence?.toString()],
            ["x-netloc8-asn", geo.network?.asn],
            ["x-netloc8-asn-org", geo.network?.organization],
            ["x-netloc8-asn-domain", geo.network?.domain],
            ["x-netloc8-precision", geo.meta?.precision],
            ["x-netloc8-degraded", geo.meta?.degraded?.toString()],
            ["x-netloc8-timezone-from-client", geo.location?.timezoneFromClient?.toString()],
        ];

        for (const [key, value] of headerMap) {
            if (value !== undefined) {
                headers.set(key, encodeURIComponent(value));
            }
        }

        return headers;
    }

    test("round-trips a full Geo object through headers", () => {
        const original: Geo = {
            query: { type: "ip", value: "8.8.8.8", ipVersion: 4 },
            location: {
                continent: { code: "NA", name: "North America" },
                country: { code: "US", name: "United States", flag: "🇺🇸", unions: ["NATO"] },
                region: { code: "CA", name: "California" },
                district: "Santa Clara County",
                city: "Mountain View",
                postalCode: "94043",
                coordinates: { latitude: 37.386, longitude: -122.084, accuracyRadius: 621 },
                timezone: "America/Los_Angeles",
                utcOffset: "-07:00",
                geoConfidence: 1.0,
                timezoneFromClient: false,
            },
            network: { asn: "AS15169", organization: "Google LLC", domain: "google.com" },
            meta: { precision: "city", degraded: false },
        };

        const headers = makeHeaders(original);
        const reconstructed = readGeoHeaders(headers);

        // query (type is not transported through headers)
        expect(reconstructed.query?.value).toBe("8.8.8.8");
        expect(reconstructed.query?.ipVersion).toBe(4);

        // location
        expect(reconstructed.location?.continent?.code).toBe("NA");
        expect(reconstructed.location?.continent?.name).toBe("North America");
        expect(reconstructed.location?.country?.code).toBe("US");
        expect(reconstructed.location?.country?.name).toBe("United States");
        expect(reconstructed.location?.country?.flag).toBe("🇺🇸");
        expect(reconstructed.location?.country?.unions).toEqual(["NATO"]);
        expect(reconstructed.location?.region?.code).toBe("CA");
        expect(reconstructed.location?.region?.name).toBe("California");
        expect(reconstructed.location?.district).toBe("Santa Clara County");
        expect(reconstructed.location?.city).toBe("Mountain View");
        expect(reconstructed.location?.postalCode).toBe("94043");
        expect(reconstructed.location?.coordinates?.latitude).toBe(37.386);
        expect(reconstructed.location?.coordinates?.longitude).toBe(-122.084);
        expect(reconstructed.location?.coordinates?.accuracyRadius).toBe(621);
        expect(reconstructed.location?.timezone).toBe("America/Los_Angeles");
        expect(reconstructed.location?.utcOffset).toBe("-07:00");
        expect(reconstructed.location?.geoConfidence).toBe(1.0);
        expect(reconstructed.location?.timezoneFromClient).toBe(false);

        // network
        expect(reconstructed.network?.asn).toBe("AS15169");
        expect(reconstructed.network?.organization).toBe("Google LLC");
        expect(reconstructed.network?.domain).toBe("google.com");

        // meta
        expect(reconstructed.meta?.precision).toBe("city");
        expect(reconstructed.meta?.degraded).toBe(false);
    });

    test("handles empty headers", () => {
        const headers = new Headers();
        const geo = readGeoHeaders(headers);
        expect(geo.query).toBeUndefined();
        expect(geo.location).toBeUndefined();
        expect(geo.network).toBeUndefined();
    });

    test("handles partial headers (country only)", () => {
        const headers = new Headers();
        headers.set("x-netloc8-country-code", encodeURIComponent("DE"));

        const geo = readGeoHeaders(headers);
        expect(geo.location?.country?.code).toBe("DE");
        expect(geo.location?.city).toBeUndefined();
    });

    test("handles EU country unions array", () => {
        const headers = new Headers();
        headers.set("x-netloc8-country-code", encodeURIComponent("DE"));
        headers.set("x-netloc8-country-unions", encodeURIComponent(JSON.stringify(["EU"])));

        const geo = readGeoHeaders(headers);
        expect(geo.location?.country?.unions).toEqual(["EU"]);
    });

    test("handles boolean degraded header", () => {
        const headers = new Headers();
        headers.set("x-netloc8-degraded", encodeURIComponent("true"));

        const geo = readGeoHeaders(headers);
        expect(geo.meta?.degraded).toBe(true);
    });
});
