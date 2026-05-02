const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route  GET /api/users
// @desc   Get all users (admin) or searchable list for member assignment
// @access Private
router.get('/', protect, async (req, res) => {
  const { search } = req.query;
  let query = {};
  if (search) {
    query = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    };
  }
  const users = await User.find(query).select('-password').sort('name').limit(50);
  res.json({ success: true, count: users.length, users });
});

// @route  GET /api/users/:id
// @access Private
router.get('/:id', protect, async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, user });
});

// @route  PUT /api/users/:id/role
// @desc   Update user role — admin only
// @access Private/Admin
router.put('/:id/role', protect, authorize('admin'), async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, user });
});

// @route  DELETE /api/users/:id
// @desc   Delete user — admin only
// @access Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, message: 'User removed' });
});

module.exports = router;
