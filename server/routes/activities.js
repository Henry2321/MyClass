const express = require('express');
const Activity = require('../models/Activity');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user activities
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    const query = { user: req.user._id };
    if (type) {
      query.type = type;
    }
    
    const activities = await Activity.find(query)
      .populate('user', 'name')
      .populate('relatedClass', 'name')
      .populate('relatedAssignment', 'title')
      .populate('relatedLecture', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Activity.countDocuments(query);
    
    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get class activities (for teachers)
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const activities = await Activity.find({
      relatedClass: req.params.classId
    })
      .populate('user', 'name')
      .populate('relatedAssignment', 'title')
      .populate('relatedLecture', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Activity.countDocuments({
      relatedClass: req.params.classId
    });
    
    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;