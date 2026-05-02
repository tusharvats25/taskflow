import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, CheckSquare, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import {
  formatDate, getInitials, STATUS_LABELS, STATUS_COLORS,
  PRIORITY_COLORS, PRIORITY_LABELS, getErrorMessage, isOverdue
} from '../utils/helpers';
import toast from 'react-hot-toast';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

function TaskModal({ task, onClose, onSaved }) {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    project: task?.project?._id || task?.project || '',
    assignee: task?.assignee?._id || task?.assignee || '',
    dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [pRes, uRes] = await Promise.all([
        api.get('/projects'),
        api.get('/users'),
      ]);
      setProjects(pRes.data.projects);
      setUsers(uRes.data.users);
    };
    load();
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title required'); return; }
    if (!form.project) { toast.error('Select a project'); return; }
    setLoading(true);
    try {
      const payload = { ...form, assignee: form.assignee || null, dueDate: form.dueDate || null };
      const res = task
        ? await api.put(`/tasks/${task._id}`, payload)
        : await api.post('/tasks', payload);
      onSaved(res.data.task);
      toast.success(task ? 'Task updated' : 'Task created');
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={set('title')} placeholder="Task title" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="Optional details…" />
          </div>
          <div className="form-group">
            <label className="form-label">Project *</label>
            <select className="form-select" value={form.project} onChange={set('project')}>
              <option value="">— Select Project —</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="form-group flex-1">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={set('status')}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="form-group flex-1">
              <label className="form-label">Assignee</label>
              <select className="form-select" value={form.assignee} onChange={set('assignee')}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={form.dueDate} onChange={set('dueDate')} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <div className="spinner" />}
              {task ? 'Update' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', priority: '', assignee: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.assignee) params.set('assignee', filters.assignee);
      if (search) params.set('search', search);
      const { data } = await api.get(`/tasks?${params}`);
      setTasks(data.tasks);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }, [filters, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleSaved = (t) => {
    setTasks(prev => {
      const idx = prev.findIndex(x => x._id === t._id);
      if (idx >= 0) { const n = [...prev]; n[idx] = t; return n; }
      return [t, ...prev];
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(prev => prev.filter(t => t._id !== id));
      toast.success('Task deleted');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const setFilter = k => e => setFilters(f => ({ ...f, [k]: e.target.value }));
  const overdueCnt = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''}{overdueCnt > 0 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>· {overdueCnt} overdue</span>}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-input-wrap" style={{ flex: 1, maxWidth: 280 }}>
          <Search size={15} />
          <input
            className="form-input"
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={filters.status} onChange={setFilter('status')}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select className="filter-select" value={filters.priority} onChange={setFilter('priority')}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
        </select>
        <select className="filter-select" value={filters.assignee} onChange={setFilter('assignee')}>
          <option value="">All Assignees</option>
          <option value="me">Assigned to Me</option>
        </select>
        {(filters.status || filters.priority || filters.assignee || search) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ status: '', priority: '', assignee: '' }); setSearch(''); }}>
            Clear
          </button>
        )}
      </div>

      {/* Overdue banner */}
      {overdueCnt > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(242,87,87,0.08)', border: '1px solid rgba(242,87,87,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16, color: 'var(--red)', fontSize: '0.875rem' }}>
          <AlertTriangle size={16} />
          <strong>{overdueCnt} overdue task{overdueCnt > 1 ? 's' : ''}</strong> — these are past their due date
        </div>
      )}

      {/* Task table */}
      {loading ? (
        <div className="flex justify-center" style={{ padding: 60 }}><div className="spinner spinner-lg" /></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><CheckSquare size={48} /></div>
          <h3>No tasks found</h3>
          <p>Create a task or adjust your filters</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModal('create')}>
            <Plus size={16} /> New Task
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 110px 100px 40px', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            {['Task', 'Status', 'Priority', 'Due Date', 'Assignee', ''].map(h => (
              <span key={h} style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>{h}</span>
            ))}
          </div>
          {tasks.map(task => {
            const overdue = isOverdue(task.dueDate, task.status);
            return (
              <div
                key={task._id}
                style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 110px 100px 40px', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => setModal(task)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.5 : 1 }}>
                    {task.title}
                  </div>
                  {task.project && (
                    <Link to={`/projects/${task.project._id}`} onClick={e => e.stopPropagation()}
                      style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, textDecoration: 'none' }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: task.project.color, display: 'inline-block' }} />
                      {task.project.name}
                    </Link>
                  )}
                </div>
                <span className={`badge ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
                <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
                <span style={{ fontSize: '0.8rem', color: overdue ? 'var(--red)' : 'var(--text-secondary)' }}>
                  {overdue && '⚠ '}{formatDate(task.dueDate)}
                </span>
                <div>
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="avatar avatar-sm" style={{ background: task.assignee.avatarColor, color: '#fff' }}>
                        {getInitials(task.assignee.name)}
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.assignee.name.split(' ')[0]}</span>
                    </div>
                  ) : <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>}
                </div>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={e => { e.stopPropagation(); handleDelete(task._id); }}
                  style={{ color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <TaskModal
          task={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
