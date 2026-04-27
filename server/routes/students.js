const express = require('express');
const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
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

// Get students by class with attendance status
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id || req.params.classId)
      .populate('students', 'name email mssv createdAt');
    
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Lấy dữ liệu điểm danh của ngày hôm nay
    const attendanceRecords = await Attendance.find({
      class: classData._id,
      date: { $gte: today }
    });

    const studentsWithAttendance = classData.students.map(student => {
      const attendance = attendanceRecords.find(a => a.student.toString() === student._id.toString());
      return {
        ...student.toObject(),
        isPresent: !!attendance,
        leaveCount: attendance ? attendance.leaveCount : 0
      };
    });
    
    res.json(studentsWithAttendance);
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

// Get attendance for a class (teacher only)
router.get('/class/:classId/attendance', auth, teacherAuth, async (req, res) => {
  try {
    const { date } = req.query;
    const searchDate = date ? new Date(date) : new Date();
    searchDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.find({
      class: req.params.classId,
      date: { $gte: searchDate }
    }).populate('student', 'name email');

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;