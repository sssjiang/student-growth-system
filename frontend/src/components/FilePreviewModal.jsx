import { useEffect, useState } from 'react';
import { FileWarning, LoaderCircle } from 'lucide-react';
import Modal from './Modal';

function FilePreviewModal({ credential, loadBlob, onClose }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let objectUrl = '';
    loadBlob(credential.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err) => setError(err.message));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [credential.id, loadBlob]);

  const isImage = credential.mime_type.startsWith('image/');

  return (
    <Modal
      title={credential.title || credential.original_name}
      onClose={onClose}
      size="preview"
    >
      <div className="preview-body">
        {!url && !error && <LoaderCircle className="spin" size={28} />}
        {error && (
          <div className="preview-error">
            <FileWarning />
            <p>{error}</p>
          </div>
        )}
        {url && isImage && <img src={url} alt={credential.title} />}
        {url && !isImage && <iframe src={url} title={credential.title} />}
      </div>
    </Modal>
  );
}

export default FilePreviewModal;
