import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#00875A',
        showSpinner: false,
    },
});

// Register PWA Service Worker & capture install prompt globally
if (typeof window !== 'undefined') {
    // Capture beforeinstallprompt early so Settings page can use it later
    (window as any).__pwaInstallPrompt = null;
    (window as any).__pwaInstalled = false;

    window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        (window as any).__pwaInstallPrompt = e;
        // Dispatch a custom event so any mounted component can react
        window.dispatchEvent(new CustomEvent('pwa-prompt-captured'));
    });

    window.addEventListener('appinstalled', () => {
        (window as any).__pwaInstallPrompt = null;
        (window as any).__pwaInstalled = true;
        window.dispatchEvent(new CustomEvent('pwa-installed'));
    });

    if ('serviceWorker' in navigator) {
        const registerSW = () => {
            navigator.serviceWorker
                .register('/sw.js')
                .catch((error) => {
                    // Silently ignore InvalidStateError (common in dev/HMR)
                    if (error.name !== 'InvalidStateError') {
                        console.log('Service Worker registration failed:', error);
                    }
                });
        };

        if (document.readyState === 'complete') {
            registerSW();
        } else {
            window.addEventListener('load', registerSW);
        }
    }
}

