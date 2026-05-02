import { formatDistanceToNow, format, isPast, isWithinInterval, addDays } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy');
};

export const formatRelative = (date) => {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const isOverdue = (dueDate, status) => {
  if (!dueDate || status === 'done') return false;
  return isPast(new Date(dueDate));
};

export const isDueSoon = (dueDate, status) => {
  if (!dueDate || status === 'done') return false;
  const d = new Date(dueDate);
  return isWithinInterval(d, { start: new Date(), end: addDays(new Date(), 3) });
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

export const PROJECT_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981',
  '#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16',
];

export const AVATAR_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981',
  '#3b82f6','#ef4444','#14b8a6','#f97316','#a855f7',
];

export const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  done: 'Done',
};

export const STATUS_COLORS = {
  todo: 'badge-todo',
  in_progress: 'badge-progress',
  review: 'badge-review',
  done: 'badge-done',
};

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const PRIORITY_COLORS = {
  low: 'badge-low',
  medium: 'badge-medium',
  high: 'badge-high',
  critical: 'badge-critical',
};

export const PROJECT_STATUS_LABELS = {
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
  on_hold: 'On Hold',
};

export const getErrorMessage = (err) => {
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.data?.errors?.[0]?.msg) return err.response.data.errors[0].msg;
  return err.message || 'Something went wrong';
};

export const clsx = (...classes) => classes.filter(Boolean).join(' ');
