import { describe, expect, test } from "bun:test";
import { isEU } from "./helpers";
import type { Geo } from "./types";

describe("isEU", () => {
    test("returns true when country unions include EU", () => {
        const geo: Geo = { location: { country: { code: "DE", unions: ["EU"] } } };
        expect(isEU(geo)).toBe(true);
    });

    test("returns false when country unions do not include EU", () => {
        const geo: Geo = { location: { country: { code: "US", unions: [] } } };
        expect(isEU(geo)).toBe(false);
    });

    test("returns false when unions is undefined", () => {
        const geo: Geo = { location: { country: { code: "US" } } };
        expect(isEU(geo)).toBe(false);
    });

    test("returns false when country is undefined", () => {
        const geo: Geo = { location: {} };
        expect(isEU(geo)).toBe(false);
    });

    test("returns false when location is undefined", () => {
        const geo: Geo = {};
        expect(isEU(geo)).toBe(false);
    });

    test("returns false for empty geo", () => {
        expect(isEU({})).toBe(false);
    });

    test("returns true when unions has EU among other values", () => {
        const geo: Geo = { location: { country: { code: "FR", unions: ["EU", "NATO", "G7"] } } };
        expect(isEU(geo)).toBe(true);
    });
});
