const { body, validationResult } = require('express-validator');

// Validation rules
const validateClass = [
  body('name').notEmpty().withMessage('Class name is required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
];

const validateAssignment = [
  body('title').notEmpty().withMessage('Assignment title is required'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description too long'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('maxScore').optional().isNumeric().withMessage('Max score must be a number'),
];

const validateLecture = [
  body('title').notEmpty().withMessage('Lecture title is required'),
  body('content').optional().isLength({ max: 5000 }).withMessage('Content too long'),
];

const validateUser = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateClass,
  validateAssignment,
  validateLecture,
  validateUser,
  handleValidationErrors
};