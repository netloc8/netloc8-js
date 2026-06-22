import { readFileSync } from "node:fs";
import type { UserConfig } from "tsdown";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

const config: UserConfig = {
    entry: ["./src/index.ts"],
    format: "esm",
    dts: true,
    clean: true,
    minify: true,
    banner: { js: '"use client";' },
    define: {
        __PKG_NAME__: JSON.stringify(pkg.name),
        __PKG_VERSION__: JSON.stringify(pkg.version),
    },
};

export default config;
