import React, { useEffect, useState, useCallback } from 'react';
import { Users, Search, Shield, Trash2, UserCheck } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, getInitials, getErrorMessage } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const { data } = await api.get(`/users${params}`);
      setUsers(data.users);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleRoleChange = async (userId, role) => {
    try {
      const { data } = await api.put(`/users/${userId}/role`, { role });
      setUsers(prev => prev.map(u => u._id === userId ? data.user : u));
      toast.success(`Role updated to ${role}`);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers(prev => prev.filter(u => u._id !== userId));
      toast.success('User deleted');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const memberCount = users.filter(u => u.role === 'member').length;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">{users.length} total · {adminCount} admin{adminCount !== 1 ? 's' : ''} · {memberCount} member{memberCount !== 1 ? 's' : ''}</p>
      </div>

      {/* Stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Users', value: users.length, color: 'var(--accent)', icon: <Users size={18} /> },
          { label: 'Admins', value: adminCount, color: 'var(--yellow)', icon: <Shield size={18} /> },
          { label: 'Members', value: memberCount, color: 'var(--green)', icon: <UserCheck size={18} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: `${color}20`, color }}>{icon}</div>
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="search-input-wrap" style={{ marginBottom: 20, maxWidth: 360 }}>
        <Search size={15} />
        <input
          className="form-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Users list */}
      {loading ? (
        <div className="flex justify-center" style={{ padding: 60 }}><div className="spinner spinner-lg" /></div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Users size={48} /></div>
          <h3>No users found</h3>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px 120px 80px', gap: 8, padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            {['User', 'Role', 'Joined', 'Change Role', ''].map(h => (
              <span key={h} style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>{h}</span>
            ))}
          </div>
          {users.map(u => (
            <div
              key={u._id}
              style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px 120px 80px', gap: 8, padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center', opacity: !u.isActive ? 0.5 : 1 }}
            >
              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="avatar avatar-md" style={{ background: u.avatarColor, color: '#fff', flexShrink: 0 }}>
                  {getInitials(u.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {u.name}
                    {u._id === me?._id && <span style={{ fontSize: '0.68rem', background: 'var(--accent-glow)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 10 }}>You</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                </div>
              </div>

              {/* Role badge */}
              <span className={`badge badge-${u.role}`}>{u.role}</span>

              {/* Joined */}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(u.createdAt)}</span>

              {/* Role change */}
              {u._id !== me?._id ? (
                <select
                  className="filter-select"
                  value={u.role}
                  onChange={e => handleRoleChange(u._id, e.target.value)}
                  style={{ fontSize: '0.8rem' }}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
              )}

              {/* Delete */}
              {u._id !== me?._id ? (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(u._id, u.name)}
                >
                  <Trash2 size={13} />
                </button>
              ) : (
                <div />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
