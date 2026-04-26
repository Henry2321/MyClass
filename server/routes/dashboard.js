const express = require('express');
const Class = require('../models/Class');
const Assignment = require('../models/Assignment');
const Lecture = require('../models/Lecture');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date = new Date()) => {
  const value = startOfDay(date);
  value.setDate(value.getDate() + 1);
  return value;
};

const startOfWeek = (date = new Date()) => {
  const value = startOfDay(date);
  const day = value.getDay();
  const offset = (day + 6) % 7;
  value.setDate(value.getDate() - offset);
  return value;
};

const toId = (value) => value?.toString?.() || String(value || '');

const hasNumericScore = (score) => typeof score === 'number' && !Number.isNaN(score);

const clampPercentage = (value) => Math.max(0, Math.min(100, Math.round(value)));

const average = (values) => {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const normalizeScoreTo10 = (score, maxScore = 100) => {
  if (!hasNumericScore(score) || !maxScore) {
    return 0;
  }

  return (score / maxScore) * 10;
};

const getPriority = (dueDate, completed = false) => {
  if (completed) {
    return 'low';
  }

  const due = new Date(dueDate);
  const now = new Date();
  const diffHours = (due.getTime() - now.getTime()) / (60 * 60 * 1000);

  if (diffHours <= 24) {
    return 'high';
  }

  if (diffHours <= 72) {
    return 'medium';
  }

  return 'low';
};

const parseTimeToMinutes = (time = '') => {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hours * 60 + minutes;
};

const sortByCreatedAtDesc = (left, right) => (
  new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
);

const getTypeFromNotification = (type) => {
  switch (type) {
    case 'assignment':
      return 'submission';
    case 'grade':
      return 'grade';
    case 'class':
      return 'class';
    case 'lecture':
      return 'lecture';
    default:
      return 'reminder';
  }
};

const buildScheduleEntries = (classes, role) => (
  classes
    .filter((classItem) => classItem.schedule?.startTime && classItem.schedule?.endTime)
    .map((classItem) => ({
      id: toId(classItem._id),
      dayOfWeek: classItem.schedule.dayOfWeek,
      startTime: classItem.schedule.startTime,
      endTime: classItem.schedule.endTime,
      title: classItem.name,
      subtitle: role === 'teacher'
        ? `${classItem.students?.length || 0} sinh viên`
        : `GV: ${classItem.teacher?.name || 'Chưa cập nhật'}`,
    }))
    .sort((left, right) => (
      left.dayOfWeek - right.dayOfWeek ||
      parseTimeToMinutes(left.startTime) - parseTimeToMinutes(right.startTime)
    ))
);

const buildNotificationItems = (notifications) => notifications.map((notification) => ({
  id: toId(notification._id),
  title: notification.title,
  message: notification.message,
  type: notification.type,
  isRead: Boolean(notification.isRead),
  createdAt: notification.createdAt,
}));

const buildTeacherOverview = async (user) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);
  const currentDay = now.getDay();

  const classes = await Class.find({ teacher: user._id }).lean();
  const classIds = classes.map((classItem) => classItem._id);

  const [assignments, lectures, activityDocs, notificationDocs, unreadCount] = await Promise.all([
    Assignment.find({ teacher: user._id })
      .populate('class', 'name students')
      .populate('submissions.student', 'name')
      .sort({ dueDate: 1 })
      .lean(),
    Lecture.find({ teacher: user._id })
      .populate('class', 'name')
      .sort({ createdAt: -1 })
      .lean(),
    Activity.find({
      $or: [
        { user: user._id },
        { relatedClass: { $in: classIds }, type: 'student_joined' },
      ],
    })
      .populate('user', 'name')
      .populate('relatedClass', 'name')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    Notification.find({ recipient: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Notification.countDocuments({ recipient: user._id, isRead: false }),
  ]);

  const uniqueStudentIds = new Set();
  classes.forEach((classItem) => {
    (classItem.students || []).forEach((studentId) => {
      uniqueStudentIds.add(toId(studentId));
    });
  });

  const totalExpectedSubmissions = assignments.reduce((sum, assignment) => (
    sum + (assignment.class?.students?.length || 0)
  ), 0);

  const totalSubmitted = assignments.reduce((sum, assignment) => (
    sum + assignment.submissions.length
  ), 0);

  const totalGraded = assignments.reduce((sum, assignment) => (
    sum + assignment.submissions.filter((submission) => (
      hasNumericScore(submission.score) || submission.gradedAt
    )).length
  ), 0);

  const averageGrade = average(
    assignments.flatMap((assignment) => assignment.submissions
      .filter((submission) => hasNumericScore(submission.score))
      .map((submission) => normalizeScoreTo10(submission.score, assignment.maxScore))),
  );

  const stats = [
    {
      title: 'Lớp học',
      value: classes.length,
      icon: '📚',
      color: 'blue',
      meta: `Tuần này: ${classes.filter((classItem) => (
        new Date(classItem.createdAt) >= weekStart
      )).length}`,
    },
    {
      title: 'Sinh viên',
      value: uniqueStudentIds.size,
      icon: '👥',
      color: 'green',
      meta: `Mới tham gia: ${activityDocs.filter((activity) => (
        activity.type === 'student_joined' && new Date(activity.createdAt) >= weekStart
      )).length}`,
    },
    {
      title: 'Bài tập',
      value: assignments.length,
      icon: '📝',
      color: 'orange',
      meta: `Tuần này: ${assignments.filter((assignment) => (
        new Date(assignment.createdAt) >= weekStart
      )).length}`,
    },
    {
      title: 'Bài giảng',
      value: lectures.length,
      icon: '🎓',
      color: 'purple',
      meta: `Đã xuất bản: ${lectures.filter((lecture) => lecture.isPublished).length}`,
    },
  ];

  const tasks = assignments
    .map((assignment) => {
      const expectedCount = assignment.class?.students?.length || 0;
      const gradedCount = assignment.submissions.filter((submission) => (
        hasNumericScore(submission.score) || submission.gradedAt
      )).length;
      const isCompleted = expectedCount > 0 && gradedCount >= expectedCount;

      return {
        id: toId(assignment._id),
        title: assignment.title,
        className: assignment.class?.name || 'Chưa có lớp',
        dueDate: assignment.dueDate,
        priority: getPriority(assignment.dueDate, isCompleted),
        completed: isCompleted,
      };
    })
    .slice(0, 12);

  const submissionActivities = assignments.flatMap((assignment) => assignment.submissions
    .filter((submission) => submission.submittedAt)
    .map((submission) => ({
      id: `submission-${toId(assignment._id)}-${toId(submission.student?._id || submission.student)}`,
      type: 'submission',
      message: `${submission.student?.name || 'Sinh viên'} đã nộp "${assignment.title}"`,
      createdAt: submission.submittedAt,
    })));

  const mappedActivities = activityDocs.map((activity) => {
    if (activity.type === 'student_joined') {
      return {
        id: toId(activity._id),
        type: 'class',
        message: `${activity.user?.name || 'Sinh viên'} đã tham gia lớp ${activity.relatedClass?.name || ''}`.trim(),
        createdAt: activity.createdAt,
      };
    }

    if (activity.type === 'assignment_graded') {
      return {
        id: toId(activity._id),
        type: 'grade',
        message: activity.description,
        createdAt: activity.createdAt,
      };
    }

    if (activity.type === 'lecture_created' || activity.type === 'lecture_published') {
      return {
        id: toId(activity._id),
        type: 'lecture',
        message: activity.description,
        createdAt: activity.createdAt,
      };
    }

    return {
      id: toId(activity._id),
      type: 'class',
      message: activity.description,
      createdAt: activity.createdAt,
    };
  });

  const activities = [...submissionActivities, ...mappedActivities]
    .sort(sortByCreatedAtDesc)
    .slice(0, 5);

  const schedule = buildScheduleEntries(classes, 'teacher');

  const progress = [
    {
      label: 'Bài nộp đã nhận',
      value: totalExpectedSubmissions
        ? clampPercentage((totalSubmitted / totalExpectedSubmissions) * 100)
        : 0,
    },
    {
      label: 'Bài nộp đã chấm',
      value: totalSubmitted
        ? clampPercentage((totalGraded / totalSubmitted) * 100)
        : 0,
    },
    {
      label: 'Bài giảng đã xuất bản',
      value: lectures.length
        ? clampPercentage((lectures.filter((lecture) => lecture.isPublished).length / lectures.length) * 100)
        : 0,
    },
  ];

  const derivedNotifications = [];
  const pendingGrading = totalSubmitted - totalGraded;

  if (pendingGrading > 0) {
    derivedNotifications.push({
      id: 'derived-pending-grading',
      title: 'Bài nộp chờ chấm',
      message: `${pendingGrading} bài nộp đang chờ chấm điểm`,
      type: 'grade',
      isRead: false,
      createdAt: now.toISOString(),
    });
  }

  assignments
    .filter((assignment) => {
      const dueDate = new Date(assignment.dueDate);
      return dueDate >= todayStart && dueDate < todayEnd;
    })
    .slice(0, 2)
    .forEach((assignment) => {
      derivedNotifications.push({
        id: `derived-due-${toId(assignment._id)}`,
        title: 'Deadline hôm nay',
        message: `Bài "${assignment.title}" đến hạn trong hôm nay`,
        type: 'reminder',
        isRead: false,
        createdAt: assignment.dueDate,
      });
    });

  const notifications = [...buildNotificationItems(notificationDocs), ...derivedNotifications]
    .sort(sortByCreatedAtDesc)
    .slice(0, 5);

  const quickStats = [
    {
      label: 'Bài chờ chấm',
      value: String(Math.max(0, pendingGrading)),
    },
    {
      label: 'Lớp hôm nay',
      value: String(schedule.filter((item) => item.dayOfWeek === currentDay).length),
    },
    {
      label: 'Chưa đọc',
      value: String(unreadCount),
    },
    {
      label: 'Điểm TB',
      value: averageGrade ? averageGrade.toFixed(1) : '0.0',
    },
  ];

  return {
    summary: {
      classes: classes.length,
      students: uniqueStudentIds.size,
      assignments: assignments.length,
      lectures: lectures.length,
    },
    stats,
    tasks,
    activities,
    schedule,
    progress,
    quickStats,
    notifications,
  };
};

const buildStudentOverview = async (user) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);
  const currentDay = now.getDay();

  const classes = await Class.find({ students: user._id })
    .populate('teacher', 'name')
    .lean();
  const classIds = classes.map((classItem) => classItem._id);

  const [assignments, lectures, activityDocs, notificationDocs, unreadCount] = await Promise.all([
    Assignment.find({
      class: { $in: classIds },
      isPublished: true,
    })
      .populate('class', 'name')
      .sort({ dueDate: 1 })
      .lean(),
    Lecture.find({
      class: { $in: classIds },
      isPublished: true,
    })
      .populate('class', 'name')
      .sort({ createdAt: -1 })
      .lean(),
    Activity.find({ user: user._id })
      .populate('relatedClass', 'name')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    Notification.find({ recipient: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Notification.countDocuments({ recipient: user._id, isRead: false }),
  ]);

  const tasks = assignments
    .map((assignment) => {
      const submission = assignment.submissions.find(
        (item) => toId(item.student) === toId(user._id),
      );

      return {
        id: toId(assignment._id),
        title: assignment.title,
        className: assignment.class?.name || 'Chưa có lớp',
        dueDate: assignment.dueDate,
        priority: getPriority(assignment.dueDate, Boolean(submission)),
        completed: Boolean(submission),
      };
    })
    .slice(0, 12);

  const submittedAssignments = assignments.filter((assignment) => (
    assignment.submissions.some((submission) => toId(submission.student) === toId(user._id))
  ));
  const gradedSubmissions = assignments
    .map((assignment) => {
      const submission = assignment.submissions.find(
        (item) => toId(item.student) === toId(user._id) &&
          (hasNumericScore(item.score) || item.gradedAt),
      );

      if (!submission) {
        return null;
      }

      return {
        assignment,
        submission,
      };
    })
    .filter(Boolean);

  const averageGrade = average(
    gradedSubmissions.map(({ assignment, submission }) => (
      normalizeScoreTo10(submission.score, assignment.maxScore)
    )),
  );

  const stats = [
    {
      title: 'Lớp tham gia',
      value: classes.length,
      icon: '📚',
      color: 'blue',
      meta: `Tuần này: ${activityDocs.filter((activity) => (
        activity.type === 'student_joined' && new Date(activity.createdAt) >= weekStart
      )).length}`,
    },
    {
      title: 'Bài đã nộp',
      value: submittedAssignments.length,
      icon: '📝',
      color: 'green',
      meta: `Tuần này: ${activityDocs.filter((activity) => (
        activity.type === 'assignment_submitted' && new Date(activity.createdAt) >= weekStart
      )).length}`,
    },
    {
      title: 'Bài chưa nộp',
      value: Math.max(assignments.length - submittedAssignments.length, 0),
      icon: '⏰',
      color: 'orange',
      meta: `Hôm nay: ${tasks.filter((task) => {
        const dueDate = new Date(task.dueDate);
        return !task.completed && dueDate >= todayStart && dueDate < todayEnd;
      }).length}`,
    },
    {
      title: 'Điểm trung bình',
      value: averageGrade ? Number(averageGrade.toFixed(1)) : 0,
      icon: '🎯',
      color: 'purple',
      meta: `Đã chấm: ${gradedSubmissions.length}`,
    },
  ];

  const gradeActivities = gradedSubmissions.map(({ assignment, submission }) => ({
    id: `grade-${toId(assignment._id)}`,
    type: 'grade',
    message: `Nhận điểm "${assignment.title}": ${normalizeScoreTo10(submission.score, assignment.maxScore).toFixed(1)}/10`,
    createdAt: submission.gradedAt || submission.submittedAt,
  }));

  const mappedActivities = activityDocs.map((activity) => ({
    id: toId(activity._id),
    type: activity.type === 'assignment_submitted'
      ? 'submission'
      : activity.type === 'student_joined'
        ? 'class'
        : 'reminder',
    message: activity.description,
    createdAt: activity.createdAt,
  }));

  const notificationActivities = notificationDocs.map((notification) => ({
    id: `notification-${toId(notification._id)}`,
    type: getTypeFromNotification(notification.type),
    message: notification.message,
    createdAt: notification.createdAt,
  }));

  const activities = [...gradeActivities, ...mappedActivities, ...notificationActivities]
    .sort(sortByCreatedAtDesc)
    .slice(0, 5);

  const schedule = buildScheduleEntries(classes, 'student');

  const progress = [
    {
      label: 'Bài tập đã hoàn thành',
      value: assignments.length
        ? clampPercentage((submittedAssignments.length / assignments.length) * 100)
        : 0,
    },
    {
      label: 'Bài tập đã chấm điểm',
      value: submittedAssignments.length
        ? clampPercentage((gradedSubmissions.length / submittedAssignments.length) * 100)
        : 0,
    },
    {
      label: 'Điểm trung bình',
      value: clampPercentage((averageGrade / 10) * 100),
    },
  ];

  const derivedNotifications = [];
  tasks
    .filter((task) => {
      const dueDate = new Date(task.dueDate);
      const diff = dueDate.getTime() - now.getTime();
      return !task.completed && diff > 0 && diff <= (2 * DAY_IN_MS);
    })
    .slice(0, 2)
    .forEach((task) => {
      derivedNotifications.push({
        id: `derived-task-${task.id}`,
        title: 'Deadline sắp tới',
        message: `Bài "${task.title}" sắp đến hạn nộp`,
        type: 'reminder',
        isRead: false,
        createdAt: task.dueDate,
      });
    });

  const notifications = [...buildNotificationItems(notificationDocs), ...derivedNotifications]
    .sort(sortByCreatedAtDesc)
    .slice(0, 5);

  const quickStats = [
    {
      label: 'Hạn hôm nay',
      value: String(tasks.filter((task) => {
        const dueDate = new Date(task.dueDate);
        return !task.completed && dueDate >= todayStart && dueDate < todayEnd;
      }).length),
    },
    {
      label: 'Lớp hôm nay',
      value: String(schedule.filter((item) => item.dayOfWeek === currentDay).length),
    },
    {
      label: 'Chưa đọc',
      value: String(unreadCount),
    },
    {
      label: 'Bài giảng mới',
      value: String(lectures.filter((lecture) => new Date(lecture.createdAt) >= weekStart).length),
    },
  ];

  return {
    summary: {
      classes: classes.length,
      assignments: assignments.length,
      lectures: lectures.length,
      teachers: classes.length,
      submittedAssignments: submittedAssignments.length,
      pendingAssignments: Math.max(assignments.length - submittedAssignments.length, 0),
      averageGrade: Number(averageGrade.toFixed(1)) || 0,
    },
    stats,
    tasks,
    activities,
    schedule,
    progress,
    quickStats,
    notifications,
  };
};

const getOverview = async (user) => {
  if (user.role === 'teacher') {
    return buildTeacherOverview(user);
  }

  return buildStudentOverview(user);
};

router.get('/overview', auth, async (req, res) => {
  try {
    const overview = await getOverview(req.user);
    res.json(overview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Legacy endpoints kept for compatibility
router.get('/stats', auth, async (req, res) => {
  try {
    const overview = await getOverview(req.user);
    res.json(overview.summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/assignments/today', auth, async (req, res) => {
  try {
    const overview = await getOverview(req.user);
    const todayStart = startOfDay();
    const todayEnd = endOfDay();

    res.json(
      overview.tasks.filter((task) => {
        const dueDate = new Date(task.dueDate);
        return dueDate >= todayStart && dueDate < todayEnd;
      }),
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/activities', auth, async (req, res) => {
  try {
    const overview = await getOverview(req.user);
    res.json(overview.activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/schedule', auth, async (req, res) => {
  try {
    const overview = await getOverview(req.user);
    res.json(overview.schedule.filter((item) => item.dayOfWeek === new Date().getDay()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
