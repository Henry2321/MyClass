const express = require('express');
const multer = require('multer');
const Assignment = require('../models/Assignment');
const Class = require('../models/Class');
const { auth, teacherAuth } = require('../middleware/auth');
const { createActivity, notifyClassStudents } = require('../utils/notifications');

const router = express.Router();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/assignments/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Get assignments by class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const assignments = await Assignment.find({ 
      class: req.params.classId,
      isPublished: true 
    })
    .populate('teacher', 'name')
    .sort({ dueDate: 1 });
    
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create assignment (teacher only)
router.post('/', auth, teacherAuth, upload.array('files'), async (req, res) => {
  try {
    const { title, description, classId, dueDate, maxScore } = req.body;

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

    const assignment = new Assignment({
      title,
      description,
      class: classId,
      teacher: req.user._id,
      dueDate: new Date(dueDate),
      maxScore: maxScore || 100,
      files
    });

    await assignment.save();
    await assignment.populate('teacher', 'name');
    
    // Create activity
    await createActivity(
      req.user._id,
      'assignment_created',
      `Tạo bài tập: ${title}`,
      { classId, assignmentId: assignment._id }
    );
    
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Publish assignment
router.patch('/:id/publish', auth, teacherAuth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('class');
    
    if (!assignment || assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    assignment.isPublished = true;
    await assignment.save();
    
    // Notify students
    await notifyClassStudents(
      assignment.class._id,
      req.user._id,
      'Bài tập mới',
      `Bài tập "${assignment.title}" đã được giao`,
      'assignment',
      { assignmentId: assignment._id }
    );
    
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit assignment (student)
router.post('/:id/submit', auth, upload.array('files'), async (req, res) => {
  try {
    const { content } = req.body;
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (new Date() > assignment.dueDate) {
      return res.status(400).json({ message: 'Assignment deadline has passed' });
    }

    const files = req.files?.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size
    })) || [];

    const existingSubmission = assignment.submissions.find(
      sub => sub.student.toString() === req.user._id.toString()
    );

    if (existingSubmission) {
      existingSubmission.files = files;
      existingSubmission.content = content;
      existingSubmission.submittedAt = new Date();
    } else {
      assignment.submissions.push({
        student: req.user._id,
        files,
        content,
        submittedAt: new Date()
      });
    }

    await assignment.save();
    
    // Create activity
    await createActivity(
      req.user._id,
      'assignment_submitted',
      `Nộp bài tập: ${assignment.title}`,
      { classId: assignment.class, assignmentId: assignment._id }
    );
    
    res.json({ message: 'Assignment submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Grade assignment (teacher only)
router.patch('/:id/grade/:submissionId', auth, teacherAuth, async (req, res) => {
  try {
    const { score, feedback } = req.body;
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment || assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const submission = assignment.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    submission.score = score;
    submission.feedback = feedback;
    submission.gradedAt = new Date();

    await assignment.save();
    res.json({ message: 'Assignment graded successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;