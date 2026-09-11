import { useEffect, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthAPI } from '@/api';
import { Field, Logo } from '@/components';
import { useAuth } from '@/contexts/AuthContext';

function LoginPage() {
  const { isAuthenticated, signIn, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    username: 'teacher',
    password: 'teacher123',
    name: '',
    student_no: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (isAuthenticated) {
      navigate(
        user.role === 'teacher' ? '/teacher/dashboard' : '/student/profile',
        { replace: true }
      );
    }
  }, [isAuthenticated, navigate, user]);

  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'register') {
        await AuthAPI.register(form);
        setMode('login');
        setForm({ ...form, password: '' });
      } else {
        const session = await AuthAPI.login(form);
        signIn(session);
        const fallback =
          session.user.role === 'teacher'
            ? '/teacher/dashboard'
            : '/student/profile';
        navigate(location.state?.from?.pathname || fallback, { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const demo = (role) =>
    setForm(
      role === 'teacher'
        ? { ...form, username: 'teacher', password: 'teacher123' }
        : { ...form, username: 'student1', password: 'student123' }
    );
  return (
    <div className="login-page">
      <section className="login-story">
        <Logo />
        <div className="story-copy">
          <span className="eyebrow light">每一个成长，都有迹可循</span>
          <h1>
            看见学生的
            <br />
            <em>闪光与成长</em>
          </h1>
          <p>
            用数据理解学习轨迹，用兴趣连接每一次机会，让教育建议更有温度、更有依据。
          </p>
        </div>
        <div className="quote-card">
          <Sparkles size={20} />
          <p>教育不是注满一桶水，而是点燃一把火。</p>
          <small>— 叶芝</small>
        </div>
        <span className="orb one" />
        <span className="orb two" />
      </section>
      <section className="login-panel">
        <div className="login-box">
          <div className="mobile-logo">
            <Logo />
          </div>
          <span className="eyebrow">欢迎回来</span>
          <h2>{mode === 'login' ? '登录知行' : '创建学生账号'}</h2>
          <p className="muted">
            {mode === 'login'
              ? '进入你的专属成长空间'
              : '填写基础信息，开启成长记录'}
          </p>
          <div className="login-tabs">
            <button
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              登录
            </button>
            <button
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              学生注册
            </button>
          </div>
          <form onSubmit={submit}>
            {mode === 'register' && (
              <div className="form-grid">
                <Field label="姓名">
                  <input
                    name="name"
                    value={form.name}
                    onChange={update}
                    placeholder="真实姓名"
                  />
                </Field>
                <Field label="学号">
                  <input
                    name="student_no"
                    value={form.student_no}
                    onChange={update}
                    placeholder="如 2026007"
                  />
                </Field>
              </div>
            )}
            <Field label="用户名">
              <input
                name="username"
                value={form.username}
                onChange={update}
                autoComplete="username"
                placeholder="请输入用户名"
              />
            </Field>
            <Field label="密码">
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={update}
                autoComplete="current-password"
                placeholder="至少 6 位"
              />
            </Field>
            {error && <div className="form-error">{error}</div>}
            <button className="primary wide" disabled={loading}>
              {loading ? '请稍候…' : mode === 'login' ? '登录系统' : '完成注册'}
              <ChevronRight size={18} />
            </button>
          </form>
          {mode === 'login' && (
            <div className="demo-accounts">
              <span>快速体验</span>
              <button onClick={() => demo('teacher')}>教师账号</button>
              <button onClick={() => demo('student')}>学生账号</button>
            </div>
          )}
        </div>
        <small className="copyright">
          © 2026 知行学生成长中心 · 让每一次进步被看见
        </small>
      </section>
    </div>
  );
}

export default LoginPage;
