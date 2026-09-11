import React, { useState } from 'react';
import { Check, Upload } from 'lucide-react';
import { api } from '../../api';
import { PageTitle } from '../../components';

function GradeImportPage({ notify }) {
  const [file, setFile] = useState(null); const [loading, setLoading] = useState(false); const [result, setResult] = useState(null);
  const submit = async () => {
    if (!file) return; setLoading(true);
    try {
      const form = new FormData(); form.append('file', file);
      const data = await api('/teacher/grades/import', { method: 'POST', body: form });
      setResult(data); notify(data.message);
    } catch (err) { notify(err.message); } finally { setLoading(false); }
  };
  return <><PageTitle eyebrow="成绩管理" title="导入原始成绩数据" description="使用统一模板批量录入各学期的语文、数学、英语和政治成绩。" /><div className="two-column">
    <section className="card upload-card"><div className="upload-zone"><span><Upload /></span><h3>{file?.name || '拖放 CSV 文件到这里'}</h3><p>UTF-8 编码，单个文件不超过 10MB</p><label className="secondary">选择文件<input type="file" accept=".csv" hidden onChange={(event) => setFile(event.target.files[0])} /></label></div><button className="primary wide" disabled={!file || loading} onClick={submit}>{loading ? '正在导入…' : '确认导入'}</button>{result && <div className="success-box"><Check /> {result.message}{result.skipped_rows?.length > 0 && `，跳过第 ${result.skipped_rows.join('、')} 行`}</div>}</section>
    <section className="card guide"><h3>CSV 字段说明</h3><p>首行必须包含以下英文列名：</p><code>student_no, year, semester,<br />chinese, math, english, politics</code><ul><li>student_no：已存在的学生学号</li><li>semester：填写 1 或 2</li><li>四科成绩：0–100 之间的数字</li></ul><a download="grades-template.csv" href="data:text/csv;charset=utf-8,%EF%BB%BFstudent_no,year,semester,chinese,math,english,politics%0A2026001,2026,1,88,90,86,84">下载 CSV 示例模板</a></section>
  </div></>;
}

export default GradeImportPage;
