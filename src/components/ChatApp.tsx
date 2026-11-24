'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, api, apiUpload, clearSession, errorMessage } from '../lib/api';
import { connectSocket, type AppSocket } from '../lib/socket';
import type {
  Contact,
  IncomingRequest,
  Message,
  PublicUser,
  SendResult,
  TypingSignal,
  TypingState,
} from '../lib/types';
import ChatWindow from './ChatWindow';
import ContactPanel from './ContactPanel';
import ProfilePanel from './ProfilePanel';
import SettingsPanel from './SettingsPanel';
import Sidebar from './Sidebar';

type Panel = 'profile' | 'settings' | 'contact' | null;

const TYPING_TTL_MS = 5000; // اگر رویداد تازه‌ای نیامد، «در حال نوشتن» خودش محو می‌شود

const sortContacts = (list: Contact[]): Contact[] =>
  [...list].sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? '') || a.username.localeCompare(b.username));

// ادغام دو لیست پیام بر اساس id (بدون تکرار) و مرتب‌سازی صعودی
function mergeMessages(a: Message[], b: Message[]): Message[] {
  const map = new Map<number, Message>();
  for (const m of [...a, ...b]) map.set(m.id, m);
  return [...map.values()].sort((x, y) => x.id - y.id);
}

export default function ChatApp({ initialMe }: { initialMe: PublicUser }) {
  const router = useRouter();
  const [me, setMe] = useState<PublicUser>(initialMe);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [active, setActive] = useState<PublicUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [unread, setUnread] = useState<Record<number, number>>({});
  const [typing, setTyping] = useState<Record<number, TypingState>>({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<Panel>(null);

  const socketRef = useRef<AppSocket | null>(null);
  // برای استفاده در هندلرهای سوکت بدون stale closure
  const activeRef = useRef<PublicUser | null>(null);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;
  const typingTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // router را در ref نگه می‌داریم تا logout (و به‌تبع آن افکت سوکت) با عوض شدن هویت router دوباره ساخته نشود؛
  // وگرنه سوکت در هر رندر قطع و وصل می‌شد.
  const routerRef = useRef(router);
  routerRef.current = router;
  const logout = useCallback(() => {
    clearSession();
    routerRef.current.replace('/login');
  }, []);

  const closePanel = useCallback(() => setPanel(null), []);

  const changeActive = useCallback((user: PublicUser | null) => {
    activeRef.current = user;
    setActive(user);
  }, []);

  // ---------- بارگذاری داده‌ها ----------
  const loadContacts = useCallback(async () => {
    try {
      const { contacts: list } = await api<{ contacts: Contact[] }>('/api/contacts');
      setContacts(sortContacts(list));
      // پروفایل مخاطبِ باز (عکس، بیو) را هم تازه کن
      const current = activeRef.current;
      const fresh = current && list.find((c) => c.id === current.id);
      if (fresh) changeActive({ id: fresh.id, username: fresh.username, bio: fresh.bio, avatarUrl: fresh.avatarUrl });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout();
    }
  }, [logout, changeActive]);

  const loadRequests = useCallback(async () => {
    try {
      const { requests: list } = await api<{ requests: IncomingRequest[] }>('/api/requests/incoming');
      setRequests(list);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout();
    }
  }, [logout]);

  const loadHistory = useCallback(async (contactId: number, before?: number) => {
    const qs = before ? `?before=${before}` : '';
    const res = await api<{ messages: Message[]; hasMore: boolean }>(`/api/messages/${contactId}${qs}`);
    if (activeRef.current?.id !== contactId) return; // کاربر در این فاصله گفتگوی دیگری باز کرده
    setMessages((prev) => mergeMessages(res.messages, prev));
    setHasMore(res.hasMore);
  }, []);

  // ---------- «در حال نوشتن» ----------
  const clearTyping = useCallback((id: number) => {
    clearTimeout(typingTimers.current[id]);
    delete typingTimers.current[id];
    setTyping((t) => {
      if (!(id in t)) return t;
      const next = { ...t };
      delete next[id];
      return next;
    });
  }, []);

  const clearAllTyping = useCallback(() => {
    Object.values(typingTimers.current).forEach((timer) => clearTimeout(timer));
    typingTimers.current = {};
    setTyping({});
  }, []);

  // ---------- اتصال سوکت و رویدادهای لحظه‌ای ----------
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // بعد از (باز)اتصال، هر چه از دست رفته را دوباره بگیر
      void loadContacts();
      void loadRequests();
      const current = activeRef.current;
      if (current) loadHistory(current.id).catch(() => {});
    });
    socket.on('disconnect', () => {
      setConnected(false);
      clearAllTyping();
    });
    socket.on('connect_error', (err) => {
      if (err.message === 'unauthorized') logout();
    });

    socket.on('message:new', (m) => {
      const otherId = m.senderId === me.id ? m.receiverId : m.senderId;
      if (m.senderId !== me.id) clearTyping(otherId); // پیام آمد، یعنی دیگر در حال نوشتن نیست
      if (activeRef.current?.id === otherId) {
        setMessages((prev) => mergeMessages(prev, [m]));
      } else if (m.senderId !== me.id) {
        setUnread((u) => ({ ...u, [otherId]: (u[otherId] ?? 0) + 1 }));
      }
      setContacts((prev) =>
        sortContacts(
          prev.map((c) => (c.id === otherId ? { ...c, lastBody: m.body, lastKind: m.kind, lastAt: m.createdAt } : c))
        )
      );
    });

    socket.on('typing', ({ from, state }) => {
      if (state === 'idle') {
        clearTyping(from);
        return;
      }
      clearTimeout(typingTimers.current[from]);
      setTyping((t) => ({ ...t, [from]: state }));
      typingTimers.current[from] = setTimeout(() => clearTyping(from), TYPING_TTL_MS);
    });

    socket.on('request:new', () => void loadRequests());
    socket.on('request:accepted', () => void loadContacts());
    socket.on('profile:updated', () => {
      void loadContacts();
      void loadRequests();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      clearAllTyping();
    };
  }, [me.id, logout, loadContacts, loadRequests, loadHistory, clearTyping, clearAllTyping]);

  // ---------- کارهای کاربر ----------
  const openChat = useCallback(
    async (user: PublicUser) => {
      changeActive({ id: user.id, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl });
      setMessages([]);
      setHasMore(false);
      setError('');
      setUnread((u) => ({ ...u, [user.id]: 0 }));
      try {
        await loadHistory(user.id);
      } catch (e) {
        setError(errorMessage(e));
      }
    },
    [changeActive, loadHistory]
  );

  const closeChat = useCallback(() => {
    changeActive(null);
    setMessages([]);
    setPanel((p) => (p === 'contact' ? null : p));
  }, [changeActive]);

  const loadOlder = useCallback(async () => {
    const current = activeRef.current;
    const firstId = messagesRef.current[0]?.id;
    if (!current || !firstId) return;
    try {
      await loadHistory(current.id, firstId);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [loadHistory]);

  const sendMessage = useCallback(
    (text: string) =>
      new Promise<SendResult>((resolve) => {
        const socket = socketRef.current;
        const current = activeRef.current;
        if (!socket || !socket.connected || !current) {
          resolve({ ok: false, error: 'اتصال به سرور برقرار نیست' });
          return;
        }
        socket.timeout(5000).emit('message:send', { to: current.id, body: text }, (err, res) => {
          if (err) resolve({ ok: false, error: 'پاسخی از سرور دریافت نشد' });
          else resolve(res);
        });
      }),
    []
  );

  // ویس با HTTP آپلود می‌شود؛ خود پیام از طریق سوکت (message:new) برای هر دو طرف می‌رسد
  const sendVoice = useCallback(async (blob: Blob, durationMs: number): Promise<SendResult> => {
    const current = activeRef.current;
    if (!current) return { ok: false, error: 'گفتگویی باز نیست' };
    try {
      await apiUpload(
        `/api/voice?to=${current.id}&duration=${durationMs}`,
        blob,
        (blob.type || 'audio/webm').split(';')[0]
      );
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorMessage(e) };
    }
  }, []);

  const sendTyping = useCallback((to: number, state: TypingSignal) => {
    const socket = socketRef.current;
    if (socket?.connected) socket.emit('typing', { to, state });
  }, []);

  const acceptRequest = useCallback(
    async (id: number) => {
      await api(`/api/requests/${id}/accept`, { method: 'POST' });
      await Promise.all([loadContacts(), loadRequests()]);
    },
    [loadContacts, loadRequests]
  );

  const rejectRequest = useCallback(
    async (id: number) => {
      await api(`/api/requests/${id}/reject`, { method: 'POST' });
      await loadRequests();
    },
    [loadRequests]
  );

  return (
    <div className={`app ${active ? 'has-active' : ''}`}>
      <Sidebar
        me={me}
        contacts={contacts}
        requests={requests}
        activeId={active?.id ?? null}
        unread={unread}
        typing={typing}
        connected={connected}
        onOpen={openChat}
        onAccept={acceptRequest}
        onReject={rejectRequest}
        onOpenPanel={setPanel}
      />
      <ChatWindow
        me={me}
        contact={active}
        messages={messages}
        hasMore={hasMore}
        error={error}
        connected={connected}
        typing={active ? typing[active.id] : undefined}
        onLoadOlder={loadOlder}
        onSend={sendMessage}
        onSendVoice={sendVoice}
        onTyping={sendTyping}
        onBack={closeChat}
        onOpenContact={() => setPanel('contact')}
      />

      {panel === 'profile' && <ProfilePanel me={me} onMeChange={setMe} onClose={closePanel} />}
      {panel === 'settings' && <SettingsPanel onClose={closePanel} onLogout={logout} />}
      {panel === 'contact' && active && <ContactPanel contact={active} onClose={closePanel} />}
    </div>
  );
}
