import { errorMessage } from '@/api/errors';
import { useLoginMutation, useRegisterMutation } from '@/api';
import { useEffect, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Field, LanguageSwitcher, Logo } from '@/components';
import { useAuth } from '@/hooks/useAuth';

function LoginPage() {
  const { t } = useTranslation();
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
  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const loading = loginState.isLoading || registerState.isLoading;
  useEffect(() => {
    if (isAuthenticated) {
      navigate(
        user.role === 'admin'
          ? '/admin/dashboard'
          : user.role === 'teacher'
            ? '/teacher/dashboard'
            : '/student/profile',
        { replace: true }
      );
    }
  }, [isAuthenticated, navigate, user]);

  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (mode === 'register') {
        await register(form).unwrap();
        setMode('login');
        setForm({ ...form, password: '' });
      } else {
        const session = await login(form).unwrap();
        signIn(session);
        const fallback =
          session.user.role === 'admin'
            ? '/admin/dashboard'
            : session.user.role === 'teacher'
              ? '/teacher/dashboard'
              : '/student/profile';
        navigate(location.state?.from?.pathname || fallback, { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err, t));
    }
  };
  const demo = (role) =>
    setForm(
      role === 'admin'
        ? { ...form, username: 'admin', password: 'admin123' }
        : role === 'teacher'
          ? { ...form, username: 'teacher', password: 'teacher123' }
          : { ...form, username: 'student1', password: 'student123' }
    );
  return (
    <div className="login-page">
      <section className="login-story">
        <Logo />
        <div className="story-copy">
          <span className="eyebrow light">{t('login.storyEyebrow')}</span>
          <h1>
            {t('login.headline')}
            <br />
            <em>{t('login.headlineEm')}</em>
          </h1>
          <p>{t('login.story')}</p>
        </div>
        <div className="quote-card">
          <Sparkles size={20} />
          <p>{t('login.quote')}</p>
          <small>{t('login.quoteAuthor')}</small>
        </div>
        <span className="orb one" />
        <span className="orb two" />
      </section>
      <section className="login-panel">
        <div className="login-language">
          <LanguageSwitcher />
        </div>
        <div className="login-box">
          <div className="mobile-logo">
            <Logo />
          </div>
          <span className="eyebrow">{t('login.welcome')}</span>
          <h2>
            {t(mode === 'login' ? 'login.signInTitle' : 'login.registerTitle')}
          </h2>
          <p className="muted">
            {t(mode === 'login' ? 'login.signInDesc' : 'login.registerDesc')}
          </p>
          <div className="login-tabs">
            <button
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              {t('login.signInTab')}
            </button>
            <button
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              {t('login.registerTab')}
            </button>
          </div>
          <form onSubmit={submit}>
            {mode === 'register' && (
              <div className="form-grid">
                <Field label={t('login.name')}>
                  <input
                    name="name"
                    value={form.name}
                    onChange={update}
                    placeholder={t('login.realName')}
                  />
                </Field>
                <Field label={t('login.studentNo')}>
                  <input
                    name="student_no"
                    value={form.student_no}
                    onChange={update}
                    placeholder={t('login.studentNoExample')}
                  />
                </Field>
              </div>
            )}
            <Field label={t('login.username')}>
              <input
                name="username"
                value={form.username}
                onChange={update}
                autoComplete="username"
                placeholder={t('login.usernamePlaceholder')}
              />
            </Field>
            <Field label={t('login.password')}>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={update}
                autoComplete="current-password"
                placeholder={t('login.passwordPlaceholder')}
              />
            </Field>
            {error && <div className="form-error">{error}</div>}
            <button className="primary wide" disabled={loading}>
              {loading
                ? t('login.waiting')
                : t(mode === 'login' ? 'login.signIn' : 'login.finishRegister')}
              <ChevronRight size={18} />
            </button>
          </form>
          {mode === 'login' && (
            <div className="demo-accounts">
              <span>{t('login.quickDemo')}</span>
              <button onClick={() => demo('teacher')}>
                {t('login.teacherAccount')}
              </button>
              <button onClick={() => demo('admin')}>
                {t('login.adminAccount')}
              </button>
              <button onClick={() => demo('student')}>
                {t('login.studentAccount')}
              </button>
            </div>
          )}
        </div>
        <small className="copyright">{t('login.copyright')}</small>
      </section>
    </div>
  );
}

export default LoginPage;
