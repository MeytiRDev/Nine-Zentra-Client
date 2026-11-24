'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { api, apiUpload, errorMessage } from '../lib/api';
import { resizeToJpeg } from '../lib/image';
import type { PublicUser } from '../lib/types';
import Avatar from './Avatar';
import Drawer from './Drawer';
import { CameraIcon } from './Icons';

const MAX_BIO = 200;

interface ProfilePanelProps {
  me: PublicUser;
  onMeChange: (user: PublicUser) => void;
  onClose: () => void;
}

interface Feedback {
  type: 'ok' | 'error';
  text: string;
}

export default function ProfilePanel({ me, onMeChange, onClose }: ProfilePanelProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [bio, setBio] = useState(me.bio);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const dirty = bio.trim() !== me.bio;

  async function run(action: () => Promise<{ user: PublicUser }>, okText: string) {
    setBusy(true);
    setFeedback(null);
    try {
      const { user } = await action();
      onMeChange(user);
      setBio(user.bio);
      setFeedback({ type: 'ok', text: okText });
    } catch (e) {
      setFeedback({ type: 'error', text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // انتخاب دوباره‌ی همان فایل هم کار کند
    if (!file) return;
    await run(async () => {
      const blob = await resizeToJpeg(file);
      return apiUpload<{ user: PublicUser }>('/api/profile/avatar', blob, 'image/jpeg', 'PUT');
    }, 'عکس پروفایل به‌روز شد');
  }

  const saveBio = () => run(() => api<{ user: PublicUser }>('/api/profile', { method: 'PATCH', body: { bio } }), 'بیو ذخیره شد');
  const removeAvatar = () =>
    run(() => api<{ user: PublicUser }>('/api/profile/avatar', { method: 'DELETE' }), 'عکس پروفایل حذف شد');

  return (
    <Drawer title="پروفایل من" onClose={onClose}>
      <div className="profile-hero">
        <div className="avatar-edit">
          <Avatar name={me.username} src={me.avatarUrl} size={112} />
          <button
            className="avatar-camera"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            aria-label="تغییر عکس پروفایل"
            title="تغییر عکس پروفایل"
          >
            <CameraIcon width={18} height={18} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
        </div>
        <strong className="profile-name" dir="ltr">
          {me.username}
        </strong>
        {me.avatarUrl && (
          <button className="link-btn danger" onClick={removeAvatar} disabled={busy}>
            حذف عکس
          </button>
        )}
      </div>

      <div className="set-section">
        <div className="field">
          <label htmlFor="bio">بیو</label>
          <textarea
            id="bio"
            dir="auto"
            rows={4}
            maxLength={MAX_BIO}
            placeholder="چند کلمه درباره‌ی خودتان بنویسید..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <span className="hint counter">
            {bio.length.toLocaleString('fa-IR')} / {MAX_BIO.toLocaleString('fa-IR')}
          </span>
        </div>

        {feedback && <p className={feedback.type === 'ok' ? 'ok-note' : 'error box'}>{feedback.text}</p>}

        <button className="btn primary block" onClick={saveBio} disabled={busy || !dirty}>
          {busy ? 'لطفاً صبر کنید...' : 'ذخیره'}
        </button>
        <p className="hint">عکس و بیوی شما برای مخاطبینتان دیده می‌شود.</p>
      </div>
    </Drawer>
  );
}
