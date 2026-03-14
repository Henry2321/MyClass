const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: String,
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  files: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number
  }],
  videoUrl: String,
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Lecture', lectureSchema);