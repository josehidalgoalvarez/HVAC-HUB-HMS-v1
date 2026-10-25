import React, { useEffect, useState } from 'react';
import { apiClient } from '../../src/api/client';

interface AuthGateProps {
  children: React.ReactNode;
}

// Gate is active in local dev, or when VITE_REQUIRE_LOGIN=true. The static mockup build is unaffected.
const gateEnabled =
  import.meta.env.DEV || import.meta.env.VITE_REQUIRE_LOGIN === 'true';

const ACCENT = '#0077b6';

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => apiClient.getToken());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onUnauthorized = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setError(detail?.message || 'Your session expired. Please sign in again.');
      setToken(null);
    };
    window.addEventListener('hvachome:unauthorized', onUnauthorized);
    return () => window.removeEventListener('hvachome:unauthorized', onUnauthorized);
  }, []);

  if (!gateEnabled) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await apiClient.login(email.trim(), password);
      if (res?.token) {
        setPassword('');
        setToken(res.token);
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    apiClient.clearToken();
    setToken(null);
    setError('');
  };

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <form
          onSubmit={submit}
          id="login-form"
          noValidate
          className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined" style={{ color: ACCENT, fontSize: 32 }} aria-hidden="true">
              thermostat
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sign in</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Technician or management account</p>
            </div>
          </div>

          <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Email
          </label>
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: 20 }} aria-hidden="true">mail</span>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 pl-10 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0077b6]"
            />
          </div>

          <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Password
          </label>
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: 20 }} aria-hidden="true">lock</span>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 pl-10 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0077b6]"
            />
          </div>

          {error && (
            <p
              id="login-error"
              role="alert"
              className="flex items-start gap-2 mb-4 text-sm font-semibold text-red-700 dark:text-red-400"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">error</span>
              <span>{error}</span>
            </p>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={busy || !email || !password}
            className="w-full h-12 rounded-lg text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">login</span>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    );
  }

  const user = apiClient.getUser();
  return (
    <>
      <div
        id="auth-bar"
        className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
      >
        <span className="flex items-center gap-2 min-w-0 text-slate-700 dark:text-slate-200">
          <span className="material-symbols-outlined" style={{ color: ACCENT, fontSize: 20 }} aria-hidden="true">account_circle</span>
          <span id="auth-user-email" className="truncate">{user?.email || 'Signed in'}</span>
        </span>
        <button
          id="logout-button"
          type="button"
          onClick={logout}
          className="flex items-center gap-1 h-10 px-3 rounded-lg font-semibold border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 shrink-0"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">logout</span>
          Log out
        </button>
      </div>
      {children}
    </>
  );
};

export default AuthGate;
