import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import id from './locales/id.json';
import en from './locales/en.json';

i18n.use(initReactI18next).init({
    resources: {
        id: { translation: id },
        en: { translation: en },
    },
    lng: 'id',
    fallbackLng: 'id',
    interpolation: { escapeValue: false },
    // Missing keys fall back to key name, not an error (BR-I18N edge case)
    saveMissing: false,
});

export default i18n;
