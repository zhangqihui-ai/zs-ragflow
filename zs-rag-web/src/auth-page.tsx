import { ArrowLeft, Check, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, authenticate, clearSession, loginDestination, readSession } from './session';
import { ThemeControl } from './theme-control';

const nicknamePattern = /^[\p{L}\p{N} ._'-]+$/u;
const rememberedEmailKey = 'zs-rag.remembered-email';

function rememberedEmail() {
  try {
    return localStorage.getItem(rememberedEmailKey) || '';
  } catch {
    return '';
  }
}

function AuthForm() {
  const [email, setEmail] = useState(rememberedEmail);
  const [remember, setRemember] = useState(() => Boolean(rememberedEmail()));
  const [registering, setRegistering] = useState(false);
  const [registerEnabled, setRegisterEnabled] = useState(false);
  const [configFailed, setConfigFailed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(() => Boolean(readSession()));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(() =>
    new URLSearchParams(window.location.search).get('expired') === '1' ? '登录会话已失效，请重新登录。' : '',
  );

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const authorization = readSession();

    if (authorization) {
      api('/api/v1/users/me', { signal }, authorization)
        .then(() => {
          if (!signal.aborted) window.location.replace(loginDestination());
        })
        .catch((reason) => {
          if (signal.aborted) return;
          if (reason instanceof ApiError && reason.status === 401) {
            clearSession(authorization);
            setNotice('登录会话已失效，请重新登录。');
          } else {
            setError(reason instanceof Error ? reason.message : '无法验证现有会话。');
          }
          setChecking(false);
        });
    }

    api<{ registerEnabled: boolean | number }>('/api/v1/system/config', { signal })
      .then((config) => {
        if (!signal.aborted) setRegisterEnabled(config.registerEnabled === true || config.registerEnabled === 1);
      })
      .catch(() => {
        if (!signal.aborted) setConfigFailed(true);
      });

    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checking || pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get('password') ?? '');
    const nickname = registering ? String(fields.get('nickname') ?? '').trim() : undefined;
    if (nickname !== undefined && !nicknamePattern.test(nickname)) {
      setError('昵称只能包含字母、数字、空格和 . _ \' -。');
      return;
    }

    setPending(true);
    setError('');
    setNotice('');
    try {
      await authenticate(email.trim(), password, nickname);
      const authorization = readSession();
      if (registering) {
        if (authorization) clearSession(authorization);
        form.reset();
        setRegistering(false);
        setShowPassword(false);
        setNotice('注册成功，请登录。');
        return;
      }
      if (!authorization) throw new Error('浏览器未收到登录会话，请允许此站点使用 Cookie 后重试。');
      try {
        if (remember) localStorage.setItem(rememberedEmailKey, email.trim());
        else localStorage.removeItem(rememberedEmailKey);
      } catch {
        // Storing the email is optional and does not affect the session.
      }
      window.location.replace(loginDestination());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败，请重试。');
    } finally {
      setPending(false);
    }
  }

  function toggleRegistration() {
    setRegistering(!registering);
    setShowPassword(false);
    setError('');
    setNotice('');
  }

  if (checking) return <p role="status">正在验证登录会话…</p>;

  return (
    <>
      <h1>{registering ? '注册账户' : '登录工作区'}</h1>
      {notice && <p className="auth-notice" role="status">{notice}</p>}
      <form className="auth-form" onSubmit={submit} key={String(registering)}>
        <label>邮箱<input type="email" name="email" autoComplete="username" required
          value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        {registering && <label>昵称<input name="nickname" autoComplete="nickname" required /></label>}
        <label htmlFor="auth-password">密码</label>
        <div className="password-field">
          <input id="auth-password" type={showPassword ? 'text' : 'password'} name="password" required
            autoComplete={registering ? 'new-password' : 'current-password'} />
          <button className="icon-button" type="button" aria-label={showPassword ? '隐藏密码' : '显示密码'}
            onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        </div>
        {!registering && <label className="remember-email">
          <span className="remember-checkbox">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            <Check size={14} aria-hidden="true" />
          </span>
          记住邮箱
        </label>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="button auth-primary" disabled={pending} type="submit">
          {pending ? '处理中…' : registering ? '注册' : '登录'}
        </button>
      </form>
      {(registering || registerEnabled) && <button className="auth-link" disabled={pending}
        onClick={toggleRegistration}>{registering ? '返回登录' : '注册账户'}</button>}
      {configFailed && <p className="auth-notice">暂时无法读取注册配置。<a href="/login-next">重新加载</a></p>}
    </>
  );
}

function LogoutForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function logout() {
    setPending(true);
    setError('');
    const authorization = readSession();
    try {
      if (authorization) {
        try {
          await api('/api/v1/auth/logout', { method: 'POST' }, authorization);
        } catch (reason) {
          if (!(reason instanceof ApiError && reason.status === 401)) throw reason;
        }
        clearSession(authorization);
      }
      window.location.replace('/login-next');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '退出失败，请重试。');
      setPending(false);
    }
  }

  return (
    <>
      <h1>退出登录</h1>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="auth-form">
        <button className="button auth-primary" disabled={pending} onClick={logout}>
          {pending ? '正在退出…' : '确认退出'}
        </button>
      </div>
    </>
  );
}

export function AuthPage({ logout }: { logout: boolean }) {
  return (
    <div className="auth-page">
      <header className="toolbar">
        <a className="auth-back" href="/"><ArrowLeft size={16} />工作台</a>
        <ThemeControl />
      </header>
      <main className="auth-main">
        <section className="panel auth-card">
          <img src="/favicon.svg" alt="ZS-RAG" width={36} height={36} />
          {logout ? <LogoutForm /> : <AuthForm />}
        </section>
      </main>
    </div>
  );
}
