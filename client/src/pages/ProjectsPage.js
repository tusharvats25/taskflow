import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, MoreVertical, Pencil, Trash2, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  formatDate, getInitials, PROJECT_COLORS,
  PROJECT_STATUS_LABELS, getErrorMessage
} from '../utils/helpers';
import toast from 'react-hot-toast';

const STATUSES = ['active','completed','archived','on_hold'];
const PRIORITIES = ['low','medium','high'];

function ProjectModal({ project, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'active',
    priority: project?.priority || 'medium',
    color: project?.color || PROJECT_COLORS[0],
    dueDate: project?.dueDate ? project.dueDate.slice(0,10) : '',
  });
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name required'); return; }
    setLoading(true);
    try {
      const payload = { ...form, dueDate: form.dueDate || null };
      const res = project
        ? await api.put(`/projects/${project._id}`, payload)
        : await api.post('/projects', payload);
      onSaved(res.data.project);
      toast.success(project ? 'Project updated' : 'Project created');
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{project ? 'Edit Project' : 'New Project'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-input" value={form.name} onChange={set('name')} placeholder="My Awesome Project" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="What is this project about?" />
          </div>
          <div className="flex gap-3">
            <div className="form-group flex-1">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={set('status')}>
                {STATUSES.map(s=><option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input className="form-input" type="date" value={form.dueDate} onChange={set('dueDate')} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map(c=>(
                <div
                  key={c}
                  className={`color-swatch ${form.color===c?'selected':''}`}
                  style={{background:c}}
                  onClick={()=>setForm(f=>({...f,color:c}))}
                />
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner"/> : null}
              {project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | project
  const [openMenu, setOpenMenu] = useState(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data.projects);
    } catch { toast.error('Failed to load projects'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (p) => {
    setProjects(prev => {
      const idx = prev.findIndex(x => x._id === p._id);
      if (idx >= 0) { const n=[...prev]; n[idx]=p; return n; }
      return [p, ...prev];
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(prev => prev.filter(p => p._id !== id));
      toast.success('Project deleted');
    } catch (err) { toast.error(getErrorMessage(err)); }
    setOpenMenu(null);
  };

  const canEdit = (p) => isAdmin || p.owner?._id === user?._id || p.owner === user?._id;

  const filtered = filter
    ? projects.filter(p => p.status === filter)
    : projects;

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{marginBottom:20}}>
        {['','active','completed','on_hold','archived'].map(s => (
          <button
            key={s}
            className={`btn btn-sm ${filter===s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={()=>setFilter(s)}
          >
            {s ? PROJECT_STATUS_LABELS[s] : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center" style={{padding:60}}><div className="spinner spinner-lg"/></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FolderKanban size={48}/></div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button className="btn btn-primary" style={{marginTop:12}} onClick={()=>setModal('create')}>
            <Plus size={16}/> Create Project
          </button>
        </div>
      ) : (
        <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
          {filtered.map(p => {
            const done = p.taskCounts?.done || 0;
            const total = p.totalTasks || 0;
            const pct = total ? Math.round((done/total)*100) : 0;
            return (
              <div key={p._id} className="card" style={{
                display:'flex',flexDirection:'column',gap:14,position:'relative',
                borderTop:`3px solid ${p.color||'var(--accent)'}`,transition:'transform 0.15s'
              }}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/projects/${p._id}`} style={{flex:1,textDecoration:'none'}}>
                    <h3 style={{fontSize:'1rem',fontWeight:700,marginBottom:4}}>{p.name}</h3>
                  </Link>
                  {canEdit(p) && (
                    <div className="dropdown">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setOpenMenu(openMenu===p._id?null:p._id)}>
                        <MoreVertical size={15}/>
                      </button>
                      {openMenu===p._id && (
                        <div className="dropdown-menu" onClick={()=>setOpenMenu(null)}>
                          <button className="dropdown-item" onClick={()=>setModal(p)}>
                            <Pencil size={14}/> Edit
                          </button>
                          <div className="dropdown-separator"/>
                          <button className="dropdown-item danger" onClick={()=>handleDelete(p._id)}>
                            <Trash2 size={14}/> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p style={{fontSize:'0.825rem',color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                  {p.description || 'No description provided.'}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge badge-${p.status}`}>{PROJECT_STATUS_LABELS[p.status]}</span>
                  {p.dueDate && <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Due {formatDate(p.dueDate)}</span>}
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between" style={{marginBottom:5,fontSize:'0.75rem',color:'var(--text-muted)'}}>
                    <span>{done}/{total} tasks</span><span>{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width:`${pct}%`,background:p.color||'var(--accent)'}}/>
                  </div>
                </div>

                <div className="flex items-center justify-between" style={{marginTop:2}}>
                  {/* Members */}
                  <div className="avatar-stack">
                    {[p.owner, ...(p.members||[]).map(m=>m.user)].filter(Boolean).slice(0,4).map((u,i)=>(
                      <div key={i} className="avatar avatar-sm tooltip" data-tip={u.name||''} style={{background:u.avatarColor||'#6366f1',color:'#fff',zIndex:10-i}}>
                        {getInitials(u.name)}
                      </div>
                    ))}
                  </div>
                  <Link to={`/projects/${p._id}`} className="btn btn-ghost btn-sm" style={{color:'var(--accent)',gap:4}}>
                    Open <ArrowRight size={13}/>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ProjectModal
          project={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
