'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, errorMessage, getToken, setSession } from '../lib/api';
import type { AuthResponse } from '../lib/types';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const isLogin = mode === 'login';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // کاربر واردشده نیازی به این صفحه ندارد
  useEffect(() => {
    if (getToken()) router.replace('/');
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api<AuthResponse>(`/api/auth/${mode}`, {
        method: 'POST',
        body: { username: username.trim(), password },
      });
      setSession(token);
      router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="auth-page wp-aurora">
      <ThemeToggle className="auth-theme" />

      <form className="auth" onSubmit={onSubmit}>
        <div className="auth-brand">
          <Logo size={56} withText={false} />
          <h1 className="auth-title" dir="ltr">
            Zentra
          </h1>
          <p>{isLogin ? 'خوش برگشتی! وارد حسابت شو.' : 'یک حساب بساز و گفتگو را شروع کن.'}</p>
        </div>

        <div className="field">
          <label htmlFor="username">نام کاربری</label>
          <input
            id="username"
            dir="ltr"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">رمز عبور</label>
          <input
            id="password"
            dir="ltr"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
          />
        </div>

        {!isLogin && <p className="hint">نام کاربری ۳ تا ۲۰ کاراکتر (حروف انگلیسی، عدد و _) و رمز عبور حداقل ۶ کاراکتر باشد.</p>}
        {error && <p className="error box">{error}</p>}

        <button className="btn primary block" disabled={loading}>
          {loading ? 'لطفاً صبر کنید...' : isLogin ? 'ورود' : 'ساخت حساب'}
        </button>

        <p className="hint center-text">
          {isLogin ? (
            <>
              حساب ندارید؟ <Link href="/register">ثبت‌نام</Link>
            </>
          ) : (
            <>
              قبلاً ثبت‌نام کرده‌اید؟ <Link href="/login">ورود</Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
