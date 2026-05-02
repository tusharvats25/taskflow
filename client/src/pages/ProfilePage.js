import React, { useState } from 'react';
import { User, Lock, Palette } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getInitials, AVATAR_COLORS, getErrorMessage } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [nameForm, setNameForm] = useState({ name: user?.name || '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [selectedColor, setSelectedColor] = useState(user?.avatarColor || AVATAR_COLORS[0]);
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [loadingColor, setLoadingColor] = useState(false);

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    if (!nameForm.name.trim()) { toast.error('Name required'); return; }
    setLoadingName(true);
    try {
      const { data } = await api.put('/auth/me', { name: nameForm.name });
      updateUser(data.user);
      toast.success('Name updated');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoadingName(false); }
  };

  const handleColorUpdate = async () => {
    setLoadingColor(true);
    try {
      const { data } = await api.put('/auth/me', { avatarColor: selectedColor });
      updateUser(data.user);
      toast.success('Avatar color updated');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoadingColor(false); }
  };

  const handlePassUpdate = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirm) { toast.error("Passwords don't match"); return; }
    if (passForm.newPassword.length < 6) { toast.error('Min 6 characters'); return; }
    setLoadingPass(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      toast.success('Password changed');
      setPassForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoadingPass(false); }
  };

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your account settings</p>
      </div>

      {/* Avatar preview */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div className="avatar avatar-xl" style={{ background: selectedColor, color: '#fff', fontSize: '1.6rem' }}>
          {getInitials(user?.name)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user?.email}</div>
          <span className={`badge badge-${user?.role}`} style={{ marginTop: 6, display: 'inline-flex' }}>{user?.role}</span>
        </div>
      </div>

      {/* Update Name */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 18 }}>
          <div style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent)', borderRadius: 'var(--radius-md)', padding: 8 }}>
            <User size={18} />
          </div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Display Name</h2>
        </div>
        <form onSubmit={handleNameUpdate} style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input flex-1"
            value={nameForm.name}
            onChange={e => setNameForm({ name: e.target.value })}
            placeholder="Your name"
          />
          <button type="submit" className="btn btn-primary" disabled={loadingName}>
            {loadingName ? <div className="spinner" /> : 'Save'}
          </button>
        </form>
      </div>

      {/* Avatar Color */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 18 }}>
          <div style={{ background: 'rgba(245,185,66,0.12)', color: 'var(--yellow)', borderRadius: 'var(--radius-md)', padding: 8 }}>
            <Palette size={18} />
          </div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Avatar Color</h2>
        </div>
        <div className="flex gap-3 flex-wrap" style={{ marginBottom: 16 }}>
          {AVATAR_COLORS.map(c => (
            <div
              key={c}
              onClick={() => setSelectedColor(c)}
              style={{
                width: 36, height: 36, borderRadius: '50%', background: c, cursor: 'pointer',
                border: selectedColor === c ? '3px solid #fff' : '3px solid transparent',
                boxShadow: selectedColor === c ? `0 0 0 2px ${c}` : 'none',
                transition: 'all 0.15s',
              }}
            />
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleColorUpdate} disabled={loadingColor}>
          {loadingColor ? <div className="spinner" /> : 'Update Color'}
        </button>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="flex items-center gap-3" style={{ marginBottom: 18 }}>
          <div style={{ background: 'rgba(242,87,87,0.12)', color: 'var(--red)', borderRadius: 'var(--radius-md)', padding: 8 }}>
            <Lock size={18} />
          </div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Change Password</h2>
        </div>
        <form onSubmit={handlePassUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" value={passForm.currentPassword}
              onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))}
              placeholder="••••••••" autoComplete="current-password" />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={passForm.newPassword}
              onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))}
              placeholder="Min. 6 characters" autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" value={passForm.confirm}
              onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat new password" autoComplete="new-password" />
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={loadingPass}>
              {loadingPass ? <div className="spinner" /> : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
