const express = require('express');
const User = require('../models/User');
const Class = require('../models/Class');
const { auth, teacherAuth } = require('../middleware/auth');

const router = express.Router();

// Get students in teacher's classes
router.get('/', auth, teacherAuth, async (req, res) => {
  try {
    const classes = await Class.find({ teacher: req.user._id })
      .populate('students', 'name email createdAt');
    
    const allStudents = [];
    classes.forEach(cls => {
      cls.students.forEach(student => {
        if (!allStudents.find(s => s._id.toString() === student._id.toString())) {
          allStudents.push({
            ...student.toObject(),
            className: cls.name
          });
        }
      });
    });
    
    res.json(allStudents);
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

    // Check if user is teacher of this class or student in this class
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