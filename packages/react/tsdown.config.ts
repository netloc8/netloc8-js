import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsdown';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
    entry: ['./src/index.ts'],
    format: 'esm',
    dts: true,
    clean: true,
    banner: { js: '"use client";' },
    define: {
        '__PKG_NAME__': JSON.stringify(pkg.name),
        '__PKG_VERSION__': JSON.stringify(pkg.version),
    },
});
