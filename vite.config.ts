import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

// Build-time provenance: shown in the dashboard footer so deployments
// are identifiable. Falls back gracefully when git/package.json aren't
// available (e.g. some sandbox build environments).
function readVersion(): string {
    try {
        const pkg = JSON.parse(readFileSync('./package.json', 'utf8')) as {
            version?: string;
        };
        return pkg.version ?? 'unknown';
    } catch {
        return 'unknown';
    }
}

function readCommit(): string {
    try {
        return execSync('git rev-parse --short=7 HEAD', {
            stdio: ['ignore', 'pipe', 'ignore'],
        })
            .toString()
            .trim();
    } catch {
        return 'unknown';
    }
}

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    const env = loadEnv(mode, process.cwd());
    process.env = { ...process.env, ...env };

    const baseUrl = env.VITE_BASE_URL;

    return defineConfig({
        base: `/ccm/${env.VITE_KEY}/`,
        plugins: [vue()],
        define: {
            __APP_VERSION__: JSON.stringify(readVersion()),
            __APP_COMMIT__: JSON.stringify(readCommit()),
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        // Proxy /api → the configured ChurchTools instance so dev-mode requests
        // look first-party (avoids CORS + works in Safari without extra setup).
        // The proxy is dev-only; production builds talk to the host directly.
        server: baseUrl
            ? {
                  proxy: {
                      '/api': {
                          target: baseUrl,
                          changeOrigin: true,
                          secure: true,
                      },
                  },
              }
            : undefined,
    });
};
