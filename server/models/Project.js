const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived', 'on_hold'],
      default: 'active',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    dueDate: {
      type: Date,
    },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: task count (populated separately)
projectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: true,
});

// Check if user is a member
projectSchema.methods.isMember = function (userId) {
  return (
    this.owner.toString() === userId.toString() ||
    this.members.some((m) => m.user.toString() === userId.toString())
  );
};

// Check if user is project admin
projectSchema.methods.isAdmin = function (userId) {
  if (this.owner.toString() === userId.toString()) return true;
  const member = this.members.find((m) => m.user.toString() === userId.toString());
  return member?.role === 'admin';
};

module.exports = mongoose.model('Project', projectSchema);
