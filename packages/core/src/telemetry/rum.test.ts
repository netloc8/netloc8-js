import { describe, test, expect } from "bun:test";
import { initRum } from "./rum";

describe("initRum", () => {
    test("returns a no-op teardown when window is undefined (server)", () => {
        const teardown = initRum();
        expect(typeof teardown).toBe("function");
        // Should not throw
        teardown();
    });

    test("returns a no-op teardown with custom config", () => {
        const teardown = initRum({
            endpoint: "https://custom.endpoint.com/rum",
            sampleRate: 0.5,
        });
        expect(typeof teardown).toBe("function");
        teardown();
    });
});
