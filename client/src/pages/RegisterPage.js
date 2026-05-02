import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, User, Mail, Lock, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.email) e.email = 'Email required';
    if (form.password.length < 6) e.password = 'Minimum 6 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo flex items-center gap-2">
          <Zap size={22} fill="currentColor" /> TaskFlow
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start managing your team's work</p>

        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{position:'relative'}}>
              <User size={16} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} />
              <input className="form-input" style={{paddingLeft:38}} type="text" placeholder="Jane Smith"
                value={form.name} onChange={set('name')} autoComplete="name" />
            </div>
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{position:'relative'}}>
              <Mail size={16} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} />
              <input className="form-input" style={{paddingLeft:38}} type="email" placeholder="you@company.com"
                value={form.email} onChange={set('email')} autoComplete="email" />
            </div>
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{position:'relative'}}>
              <Lock size={16} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} />
              <input className="form-input" style={{paddingLeft:38}} type="password" placeholder="Min. 6 characters"
                value={form.password} onChange={set('password')} autoComplete="new-password" />
            </div>
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <div style={{position:'relative'}}>
              <Shield size={16} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} />
              <select className="form-select" style={{paddingLeft:38}} value={form.role} onChange={set('role')}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Admins can manage users and all projects</span>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{marginTop:4}}>
            {loading ? <><div className="spinner" />Creating account…</> : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
