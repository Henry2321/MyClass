const express = require('express');
const multer = require('multer');
const path = require('path');
const Lecture = require('../models/Lecture');
const Class = require('../models/Class');
const { auth, teacherAuth } = require('../middleware/auth');
const { createActivity, notifyClassStudents } = require('../utils/notifications');

const router = express.Router();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/lectures/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Get lectures by class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const lectures = await Lecture.find({ 
      class: req.params.classId,
      isPublished: true 
    })
    .populate('teacher', 'name')
    .sort({ createdAt: -1 });
    
    res.json(lectures);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create lecture (teacher only)
router.post('/', auth, teacherAuth, upload.array('files'), async (req, res) => {
  try {
    const { title, content, classId, videoUrl } = req.body;

    const classData = await Class.findById(classId);
    if (!classData || classData.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const files = req.files?.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size
    })) || [];

    const lecture = new Lecture({
      title,
      content,
      class: classId,
      teacher: req.user._id,
      files,
      videoUrl
    });

    await lecture.save();
    await lecture.populate('teacher', 'name');
    
    // Create activity
    await createActivity(
      req.user._id,
      'lecture_created',
      `Tạo bài giảng: ${title}`,
      { classId, lectureId: lecture._id }
    );
    
    res.status(201).json(lecture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Publish lecture
router.patch('/:id/publish', auth, teacherAuth, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id).populate('class');
    
    if (!lecture || lecture.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    lecture.isPublished = true;
    lecture.publishedAt = new Date();
    await lecture.save();
    
    // Create activity
    await createActivity(
      req.user._id,
      'lecture_published',
      `Xuất bản bài giảng: ${lecture.title}`,
      { classId: lecture.class._id, lectureId: lecture._id }
    );
    
    // Notify students
    await notifyClassStudents(
      lecture.class._id,
      req.user._id,
      'Bài giảng mới',
      `Bài giảng "${lecture.title}" đã được xuất bản`,
      'lecture',
      { lectureId: lecture._id }
    );
    
    res.json(lecture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;