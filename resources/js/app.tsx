import './bootstrap';
import '../css/app.css';
import './i18n';

import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

const appName = import.meta.env.VITE_APP_NAME || 'Acceptra';

// A stray 403/422 that isn't a valid Inertia page response (e.g. a bare <Link>
// navigation into a route the current user isn't authorized for) otherwise renders
// as a blank page with no feedback — surface it instead of leaving the user stuck.
router.on('httpException', (event) => {
    const status = event.detail.response.status;
    if (status === 403 || status === 404 || status === 422) {
        window.alert('Aksi ini tidak diizinkan atau halaman tidak ditemukan. Silakan kembali dan coba lagi.');
        window.history.back();
        return false;
    }
});

createInertiaApp({
    title: (title) => `${title} — ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        // Seed i18next with the server-determined locale (user's preferred_language)
        const locale = (props.initialPage.props as { locale?: string }).locale ?? 'id';
        i18n.changeLanguage(locale);

        const root = createRoot(el);
        root.render(
            <I18nextProvider i18n={i18n}>
                <App {...props} />
            </I18nextProvider>,
        );
    },
    progress: {
        color: '#55AA39',
    },
});
