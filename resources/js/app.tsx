import './bootstrap';
import '../css/app.css';
import './i18n';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

const appName = import.meta.env.VITE_APP_NAME || 'Acceptra';

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
