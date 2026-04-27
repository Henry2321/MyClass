const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const Lecture = require('../models/Lecture');
const Assignment = require('../models/Assignment');
require('dotenv').config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Class.deleteMany({});
    await Lecture.deleteMany({});
    await Assignment.deleteMany({});
    console.log('Cleared existing data');

    // Create demo users
    const users = [
      {
        name: 'Nguyễn Văn A',
        email: 'teacher@example.com',
        password: 'password123',
        role: 'teacher'
      },
      {
        name: 'Trần Thị B',
        email: 'teacher2@example.com',
        password: 'password123',
        role: 'teacher'
      },
      {
        name: 'Lê Văn C',
        email: 'student1@example.com',
        password: 'password123',
        role: 'student'
      },
      {
        name: 'Phạm Thị D',
        email: 'student2@example.com',
        password: 'password123',
        role: 'student'
      },
      {
        name: 'Hoàng Văn E',
        email: 'student3@example.com',
        password: 'password123',
        role: 'student'
      },
      {
        name: 'Vũ Thị F',
        email: 'student4@example.com',
        password: 'password123',
        role: 'student'
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log('Created demo users:', createdUsers.length);

    // Get teachers and students
    const teachers = createdUsers.filter(user => user.role === 'teacher');
    const students = createdUsers.filter(user => user.role === 'student');

    console.log('\n=== DEMO ACCOUNTS ===');
    console.log('Giáo viên:');
    console.log('- Email: teacher@example.com | Password: password123');
    console.log('- Email: teacher2@example.com | Password: password123');
    console.log('\nSinh viên:');
    console.log('- Email: student1@example.com | Password: password123');
    console.log('- Email: student2@example.com | Password: password123');
    console.log('- Email: student3@example.com | Password: password123');
    console.log('- Email: student4@example.com | Password: password123');
    console.log('\nSeed data created successfully!');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seed function
seedData();