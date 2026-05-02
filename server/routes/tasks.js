const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper: verify project membership
const checkMembership = async (projectId, userId, role = 'member') => {
  const project = await Project.findById(projectId);
  if (!project) return { ok: false, code: 404, msg: 'Project not found' };
  if (!project.isMember(userId)) return { ok: false, code: 403, msg: 'Not a project member' };
  if (role === 'admin' && !project.isAdmin(userId)) return { ok: false, code: 403, msg: 'Admin access required' };
  return { ok: true, project };
};

// ─── GET ALL TASKS ────────────────────────────────────────────────────────────
// @route GET /api/tasks?project=&status=&priority=&assignee=&overdue=
router.get('/', protect, async (req, res) => {
  const { project, status, priority, assignee, overdue, search, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (project) {
    const check = await checkMembership(project, req.user._id);
    if (!check.ok) return res.status(check.code).json({ success: false, error: check.msg });
    filter.project = project;
  } else {
    // Only return tasks from user's projects
    const userProjects = await Project.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    }).select('_id');
    filter.project = { $in: userProjects.map((p) => p._id) };
  }

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignee === 'me') filter.assignee = req.user._id;
  else if (assignee) filter.assignee = assignee;
  if (overdue === 'true') {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $ne: 'done' };
  }
  if (search) filter.title = { $regex: search, $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('assignee', 'name email avatarColor')
      .populate('creator', 'name avatarColor')
      .populate('project', 'name color')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    Task.countDocuments(filter),
  ]);

  res.json({ success: true, count: tasks.length, total, page: Number(page), tasks });
});

// ─── GET SINGLE TASK ──────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignee', 'name email avatarColor')
    .populate('creator', 'name avatarColor')
    .populate('project', 'name color owner members')
    .populate('comments.user', 'name avatarColor');

  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  const check = await checkMembership(task.project._id, req.user._id);
  if (!check.ok && req.user.role !== 'admin') {
    return res.status(check.code).json({ success: false, error: check.msg });
  }

  res.json({ success: true, task });
});

// ─── CREATE TASK ──────────────────────────────────────────────────────────────
router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Task title is required').isLength({ max: 200 }),
    body('project').notEmpty().withMessage('Project is required').isMongoId(),
    body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('assignee').optional({ nullable: true }).isMongoId(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const check = await checkMembership(req.body.project, req.user._id);
    if (!check.ok) return res.status(check.code).json({ success: false, error: check.msg });

    const task = await Task.create({ ...req.body, creator: req.user._id });
    await task.populate('assignee', 'name email avatarColor');
    await task.populate('creator', 'name avatarColor');
    res.status(201).json({ success: true, task });
  }
);

// ─── UPDATE TASK ──────────────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  let task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  const check = await checkMembership(task.project, req.user._id);
  if (!check.ok && req.user.role !== 'admin') {
    return res.status(check.code).json({ success: false, error: check.msg });
  }

  const allowed = ['title', 'description', 'status', 'priority', 'assignee', 'dueDate', 'tags'];
  const updates = { updatedAt: new Date() };
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    .populate('assignee', 'name email avatarColor')
    .populate('creator', 'name avatarColor')
    .populate('project', 'name color');

  res.json({ success: true, task });
});

// ─── DELETE TASK ──────────────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  const check = await checkMembership(task.project, req.user._id);
  if (!check.ok && req.user.role !== 'admin') {
    return res.status(check.code).json({ success: false, error: check.msg });
  }

  const isCreator = task.creator.toString() === req.user._id.toString();
  if (!isCreator && !check.project?.isAdmin(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Only task creator or project admin can delete' });
  }

  await task.deleteOne();
  res.json({ success: true, message: 'Task deleted' });
});

// ─── ADD COMMENT ──────────────────────────────────────────────────────────────
router.post('/:id/comments', protect, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ success: false, error: 'Comment text required' });

  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  const check = await checkMembership(task.project, req.user._id);
  if (!check.ok) return res.status(check.code).json({ success: false, error: check.msg });

  task.comments.push({ user: req.user._id, text: text.trim() });
  await task.save();
  await task.populate('comments.user', 'name avatarColor');
  res.status(201).json({ success: true, comments: task.comments });
});

// ─── DELETE COMMENT ───────────────────────────────────────────────────────────
router.delete('/:id/comments/:commentId', protect, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  const comment = task.comments.id(req.params.commentId);
  if (!comment) return res.status(404).json({ success: false, error: 'Comment not found' });
  if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized to delete this comment' });
  }

  comment.deleteOne();
  await task.save();
  res.json({ success: true, message: 'Comment deleted' });
});

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────
router.get('/dashboard/stats', protect, async (req, res) => {
  const userProjects = await Project.find({
    $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
  }).select('_id');
  const projectIds = userProjects.map((p) => p._id);
  const now = new Date();

  const [myTasks, allTasks, overdue, byStatus, byPriority, dueSoon] = await Promise.all([
    Task.countDocuments({ project: { $in: projectIds }, assignee: req.user._id, status: { $ne: 'done' } }),
    Task.countDocuments({ project: { $in: projectIds } }),
    Task.countDocuments({ project: { $in: projectIds }, dueDate: { $lt: now }, status: { $ne: 'done' } }),
    Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Task.find({
      project: { $in: projectIds },
      dueDate: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      status: { $ne: 'done' },
    }).populate('project', 'name color').populate('assignee', 'name avatarColor').sort('dueDate').limit(10),
  ]);

  res.json({
    success: true,
    stats: {
      myActiveTasks: myTasks,
      totalTasks: allTasks,
      overdueTasks: overdue,
      totalProjects: projectIds.length,
      byStatus,
      byPriority,
      dueSoon,
    },
  });
});

module.exports = router;
