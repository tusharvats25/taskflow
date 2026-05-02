import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, UserPlus, Trash2, MoreVertical, Pencil } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  formatDate, getInitials, STATUS_LABELS, STATUS_COLORS,
  PRIORITY_COLORS, PRIORITY_LABELS, getErrorMessage, isOverdue
} from '../utils/helpers';
import toast from 'react-hot-toast';

const STATUSES = ['todo','in_progress','review','done'];
const PRIORITIES = ['low','medium','high','critical'];

// ─── TASK FORM MODAL ──────────────────────────────────────────────────────────
function TaskModal({ task, projectId, members, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee: task?.assignee?._id || task?.assignee || '',
    dueDate: task?.dueDate ? task.dueDate.slice(0,10) : '',
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setLoading(true);
    try {
      const payload = { ...form, project: projectId, assignee: form.assignee || null, dueDate: form.dueDate || null };
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
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={set('title')} placeholder="What needs to be done?" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="Add more context…" />
          </div>
          <div className="flex gap-3">
            <div className="form-group flex-1">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={set('status')}>
                {STATUSES.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map(p=><option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="form-group flex-1">
              <label className="form-label">Assignee</label>
              <select className="form-select" value={form.assignee} onChange={set('assignee')}>
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                ))}
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
              {loading && <div className="spinner"/>}
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ADD MEMBER MODAL ─────────────────────────────────────────────────────────
function AddMemberModal({ projectId, onClose, onAdded }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/users?search=${encodeURIComponent(search)}`);
      setResults(data.users);
    } catch { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const add = async (userId) => {
    try {
      const { data } = await api.post(`/projects/${projectId}/members`, { userId });
      onAdded(data.project);
      toast.success('Member added');
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add Member</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <input className="form-input flex-1" placeholder="Search by name or email…"
            value={search} onChange={e=>setSearch(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&doSearch()} />
          <button className="btn btn-primary" onClick={doSearch} disabled={loading}>
            {loading?<div className="spinner"/>:'Search'}
          </button>
        </div>
        {results.length > 0 && (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {results.map(u => (
              <div key={u._id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--bg-elevated)',borderRadius:'var(--radius-md)'}}>
                <div className="avatar avatar-md" style={{background:u.avatarColor,color:'#fff'}}>{getInitials(u.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:'0.9rem'}}>{u.name}</div>
                  <div style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{u.email}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={()=>add(u._id)}>Add</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KANBAN CARD ──────────────────────────────────────────────────────────────
function KanbanCard({ task, onEdit, onDelete, canManage }) {
  const [menu, setMenu] = useState(false);
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div className="kanban-task-card" onClick={()=>onEdit(task)}>
      <div className="flex items-start justify-between gap-2" style={{marginBottom:8}}>
        <p style={{fontSize:'0.875rem',fontWeight:600,lineHeight:1.35,flex:1}}>{task.title}</p>
        {canManage && (
          <div onClick={e=>e.stopPropagation()} style={{flexShrink:0}}>
            <button className="btn btn-ghost btn-icon" style={{padding:'2px 4px',height:'auto'}}
              onClick={()=>setMenu(!menu)}>
              <MoreVertical size={14}/>
            </button>
            {menu && (
              <div className="dropdown-menu" onClick={()=>setMenu(false)}>
                <button className="dropdown-item" onClick={()=>onEdit(task)}><Pencil size={13}/>Edit</button>
                <div className="dropdown-separator"/>
                <button className="dropdown-item danger" onClick={()=>onDelete(task._id)}><Trash2 size={13}/>Delete</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap" style={{marginBottom:8}}>
        <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
        {overdue && <span className="badge badge-overdue">Overdue</span>}
      </div>

      <div className="flex items-center justify-between" style={{marginTop:8}}>
        {task.dueDate && (
          <span style={{fontSize:'0.72rem',color:overdue?'var(--red)':'var(--text-muted)'}}>
            📅 {formatDate(task.dueDate)}
          </span>
        )}
        {task.assignee ? (
          <div className="avatar avatar-sm tooltip" data-tip={task.assignee.name}
            style={{background:task.assignee.avatarColor,color:'#fff',marginLeft:'auto'}}>
            {getInitials(task.assignee.name)}
          </div>
        ) : (
          <div className="avatar avatar-sm" style={{background:'var(--border)',color:'var(--text-muted)',marginLeft:'auto',fontSize:'0.6rem'}}>?</div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAdmin } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('kanban');
  const [modal, setModal] = useState(null);
  const [addMemberModal, setAddMemberModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?project=${id}&limit=200`),
      ]);
      setProject(projRes.data.project);
      setTasks(taskRes.data.tasks);
    } catch (err) {
      toast.error(getErrorMessage(err));
      navigate('/projects');
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const canManage = () => {
    if (!project || !currentUser) return false;
    return isAdmin || project.owner?._id === currentUser._id || project.isAdmin?.(currentUser._id)
      || project.members?.some(m => m.user?._id === currentUser._id && m.role === 'admin');
  };

  const handleTaskSaved = (t) => {
    setTasks(prev => {
      const idx = prev.findIndex(x => x._id === t._id);
      if (idx >= 0) { const n=[...prev]; n[idx]=t; return n; }
      return [t, ...prev];
    });
  };

  const handleTaskDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      toast.success('Task deleted');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      const { data } = await api.delete(`/projects/${id}/members/${userId}`);
      setProject(data.project);
      toast.success('Member removed');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const allMembers = project ? [
    { user: project.owner, role: 'admin' },
    ...(project.members || [])
  ] : [];

  if (loading) return <div className="page flex justify-center" style={{paddingTop:80}}><div className="spinner spinner-lg"/></div>;
  if (!project) return null;

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  const colColors = { todo:'var(--text-muted)', in_progress:'var(--blue)', review:'var(--yellow)', done:'var(--green)' };

  return (
    <div className="page" style={{maxWidth:'100%'}}>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <Link to="/projects" className="btn btn-ghost btn-sm" style={{marginBottom:12,gap:4}}>
          <ArrowLeft size={15}/> Back to Projects
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3" style={{marginBottom:6}}>
              <div style={{width:12,height:12,borderRadius:'50%',background:project.color,flexShrink:0}}/>
              <h1 style={{fontSize:'1.6rem',fontWeight:800,fontFamily:'var(--font-display)'}}>{project.name}</h1>
              <span className={`badge badge-${project.status}`}>{project.status?.replace('_',' ')}</span>
            </div>
            {project.description && <p style={{color:'var(--text-secondary)',fontSize:'0.9rem'}}>{project.description}</p>}
          </div>
          <div className="flex gap-2">
            {canManage() && (
              <button className="btn btn-secondary btn-sm" onClick={()=>setAddMemberModal(true)}>
                <UserPlus size={14}/> Add Member
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={()=>setModal('create')}>
              <Plus size={14}/> New Task
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3" style={{marginBottom:20}}>
        <div className="tabs">
          {['kanban','list','members'].map(t=>(
            <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
              {t==='kanban'?'Kanban':t==='list'?'List':'Members'}
            </button>
          ))}
        </div>
        <span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>{tasks.length} tasks</span>
      </div>

      {/* Kanban */}
      {tab==='kanban' && (
        <div className="kanban-board">
          {STATUSES.map(status=>(
            <div key={status} className="kanban-col">
              <div className="kanban-col-header">
                <div className="flex items-center gap-2">
                  <div style={{width:8,height:8,borderRadius:'50%',background:colColors[status]}}/>
                  <span className="kanban-col-title" style={{color:colColors[status]}}>{STATUS_LABELS[status]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{fontSize:'0.75rem',background:'var(--bg-overlay)',padding:'1px 7px',borderRadius:10,color:'var(--text-muted)'}}>
                    {tasksByStatus[status].length}
                  </span>
                  <button className="btn btn-ghost btn-icon btn-sm" title="Add task"
                    onClick={()=>setModal({status})}>
                    <Plus size={14}/>
                  </button>
                </div>
              </div>
              <div className="kanban-col-body">
                {tasksByStatus[status].length === 0 && (
                  <div style={{padding:'16px 8px',textAlign:'center',color:'var(--text-muted)',fontSize:'0.8rem',border:'1px dashed var(--border)',borderRadius:'var(--radius-md)'}}>
                    No tasks
                  </div>
                )}
                {tasksByStatus[status].map(task=>(
                  <KanbanCard key={task._id} task={task}
                    onEdit={t=>setModal(t)}
                    onDelete={handleTaskDelete}
                    canManage={canManage()}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {tab==='list' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {tasks.length === 0 ? (
            <div className="empty-state"><p>No tasks yet</p></div>
          ) : (
            tasks.map(task=>(
              <div key={task._id} className="task-row" onClick={()=>setModal(task)}>
                <div className="check-circle" style={task.status==='done'?{background:'var(--green)',borderColor:'var(--green)'}:{}}>
                  {task.status==='done' && <span style={{color:'#fff',fontSize:'0.6rem',fontWeight:900}}>✓</span>}
                </div>
                <div style={{flex:1,overflow:'hidden'}}>
                  <div style={{fontWeight:600,fontSize:'0.875rem',textDecoration:task.status==='done'?'line-through':'none',opacity:task.status==='done'?0.5:1}}>{task.title}</div>
                  {task.description && <div style={{fontSize:'0.78rem',color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{task.description}</div>}
                </div>
                <div className="flex items-center gap-2" style={{flexShrink:0}}>
                  <span className={`badge ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
                  <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
                  {task.assignee && (
                    <div className="avatar avatar-sm tooltip" data-tip={task.assignee.name}
                      style={{background:task.assignee.avatarColor,color:'#fff'}}>
                      {getInitials(task.assignee.name)}
                    </div>
                  )}
                  {task.dueDate && (
                    <span style={{fontSize:'0.75rem',color:isOverdue(task.dueDate,task.status)?'var(--red)':'var(--text-muted)'}}>
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Members */}
      {tab==='members' && (
        <div style={{maxWidth:600}}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {allMembers.map((m, i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)'}}>
                <div className="avatar avatar-md" style={{background:m.user?.avatarColor,color:'#fff'}}>{getInitials(m.user?.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600}}>{m.user?.name}</div>
                  <div style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{m.user?.email}</div>
                </div>
                <span className={`badge badge-${m.role}`}>{m.role}</span>
                {canManage() && m.user?._id !== project.owner?._id && m.user?._id !== currentUser?._id && (
                  <button className="btn btn-ghost btn-icon btn-sm" title="Remove"
                    onClick={()=>handleRemoveMember(m.user._id)}>
                    <Trash2 size={14} style={{color:'var(--red)'}}/>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {modal && (
        <TaskModal
          task={modal === 'create' || modal?.status ? null : modal}
          projectId={id}
          members={allMembers.filter(m=>m.user)}
          onClose={()=>setModal(null)}
          onSaved={handleTaskSaved}
        />
      )}
      {addMemberModal && (
        <AddMemberModal
          projectId={id}
          onClose={()=>setAddMemberModal(false)}
          onAdded={setProject}
        />
      )}
    </div>
  );
}
