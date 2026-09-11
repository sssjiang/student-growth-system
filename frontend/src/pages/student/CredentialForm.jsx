import { useState } from 'react';
import { FileUp } from 'lucide-react';
import { Field } from '@/components';
import { formatFileSize } from '@/utils/files';

const TYPES = [
  '学科竞赛',
  '体育赛事',
  '艺术活动',
  '志愿服务',
  '技能证书',
  '校内荣誉',
  '其他',
];

function CredentialForm({ credential, loading, onCancel, onSubmit }) {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: credential?.title || '',
    credential_type: credential?.credential_type || '',
    issuer: credential?.issuer || '',
    awarded_at: credential?.awarded_at || '',
    description: credential?.description || '',
  });
  const [error, setError] = useState('');

  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  const chooseFile = (event) => {
    const nextFile = event.target.files[0];
    if (nextFile && nextFile.size > 10 * 1024 * 1024) {
      setError('文件不能超过 10MB');
      return;
    }
    setError('');
    setFile(nextFile || null);
  };
  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.credential_type) {
      setError('请填写荣誉名称并选择类型');
      return;
    }
    if (!credential && !file) {
      setError('请选择需要上传的文件');
      return;
    }
    onSubmit(file, form);
  };

  return (
    <form className="credential-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="荣誉名称">
          <input
            name="title"
            value={form.title}
            onChange={update}
            placeholder="例如：校园摄影大赛一等奖"
          />
        </Field>
        <Field label="荣誉类型">
          <select
            name="credential_type"
            value={form.credential_type}
            onChange={update}
          >
            <option value="">请选择</option>
            {TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field label="颁发机构">
          <input
            name="issuer"
            value={form.issuer}
            onChange={update}
            placeholder="学校或主办单位"
          />
        </Field>
        <Field label="获得日期">
          <input
            name="awarded_at"
            type="date"
            value={form.awarded_at}
            onChange={update}
          />
        </Field>
      </div>
      <Field label="补充说明">
        <textarea
          name="description"
          value={form.description}
          onChange={update}
          placeholder="简单说明参与过程、作品或收获"
        />
      </Field>
      <label className="credential-file-picker">
        <FileUp size={22} />
        <span>
          <b>
            {file?.name ||
              (credential ? '保留原文件，或点击替换' : '点击选择凭证文件')}
          </b>
          <small>
            {file
              ? formatFileSize(file.size)
              : '支持 PDF、Word、JPG、PNG、TXT，最大 10MB'}
          </small>
        </span>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
          hidden
          onChange={chooseFile}
        />
      </label>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          取消
        </button>
        <button className="primary" disabled={loading}>
          {loading ? '正在提交…' : credential ? '重新提交审核' : '提交审核'}
        </button>
      </div>
    </form>
  );
}

export default CredentialForm;
