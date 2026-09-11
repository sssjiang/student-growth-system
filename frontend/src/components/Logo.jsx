import { useTranslation } from 'react-i18next';

function Logo({ compact = false }) {
  const { t } = useTranslation();
  return (
    <div className={`logo ${compact ? 'compact' : ''}`}>
      <span className="logo-mark">{t('brand.mark')}</span>
      {!compact && (
        <span>
          <b>{t('brand.name')}</b>
          <small>{t('brand.subtitle')}</small>
        </span>
      )}
    </div>
  );
}

export default Logo;
