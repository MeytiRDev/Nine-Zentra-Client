'use client';

import type { PublicUser } from '../lib/types';
import Avatar from './Avatar';
import Drawer from './Drawer';

export default function ContactPanel({ contact, onClose }: { contact: PublicUser; onClose: () => void }) {
  return (
    <Drawer title="اطلاعات مخاطب" onClose={onClose}>
      <div className="profile-hero">
        <Avatar name={contact.username} src={contact.avatarUrl} size={112} />
        <strong className="profile-name" dir="ltr">
          {contact.username}
        </strong>
      </div>
      <div className="set-section">
        <h3>بیو</h3>
        {contact.bio ? (
          <p className="bio-text" dir="auto">
            {contact.bio}
          </p>
        ) : (
          <p className="hint">بیویی ثبت نشده است.</p>
        )}
      </div>
    </Drawer>
  );
}
