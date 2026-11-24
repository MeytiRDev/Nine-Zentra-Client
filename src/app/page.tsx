'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, api, clearSession, errorMessage, getToken } from '../lib/api';
import type { PublicUser } from '../lib/types';
import ChatApp from '../components/ChatApp';
import { LogoMark } from '../components/Logo';

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setError('');
    api<{ user: PublicUser }>('/api/auth/me')
      .then(({ user }) => setMe(user))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          clearSession();
          router.replace('/login');
        } else {
          setError(errorMessage(e));
        }
      });
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="center">
        <p className="error">{error}</p>
        <button className="btn primary" onClick={load}>
          تلاش دوباره
        </button>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="center splash">
        <LogoMark size={64} />
      </div>
    );
  }

  return <ChatApp initialMe={me} />;
}
