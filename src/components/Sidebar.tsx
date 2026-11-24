'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { formatListTime } from '../lib/format';
import type { Contact, IncomingRequest, PublicUser, SearchUser, TypingState } from '../lib/types';
import Avatar from './Avatar';
import Logo from './Logo';
import { CheckIcon, CloseIcon, MicIcon, SearchIcon, SlidersIcon, UserPlusIcon } from './Icons';

interface ResultActionProps {
  user: SearchUser;
  onSend: (user: SearchUser) => void;
  onAccept: (user: SearchUser) => void;
  onOpen: (user: SearchUser) => void;
}

function ResultAction({ user, onSend, onAccept, onOpen }: ResultActionProps) {
  switch (user.relation) {
    case 'accepted':
      return (
        <button className="btn small" onClick={() => onOpen(user)}>
          گفتگو
        </button>
      );
    case 'pending_sent':
      return <span className="tag">در انتظار تایید</span>;
    case 'pending_received':
      return (
        <button className="btn small primary" onClick={() => onAccept(user)}>
          پذیرش درخواست
        </button>
      );
    case 'rejected_sent':
      return <span className="tag">رد شده</span>;
    default:
      return (
        <button className="btn small primary" onClick={() => onSend(user)}>
          <UserPlusIcon width={16} height={16} />
          درخواست چت
        </button>
      );
  }
}

const TYPING_LABEL: Record<TypingState, string> = {
  typing: 'در حال نوشتن...',
  recording: 'در حال ضبط ویس...',
};

interface SidebarProps {
  me: PublicUser;
  contacts: Contact[];
  requests: IncomingRequest[];
  activeId: number | null;
  unread: Record<number, number>;
  typing: Record<number, TypingState>;
  connected: boolean;
  onOpen: (user: PublicUser) => void;
  onAccept: (requestId: number) => Promise<void>;
  onReject: (requestId: number) => Promise<void>;
  onOpenPanel: (panel: 'profile' | 'settings') => void;
}

export default function Sidebar({
  me,
  contacts,
  requests,
  activeId,
  unread,
  typing,
  connected,
  onOpen,
  onAccept,
  onReject,
  onOpenPanel,
}: SidebarProps) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchUser[] | null>(null); // null = جستجو فعال نیست
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const term = q.trim();
    setNotice('');
    if (term.length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { users } = await api<{ users: SearchUser[] }>(`/api/users/search?username=${encodeURIComponent(term)}`);
        if (!cancelled) setResults(users);
      } catch (e) {
        if (!cancelled) setNotice(errorMessage(e));
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  const patch = (id: number, changes: Partial<SearchUser>) =>
    setResults((list) => list && list.map((u) => (u.id === id ? { ...u, ...changes } : u)));

  async function run(fn: () => Promise<void>) {
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }

  const sendRequest = (u: SearchUser) =>
    run(async () => {
      await api('/api/requests', { method: 'POST', body: { toUserId: u.id } });
      patch(u.id, { relation: 'pending_sent' });
    });

  const acceptFromSearch = (u: SearchUser) =>
    run(async () => {
      if (u.requestId === null) return;
      await onAccept(u.requestId);
      patch(u.id, { relation: 'accepted' });
    });

  const openFromSearch = (u: SearchUser) => {
    setQ('');
    onOpen(u);
  };

  return (
    <aside className="sidebar">
      <header className="side-header">
        <Logo size={30} />
        <button className="icon-btn" onClick={() => onOpenPanel('settings')} aria-label="تنظیمات" title="تنظیمات">
          <SlidersIcon />
        </button>
      </header>

      <div className="search">
        <label className="search-box">
          <SearchIcon width={18} height={18} />
          <input dir="ltr" placeholder="جستجوی نام کاربری..." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {notice && <p className="error box">{notice}</p>}
      </div>

      <div className="side-body">
        {results !== null ? (
          <section>
            <h3>نتایج جستجو</h3>
            {results.length === 0 && <p className="hint pad">کاربری با این نام پیدا نشد.</p>}
            {results.map((u) => (
              <div className="row" key={u.id}>
                <Avatar name={u.username} src={u.avatarUrl} size={40} />
                <span className="name grow" dir="ltr">
                  {u.username}
                </span>
                <ResultAction user={u} onSend={sendRequest} onAccept={acceptFromSearch} onOpen={openFromSearch} />
              </div>
            ))}
          </section>
        ) : (
          <>
            {requests.length > 0 && (
              <section>
                <h3>
                  درخواست‌های چت <span className="count">{requests.length.toLocaleString('fa-IR')}</span>
                </h3>
                {requests.map((r) => (
                  <div className="row" key={r.id}>
                    <Avatar name={r.from.username} src={r.from.avatarUrl} size={40} />
                    <span className="name grow" dir="ltr">
                      {r.from.username}
                    </span>
                    <div className="actions">
                      <button
                        className="icon-btn ok"
                        onClick={() => run(() => onAccept(r.id))}
                        aria-label="پذیرش"
                        title="پذیرش"
                      >
                        <CheckIcon />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => run(() => onReject(r.id))}
                        aria-label="رد"
                        title="رد"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section>
              <h3>گفتگوها</h3>
              {contacts.length === 0 && (
                <p className="hint pad">
                  هنوز مخاطبی ندارید. نام کاربری شخص مورد نظر را جستجو کنید و برایش درخواست چت بفرستید.
                </p>
              )}
              {contacts.map((c) => {
                const typingState = typing[c.id];
                const count = unread[c.id] ?? 0;
                return (
                  <button
                    key={c.id}
                    className={`contact ${c.id === activeId ? 'active' : ''}`}
                    onClick={() => onOpen(c)}
                  >
                    <Avatar name={c.username} src={c.avatarUrl} size={46} />
                    <span className="info">
                      <span className="line">
                        <span className="name" dir="ltr">
                          {c.username}
                        </span>
                        <span className="when">{formatListTime(c.lastAt)}</span>
                      </span>
                      <span className="line">
                        {typingState ? (
                          <span className="last typing-text">{TYPING_LABEL[typingState]}</span>
                        ) : c.lastKind === 'voice' ? (
                          <span className="last">
                            <MicIcon width={14} height={14} /> پیام صوتی
                          </span>
                        ) : (
                          <span className="last" dir="auto">
                            {c.lastBody || 'هنوز پیامی ارسال نشده'}
                          </span>
                        )}
                        {count > 0 && <span className="badge">{count.toLocaleString('fa-IR')}</span>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </section>
          </>
        )}
      </div>

      <button className="me" onClick={() => onOpenPanel('profile')} aria-label="پروفایل من">
        <Avatar name={me.username} src={me.avatarUrl} size={38} />
        <span className="me-info">
          <strong dir="ltr">{me.username}</strong>
          <span className="status">
            <i className={`dot ${connected ? 'on' : 'off'}`} />
            {connected ? 'متصل' : 'در حال اتصال...'}
          </span>
        </span>
      </button>
    </aside>
  );
}
