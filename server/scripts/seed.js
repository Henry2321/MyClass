const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Class = require('../models/Class');
const Assignment = require('../models/Assignment');
const Lecture = require('../models/Lecture');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Class.deleteMany({});
    await Assignment.deleteMany({});
    await Lecture.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const teacher = new User({
      name: 'Nguyễn Văn Giáo',
      email: 'teacher@example.com',
      password: 'password123',
      role: 'teacher'
    });

    const students = [
      {
        name: 'Trần Thị An',
        email: 'student1@example.com',
        password: 'password123',
        role: 'student'
      },
      {
        name: 'Lê Văn Bình',
        email: 'student2@example.com',
        password: 'password123',
        role: 'student'
      },
      {
        name: 'Phạm Thị Cúc',
        email: 'student3@example.com',
        password: 'password123',
        role: 'student'
      }
    ];

    await teacher.save();
    const savedStudents = await User.insertMany(students);
    console.log('Created users');

    // Create classes
    const classes = [
      {
        name: 'React Nâng cao',
        description: 'Học React từ cơ bản đến nâng cao',
        teacher: teacher._id,
        code: 'REACT01',
        students: savedStudents.map(s => s._id),
        schedule: {
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '11:00'
        }
      },
      {
        name: 'Node.js Backend',
        description: 'Phát triển backend với Node.js',
        teacher: teacher._id,
        code: 'NODE01',
        students: savedStudents.slice(0, 2).map(s => s._id),
        schedule: {
          dayOfWeek: 3, // Wednesday
          startTime: '14:00',
          endTime: '16:00'
        }
      }
    ];

    const savedClasses = await Class.insertMany(classes);
    console.log('Created classes');

    // Create lectures
    const lectures = [
      {
        title: 'Giới thiệu React Hooks',
        content: 'Tìm hiểu về useState, useEffect và các hooks cơ bản',
        class: savedClasses[0]._id,
        teacher: teacher._id,
        isPublished: true,
        publishedAt: new Date()
      },
      {
        title: 'State Management với Redux',
        content: 'Quản lý state phức tạp với Redux Toolkit',
        class: savedClasses[0]._id,
        teacher: teacher._id,
        isPublished: false
      },
      {
        title: 'Express.js Fundamentals',
        content: 'Xây dựng API với Express.js',
        class: savedClasses[1]._id,
        teacher: teacher._id,
        isPublished: true,
        publishedAt: new Date()
      }
    ];

    await Lecture.insertMany(lectures);
    console.log('Created lectures');

    // Create assignments
    const assignments = [
      {
        title: 'Bài tập React Hooks',
        description: 'Xây dựng ứng dụng Todo với React Hooks',
        class: savedClasses[0]._id,
        teacher: teacher._id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        maxScore: 100,
        isPublished: true,
        submissions: [
          {
            student: savedStudents[0]._id,
            content: 'Đã hoàn thành bài tập',
            submittedAt: new Date(),
            score: 85,
            feedback: 'Làm tốt!'
          }
        ]
      },
      {
        title: 'API Development',
        description: 'Tạo REST API với Express.js',
        class: savedClasses[1]._id,
        teacher: teacher._id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        maxScore: 100,
        isPublished: true
      }
    ];

    await Assignment.insertMany(assignments);
    console.log('Created assignments');

    console.log('Seed data created successfully!');
    console.log('Teacher login: teacher@example.com / password123');
    console.log('Student login: student1@example.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();