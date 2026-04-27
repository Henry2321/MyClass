const express = require('express');
const Class = require('../models/Class');
const Assignment = require('../models/Assignment');
const Lecture = require('../models/Lecture');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    let stats = {};

    if (req.user.role === 'teacher') {
      // Teacher stats
      const classes = await Class.find({ teacher: req.user._id });
      const classIds = classes.map(c => c._id);
      
      const totalStudents = await Class.aggregate([
        { $match: { teacher: req.user._id } },
        { $unwind: '$students' },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]);

      const assignments = await Assignment.find({ teacher: req.user._id });
      const lectures = await Lecture.find({ teacher: req.user._id });

      stats = {
        classes: classes.length,
        students: totalStudents[0]?.count || 0,
        assignments: assignments.length,
        lectures: lectures.length
      };
    } else {
      // Student stats
      const classes = await Class.find({ students: req.user._id });
      const classIds = classes.map(c => c._id);
      
      const assignments = await Assignment.find({ 
        class: { $in: classIds },
        isPublished: true 
      });
      
      const lectures = await Lecture.find({ 
        class: { $in: classIds },
        isPublished: true 
      });

      stats = {
        classes: classes.length,
        assignments: assignments.length,
        lectures: lectures.length,
        teachers: classes.length // Each class has one teacher
      };
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get today's assignments
router.get('/assignments/today', auth, async (req, res) => {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let assignments;
    
    if (req.user.role === 'teacher') {
      assignments = await Assignment.find({
        teacher: req.user._id,
        dueDate: { $gte: today, $lt: tomorrow },
        isPublished: true
      })
      .populate('class', 'name')
      .sort({ dueDate: 1 });
    } else {
      const classes = await Class.find({ students: req.user._id });
      const classIds = classes.map(c => c._id);
      
      assignments = await Assignment.find({
        class: { $in: classIds },
        dueDate: { $gte: today },
        isPublished: true
      })
      .populate('class', 'name')
      .sort({ dueDate: 1 })
      .limit(5);
    }

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get recent activities
router.get('/activities', auth, async (req, res) => {
  try {
    const activities = [];

    if (req.user.role === 'teacher') {
      // Recent submissions
      const assignments = await Assignment.find({ teacher: req.user._id })
        .populate('submissions.student', 'name')
        .populate('class', 'name')
        .sort({ 'submissions.submittedAt': -1 })
        .limit(10);

      assignments.forEach(assignment => {
        assignment.submissions.forEach(submission => {
          if (submission.submittedAt) {
            activities.push({
              type: 'submission',
              message: `${submission.student.name} nộp bài ${assignment.title}`,
              time: submission.submittedAt,
              class: assignment.class.name
            });
          }
        });
      });
    }

    // Sort by time and limit
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    res.json(activities.slice(0, 5));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get today's schedule
router.get('/schedule', auth, async (req, res) => {
  try {
    const today = new Date().getDay(); // 0-6 (Sunday-Saturday)
    
    let classes;
    if (req.user.role === 'teacher') {
      classes = await Class.find({ 
        teacher: req.user._id,
        'schedule.dayOfWeek': today 
      }).sort({ 'schedule.startTime': 1 });
    } else {
      classes = await Class.find({ 
        students: req.user._id,
        'schedule.dayOfWeek': today 
      })
      .populate('teacher', 'name')
      .sort({ 'schedule.startTime': 1 });
    }

    const schedule = classes.map(cls => ({
      time: `${cls.schedule.startTime} - ${cls.schedule.endTime}`,
      class: cls.name,
      teacher: cls.teacher?.name || 'You'
    }));

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;