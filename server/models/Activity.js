const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'assignment_created',
      'assignment_submitted',
      'assignment_graded',
      'lecture_created',
      'lecture_published',
      'class_created',
      'student_joined'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  relatedClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  relatedAssignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  },
  relatedLecture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
activitySchema.index({ createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
