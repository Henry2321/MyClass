const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Validation helper
const validateInput = (req, res, next) => {
  const { name, email, password, role } = req.body;
  
  if (req.path === '/register') {
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Tên phải có ít nhất 2 ký tự' });
    }
    if (!role || !['teacher', 'student'].includes(role)) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    }
  }
  
  if (!email || !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    return res.status(400).json({ message: 'Email không hợp lệ' });
  }
  
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
  }
  
  next();
};

// Register
router.post('/register', validateInput, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được sử dụng' });
    }

    // Create new user
    const user = new User({ 
      name: name.trim(), 
      email: email.toLowerCase(), 
      password, 
      role 
    });
    
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleDisplay: user.getRoleDisplay(),
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email này đã được sử dụng' });
    }
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại' });
  }
});

// Login
router.post('/login', validateInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Tài khoản đã bị khóa' });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleDisplay: user.getRoleDisplay(),
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleDisplay: user.getRoleDisplay(),
        avatar: user.avatar,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại' });
  }
});

// Logout (optional - mainly for clearing server-side sessions if needed)
router.post('/logout', auth, async (req, res) => {
  try {
    // In JWT implementation, logout is mainly handled on client side
    // But we can log this action or invalidate refresh tokens if implemented
    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại' });
  }
});

module.exports = router;