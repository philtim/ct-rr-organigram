import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    const env = loadEnv(mode, process.cwd());
    process.env = { ...process.env, ...env };

    const baseUrl = env.VITE_BASE_URL;

    return defineConfig({
        base: `/ccm/${env.VITE_KEY}/`,
        plugins: [vue()],
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
