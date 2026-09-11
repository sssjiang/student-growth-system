import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function Modal({ children, onClose, size = 'md', title }) {
  const { t } = useTranslation();
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal-panel ${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default Modal;
