import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, FolderKanban, AlertTriangle, Clock, ArrowRight, TrendingUp } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, isOverdue, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, getInitials } from '../utils/helpers';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, projRes] = await Promise.all([
          api.get('/tasks/dashboard/stats'),
          api.get('/projects?status=active'),
        ]);
        setStats(statsRes.data.stats);
        setProjects(projRes.data.projects.slice(0, 4));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div className="page flex items-center justify-center" style={{minHeight:400}}>
      <div className="spinner spinner-lg" />
    </div>
  );

  const statusMap = {};
  stats?.byStatus?.forEach(({ _id, count }) => { statusMap[_id] = count; });
  const total = stats?.totalTasks || 0;

  const statCards = [
    { label: 'My Active Tasks', value: stats?.myActiveTasks ?? 0, icon: <CheckSquare size={18}/>, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Total Projects',  value: stats?.totalProjects ?? 0,  icon: <FolderKanban size={18}/>, color: '#22d3a0', bg: 'rgba(34,211,160,0.12)' },
    { label: 'Overdue Tasks',   value: stats?.overdueTasks ?? 0,   icon: <AlertTriangle size={18}/>, color: '#f25757', bg: 'rgba(242,87,87,0.12)' },
    { label: 'Due This Week',   value: stats?.dueSoon?.length ?? 0, icon: <Clock size={18}/>, color: '#f5b942', bg: 'rgba(245,185,66,0.12)' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Here's what's happening with your team today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:32}}>
        {statCards.map(({ label, value, icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{background:bg,color}}>
              {icon}
            </div>
            <div className="stat-value" style={{color}}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid" style={{gridTemplateColumns:'1fr 1fr',gap:24}}>
        {/* Task Breakdown */}
        <div className="card">
          <div className="flex items-center justify-between" style={{marginBottom:20}}>
            <h2 style={{fontSize:'1rem',fontWeight:700}}>Task Overview</h2>
            <span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>{total} total</span>
          </div>
          {['todo','in_progress','review','done'].map(s => {
            const cnt = statusMap[s] || 0;
            const pct = total ? Math.round((cnt / total) * 100) : 0;
            return (
              <div key={s} style={{marginBottom:14}}>
                <div className="flex justify-between" style={{marginBottom:6}}>
                  <span style={{fontSize:'0.85rem'}}>{STATUS_LABELS[s]}</span>
                  <span style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>{cnt} ({pct}%)</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width:`${pct}%`,
                    background: s==='done'?'var(--green)':s==='in_progress'?'var(--blue)':s==='review'?'var(--yellow)':'var(--border-light)'
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Due Soon */}
        <div className="card">
          <div className="flex items-center justify-between" style={{marginBottom:16}}>
            <h2 style={{fontSize:'1rem',fontWeight:700}}>Due This Week</h2>
            <Link to="/tasks" className="btn btn-ghost btn-sm" style={{gap:4,color:'var(--accent)'}}>
              View all <ArrowRight size={14}/>
            </Link>
          </div>
          {!stats?.dueSoon?.length ? (
            <div className="empty-state" style={{padding:'30px 0'}}>
              <p>🎉 Nothing due this week</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {stats.dueSoon.slice(0,5).map(task => (
                <div key={task._id} style={{
                  display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                  background:'var(--bg-elevated)',borderRadius:'var(--radius-md)',
                  border:'1px solid var(--border)'
                }}>
                  <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
                  <span style={{flex:1,fontSize:'0.875rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{task.title}</span>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                    {task.assignee && (
                      <div className="avatar avatar-sm" style={{background:task.assignee.avatarColor,color:'#fff'}}>
                        {getInitials(task.assignee.name)}
                      </div>
                    )}
                    <span style={{fontSize:'0.75rem',color: isOverdue(task.dueDate,task.status)?'var(--red)':'var(--text-muted)'}}>
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Projects */}
      {projects.length > 0 && (
        <div style={{marginTop:24}}>
          <div className="flex items-center justify-between" style={{marginBottom:16}}>
            <h2 style={{fontSize:'1rem',fontWeight:700}}>Active Projects</h2>
            <Link to="/projects" className="btn btn-ghost btn-sm" style={{color:'var(--accent)'}}>
              View all <ArrowRight size={14}/>
            </Link>
          </div>
          <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
            {projects.map(p => {
              const done = p.taskCounts?.done || 0;
              const total = p.totalTasks || 0;
              const pct = total ? Math.round((done/total)*100) : 0;
              return (
                <Link to={`/projects/${p._id}`} key={p._id} className="card" style={{
                  display:'flex',flexDirection:'column',gap:12,textDecoration:'none',
                  borderLeft:`3px solid ${p.color || 'var(--accent)'}`,transition:'transform 0.15s'
                }}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 style={{fontSize:'0.95rem',fontWeight:700,lineHeight:1.3}}>{p.name}</h3>
                    <TrendingUp size={14} style={{color:'var(--text-muted)',flexShrink:0,marginTop:2}} />
                  </div>
                  <p style={{fontSize:'0.8rem',color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {p.description || 'No description'}
                  </p>
                  <div>
                    <div className="flex justify-between" style={{marginBottom:6,fontSize:'0.75rem',color:'var(--text-muted)'}}>
                      <span>{done}/{total} tasks done</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width:`${pct}%`,background:p.color||'var(--accent)'}} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
