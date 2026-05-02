const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── GET ALL PROJECTS FOR USER ───────────────────────────────────────────────
// @route  GET /api/projects
router.get('/', protect, async (req, res) => {
  const { status } = req.query;
  const filter = {
    $or: [
      { owner: req.user._id },
      { 'members.user': req.user._id },
    ],
  };
  if (status) filter.status = status;

  const projects = await Project.find(filter)
    .populate('owner', 'name email avatarColor')
    .populate('members.user', 'name email avatarColor')
    .sort('-createdAt');

  // Attach task counts
  const projectsWithCounts = await Promise.all(
    projects.map(async (p) => {
      const taskCounts = await Task.aggregate([
        { $match: { project: p._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      const counts = { todo: 0, in_progress: 0, review: 0, done: 0 };
      taskCounts.forEach(({ _id, count }) => { counts[_id] = count; });
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { ...p.toObject(), taskCounts: counts, totalTasks: total };
    })
  );

  res.json({ success: true, count: projects.length, projects: projectsWithCounts });
});

// ─── GET SINGLE PROJECT ───────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('owner', 'name email avatarColor role')
    .populate('members.user', 'name email avatarColor role');

  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
  if (!project.isMember(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized to view this project' });
  }
  res.json({ success: true, project });
});

// ─── CREATE PROJECT ───────────────────────────────────────────────────────────
router.post(
  '/',
  protect,
  [
    body('name').trim().notEmpty().withMessage('Project name is required').isLength({ max: 100 }),
    body('description').optional().isLength({ max: 500 }),
    body('status').optional().isIn(['active', 'completed', 'archived', 'on_hold']),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('color').optional().isHexColor(),
    body('dueDate').optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const project = await Project.create({
      ...req.body,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
    });

    await project.populate('owner', 'name email avatarColor');
    res.status(201).json({ success: true, project });
  }
);

// ─── UPDATE PROJECT ───────────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  let project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

  if (!project.isAdmin(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized to update this project' });
  }

  const allowed = ['name', 'description', 'status', 'priority', 'color', 'dueDate', 'tags'];
  const updates = {};
  allowed.forEach((field) => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

  project = await Project.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    .populate('owner', 'name email avatarColor')
    .populate('members.user', 'name email avatarColor');

  res.json({ success: true, project });
});

// ─── DELETE PROJECT ───────────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

  const isOwner = project.owner.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Only project owner or admin can delete' });
  }

  await Task.deleteMany({ project: project._id });
  await project.deleteOne();
  res.json({ success: true, message: 'Project deleted' });
});

// ─── ADD MEMBER ───────────────────────────────────────────────────────────────
router.post('/:id/members', protect, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
  if (!project.isAdmin(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  const { userId, role = 'member' } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  const alreadyMember = project.members.some((m) => m.user.toString() === userId);
  if (alreadyMember || project.owner.toString() === userId) {
    return res.status(400).json({ success: false, error: 'User is already a member' });
  }

  project.members.push({ user: userId, role });
  await project.save();
  await project.populate('members.user', 'name email avatarColor');
  res.json({ success: true, project });
});

// ─── REMOVE MEMBER ────────────────────────────────────────────────────────────
router.delete('/:id/members/:userId', protect, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
  if (!project.isAdmin(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }
  if (project.owner.toString() === req.params.userId) {
    return res.status(400).json({ success: false, error: 'Cannot remove project owner' });
  }

  project.members = project.members.filter((m) => m.user.toString() !== req.params.userId);
  await project.save();
  res.json({ success: true, project });
});

// ─── GET PROJECT STATS ────────────────────────────────────────────────────────
router.get('/:id/stats', protect, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
  if (!project.isMember(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  const now = new Date();
  const [statusCounts, priorityCounts, overdueCount, recentTasks] = await Promise.all([
    Task.aggregate([
      { $match: { project: project._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { project: project._id } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Task.countDocuments({ project: project._id, dueDate: { $lt: now }, status: { $ne: 'done' } }),
    Task.find({ project: project._id }).sort('-createdAt').limit(5).populate('assignee', 'name avatarColor'),
  ]);

  res.json({
    success: true,
    stats: {
      byStatus: statusCounts,
      byPriority: priorityCounts,
      overdue: overdueCount,
      recentTasks,
      totalMembers: project.members.length + 1,
    },
  });
});

module.exports = router;
