import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import zhCN from './zhCN.json';
import zhHK from './zhHK.json';

const normalizeLanguage = (language) => {
  const normalized = language.toLowerCase().replace('_', '-');
  if (
    normalized === 'zhhk' ||
    normalized.startsWith('zh-hk') ||
    normalized.startsWith('zh-tw') ||
    normalized.startsWith('zh-hant')
  ) {
    return 'zhHK';
  }
  if (normalized === 'zhcn' || normalized.startsWith('zh')) return 'zhCN';
  if (normalized.startsWith('en')) return 'en';
  return language;
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zhCN: { translation: zhCN },
      zhHK: { translation: zhHK },
    },
    fallbackLng: 'zhCN',
    supportedLngs: ['en', 'zhCN', 'zhHK'],
    load: 'currentOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: normalizeLanguage,
    },
    interpolation: { escapeValue: false },
    returnObjects: true,
  });

const HTML_LANGUAGE = { en: 'en', zhCN: 'zh-CN', zhHK: 'zh-HK' };
const updateDocumentLanguage = (language) => {
  document.documentElement.lang = HTML_LANGUAGE[language] || 'zh-CN';
};

updateDocumentLanguage(i18n.resolvedLanguage);
i18n.on('languageChanged', updateDocumentLanguage);

export default i18n;
