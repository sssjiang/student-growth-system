import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = ['zhCN', 'zhHK', 'en'];

function LanguageSwitcher({ compact = false }) {
  const { i18n, t } = useTranslation();

  return (
    <label className={`language-switcher ${compact ? 'compact' : ''}`}>
      <Languages size={16} />
      {!compact && <span>{t('language.label')}</span>}
      <select
        aria-label={t('language.label')}
        value={i18n.resolvedLanguage || 'zhCN'}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
      >
        {LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {t(`language.${language}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSwitcher;
