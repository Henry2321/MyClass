const express = require('express');
const User = require('../models/User');
const Class = require('../models/Class');
const Assignment = require('../models/Assignment');
const { auth, teacherAuth } = require('../middleware/auth');

const router = express.Router();

// Get students in teacher's classes with assignments & avgScore
router.get('/', auth, teacherAuth, async (req, res) => {
  try {
    const classes = await Class.find({ teacher: req.user._id })
      .populate('students', 'name email createdAt');

    const assignments = await Assignment.find({ teacher: req.user._id });

    const studentMap = new Map();

    classes.forEach(cls => {
      cls.students.forEach(student => {
        const sid = student._id.toString();
        if (!studentMap.has(sid)) {
          studentMap.set(sid, {
            _id: student._id,
            name: student.name,
            email: student.email,
            createdAt: student.createdAt,
            className: cls.name,
            classId: cls._id
          });
        }
      });
    });

    // Tính assignments completed và avgScore cho từng sinh viên
    const result = Array.from(studentMap.values()).map(student => {
      const sid = student._id.toString();
      let completed = 0;
      let total = 0;
      let totalScore = 0;
      let scoredCount = 0;

      assignments.forEach(assignment => {
        total++;
        const submission = assignment.submissions.find(
          s => s.student.toString() === sid
        );
        if (submission) {
          completed++;
          if (submission.score != null) {
            totalScore += (submission.score / assignment.maxScore) * 100;
            scoredCount++;
          }
        }
      });

      return {
        ...student,
        assignments: { completed, total },
        avgScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : null
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get students by class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId)
      .populate('students', 'name email createdAt');

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const isTeacher = classData.teacher.toString() === req.user._id.toString();
    const isStudent = classData.students.some(s => s._id.toString() === req.user._id.toString());

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(classData.students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove student from class (teacher only)
router.delete('/class/:classId/student/:studentId', auth, teacherAuth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId);

    if (!classData || classData.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    classData.students = classData.students.filter(
      studentId => studentId.toString() !== req.params.studentId
    );

    await classData.save();
    res.json({ message: 'Student removed from class' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
