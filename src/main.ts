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
    await devLogin(username, password);
}

/**
 * Two browser states need two logins. Without a session, ChurchTools refuses
 * to hand out a CSRF token (401 on /csrftoken), so only a JSON login works.
 * With a stale session cookie from an earlier run, a JSON login is refused
 * with "CSRF-Token is invalid", and only FormData — for which the client
 * fetches and sends a token — gets through. Try the one, then the other; and
 * mount either way, so a failed login shows the app's own error rather than
 * a blank page.
 */
async function devLogin(user: string, pass: string): Promise<void> {
    try {
        await churchtoolsClient.post('/login', { username: user, password: pass });
        return;
    } catch {
        // Fall through to the CSRF-token login below.
    }
    try {
        const credentials = new FormData();
        credentials.append('username', user);
        credentials.append('password', pass);
        await churchtoolsClient.post('/login', credentials);
    } catch (e) {
        console.error('[rr-dashboard] dev login failed:', e);
    }
}

createApp(App).mount('#rr-dashboard-app');
