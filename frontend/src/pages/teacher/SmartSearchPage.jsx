import { useState } from 'react';
import { BrainCircuit, Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TeacherAPI } from '@/api';
import { PageTitle, StudentRow } from '@/components';

function SmartSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState(
    '寻找喜欢摄影、擅长记录校园生活的学生，参加校庆宣传活动'
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const search = async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await TeacherAPI.searchStudents(query));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const openStudent = (student) =>
    navigate(`/teacher/students/${student.id}`, { state: { student } });
  const samples = [
    '寻找擅长运动、团队协作能力强的学生',
    '需要会编程和机器人的科技节志愿者',
    '选拔表达能力好、适合主持活动的学生',
  ];
  return (
    <>
      <PageTitle
        eyebrow="AI 智能匹配"
        title="用一句话，找到合适的学生"
        description="描述活动场景、所需特长或兴趣，系统会从学生档案中进行语义匹配。"
      />
      <section className="search-hero">
        <div className="ai-badge">
          <BrainCircuit size={18} />
          本地语义模型
        </div>
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="例如：寻找热爱环保、有志愿服务经验的学生…"
        />
        <div className="search-actions">
          <span>{query.length} / 200</span>
          <button className="primary" disabled={loading} onClick={search}>
            <Search size={18} />
            {loading ? '正在理解需求…' : '开始匹配'}
          </button>
        </div>
      </section>
      <div className="sample-row">
        <span>试试这样问</span>
        {samples.map((item) => (
          <button key={item} onClick={() => setQuery(item)}>
            {item}
          </button>
        ))}
      </div>
      {error && <div className="form-error">{error}</div>}
      {result && (
        <section className="card result-card">
          <div className="card-head">
            <div>
              <h3>为你找到 {result.count} 位学生</h3>
              <p>按兴趣描述与活动需求的语义相似度排序</p>
            </div>
            <span className="engine-label">
              <span />
              本地安全检索
            </span>
          </div>
          <div className="student-list">
            {result.students.map((student) => (
              <div key={student.id} className="matched-item">
                <StudentRow student={student} onOpen={openStudent} showScore />
                <p>
                  <Sparkles size={14} />
                  {student.match_reason}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      {!result && (
        <div className="search-placeholder">
          <span>
            <Search size={32} />
          </span>
          <h3>让每个机会找到合适的人</h3>
          <p>系统只在校内档案中进行匹配，兴趣信息不会发送给外部服务。</p>
        </div>
      )}
    </>
  );
}

export default SmartSearchPage;
