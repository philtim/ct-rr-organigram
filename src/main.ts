import { createApp } from 'vue';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import App from './App.vue';

if (import.meta.env.MODE === 'development') {
    await import('./shared/reset.css');
}

declare const window: Window &
    typeof globalThis & {
        settings: {
            base_url?: string;
        };
    };

// In dev we always go through the Vite proxy on '' (same-origin /api/...).
// In production the host either injects window.settings.base_url or we fall
// back to the build-time VITE_BASE_URL (rare — usually the host serves us).
const baseUrl =
    import.meta.env.MODE === 'development'
        ? ''
        : (window.settings?.base_url ?? import.meta.env.VITE_BASE_URL);
churchtoolsClient.setBaseUrl(baseUrl);

const username = import.meta.env.VITE_USERNAME;
const password = import.meta.env.VITE_PASSWORD;
if (import.meta.env.MODE === 'development' && username && password) {
    // As FormData, because only then does the client fetch and send a CSRF
    // token. A JSON login is refused with "CSRF-Token is invalid" as soon as
    // the browser still holds a session cookie from an earlier run.
    const credentials = new FormData();
    credentials.append('username', username);
    credentials.append('password', password);
    await churchtoolsClient.post('/login', credentials);
}

createApp(App).mount('#rr-dashboard-app');
