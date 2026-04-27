const express = require('express');
const Class = require('../models/Class');
const User = require('../models/User');
const { auth, teacherAuth } = require('../middleware/auth');
const { createActivity, notifyClassStudents } = require('../utils/notifications');

const router = express.Router();

// Get all classes for user
router.get('/', auth, async (req, res) => {
  try {
    let classes;
    if (req.user.role === 'teacher') {
      classes = await Class.find({ teacher: req.user._id })
        .populate('students', 'name email')
        .populate('teacher', 'name email');
    } else {
      classes = await Class.find({ students: req.user._id })
        .populate('teacher', 'name email');
    }
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create class (teacher only)
router.post('/', auth, teacherAuth, async (req, res) => {
  try {
    const { name, description, schedule } = req.body;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newClass = new Class({
      name,
      description,
      teacher: req.user._id,
      code,
      schedule
    });

    await newClass.save();
    await newClass.populate('teacher', 'name email');
    
    // Create activity
    await createActivity(
      req.user._id,
      'class_created',
      `Tạo lớp học: ${name}`,
      { classId: newClass._id }
    );
    
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join class (student)
router.post('/join', auth, async (req, res) => {
  try {
    const { code } = req.body;
    
    const classToJoin = await Class.findOne({ code }).populate('teacher', 'name');
    if (!classToJoin) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classToJoin.students.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already joined this class' });
    }

    classToJoin.students.push(req.user._id);
    await classToJoin.save();
    
    // Create activity
    await createActivity(
      req.user._id,
      'student_joined',
      `Tham gia lớp: ${classToJoin.name}`,
      { classId: classToJoin._id }
    );
    
    res.json({ message: 'Successfully joined class', class: classToJoin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get class details
router.get('/:id', auth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('students', 'name email')
      .populate('teacher', 'name email');
    
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if user has access to this class
    const isTeacher = classData.teacher._id.toString() === req.user._id.toString();
    const isStudent = classData.students.some(s => s._id.toString() === req.user._id.toString());
    
    if (!isTeacher && !isStudent) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(classData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update class (teacher only)
router.patch('/:id', auth, teacherAuth, async (req, res) => {
  try {
    const { name, description, schedule } = req.body;
    
    const classData = await Class.findById(req.params.id);
    if (!classData || classData.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    classData.name = name || classData.name;
    classData.description = description || classData.description;
    classData.schedule = schedule || classData.schedule;
    
    await classData.save();
    await classData.populate('students', 'name email');
    await classData.populate('teacher', 'name email');
    
    res.json(classData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete class (teacher only)
router.delete('/:id', auth, teacherAuth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);
    if (!classData || classData.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Class.findByIdAndDelete(req.params.id);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Import students to class (teacher only)
router.post('/:id/import-students', auth, teacherAuth, async (req, res) => {
  try {
    const { students } = req.body; // [{ name, mssv }]
    if (!Array.isArray(students)) {
      return res.status(400).json({ message: 'Danh sách sinh viên không hợp lệ' });
    }

    const classData = await Class.findById(req.params.id);
    if (!classData || classData.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền truy cập lớp này' });
    }

    const studentIds = [];
    for (const s of students) {
      let user = await User.findOne({ mssv: s.mssv });
      
      if (!user) {
        // Tạo User tạm thời với Tên thật từ file
        user = new User({
          name: s.name,
          email: `${s.mssv}@student.com`,
          password: 'password123',
          mssv: s.mssv,
          role: 'student'
        });
        await user.save();
      } else {
        // Nếu user đã tồn tại nhưng chưa có tên đúng, cập nhật tên
        if (user.name.startsWith('Sinh viên ') && s.name && !s.name.startsWith('Sinh viên ')) {
          user.name = s.name;
          await user.save();
        }
      }
      studentIds.push(user._id);
    }

    // Cập nhật danh sách sinh viên của lớp (không trùng lặp)
    let addedCount = 0;
    studentIds.forEach(id => {
      if (!classData.students.includes(id)) {
        classData.students.push(id);
        addedCount++;
      }
    });

    await classData.save();
    
    res.json({ 
      message: `Đã upload thành công ${mssvs.length} sinh viên vào lớp.`,
      totalStudents: classData.students.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;