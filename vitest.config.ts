import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Separate from vite.config.ts on purpose (ADR-010). That config is a
 * function of `mode`, shells out to git for build provenance and sets up the
 * dev API proxy — none of which tests need, and all of which would be risk
 * taken on the production build for no gain.
 *
 * Scope is pure logic: `src/shared/rr/**` and `src/shared/**` helpers. No
 * component tests, no jsdom.
 */
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
