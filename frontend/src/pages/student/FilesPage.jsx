import { useEffect, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { StudentAPI } from '@/api';
import { Empty, PageTitle } from '@/components';
import { useToast } from '@/contexts/ToastContext';

function FilesPage() {
  const { notify } = useToast();
  const [files, setFiles] = useState([]);
  const load = () => StudentAPI.getFiles().then((data) => setFiles(data.files));
  useEffect(() => {
    load();
  }, []);
  const upload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const data = await StudentAPI.uploadFile(file);
      setFiles(data.files);
      notify('成长材料上传成功');
    } catch (err) {
      notify(err.message);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="成长材料"
        title="收藏你的每一次收获"
        description="上传作品、证书和活动记录，构成更完整的成长档案。"
        action={
          <label className="primary">
            <Upload size={17} />
            上传材料
            <input type="file" hidden onChange={upload} />
          </label>
        }
      />
      <section className="card file-list">
        {files.length ? (
          files.map((file) => (
            <div key={file.id}>
              <span className="file-icon">
                <FileText />
              </span>
              <span>
                <b>{file.original_name}</b>
                <small>
                  {(file.size / 1024).toFixed(1)} KB · {file.uploaded_at}
                </small>
              </span>
            </div>
          ))
        ) : (
          <Empty>还没有成长材料，上传你的第一份作品吧</Empty>
        )}
      </section>
    </>
  );
}

export default FilesPage;
