const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

// Create activity log
const createActivity = async (userId, type, description, metadata = {}) => {
  try {
    const activity = new Activity({
      user: userId,
      type,
      description,
      relatedClass: metadata.classId,
      relatedAssignment: metadata.assignmentId,
      relatedLecture: metadata.lectureId,
      metadata
    });
    
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error creating activity:', error);
  }
};

// Create notification
const createNotification = async (recipientId, senderId, title, message, type, metadata = {}) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      title,
      message,
      type,
      relatedClass: metadata.classId,
      relatedAssignment: metadata.assignmentId,
      relatedLecture: metadata.lectureId
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Bulk create notifications for class students
const notifyClassStudents = async (classId, senderId, title, message, type, metadata = {}) => {
  try {
    const Class = require('../models/Class');
    const classData = await Class.findById(classId).populate('students');
    
    if (!classData) return;
    
    const notifications = classData.students.map(student => ({
      recipient: student._id,
      sender: senderId,
      title,
      message,
      type,
      relatedClass: classId,
      relatedAssignment: metadata.assignmentId,
      relatedLecture: metadata.lectureId
    }));
    
    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error notifying class students:', error);
  }
};

module.exports = {
  createActivity,
  createNotification,
  notifyClassStudents
};