const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Assignment = require("../models/Assignment");
const Class = require("../models/Class");
const { auth, teacherAuth } = require("../middleware/auth");
const {
  createActivity,
  createNotification,
  notifyClassStudents,
} = require("../utils/notifications");

const router = express.Router();
const assignmentsUploadDir = path.resolve(
  __dirname,
  "..",
  "uploads",
  "assignments",
);

const ensureUploadDir = () => {
  if (!fs.existsSync(assignmentsUploadDir)) {
    fs.mkdirSync(assignmentsUploadDir, { recursive: true });
  }
};

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const sanitizeStoredFilename = (originalName) =>
  path.basename(originalName).replace(/[^\w.\-()\s]/g, "_");

const hasClassAccess = async (classId, userId) => {
  const classData = await Class.findById(classId).select("teacher students");
  if (!classData) {
    return false;
  }

  if (toIdString(classData.teacher) === toIdString(userId)) {
    return true;
  }

  return classData.students.some(
    (studentId) => toIdString(studentId) === toIdString(userId),
  );
};

const getStoredFiles = (files = []) =>
  files.map((file) => ({
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    size: file.size,
  }));

const loadAssignmentForResponse = async (assignmentId) =>
  Assignment.findById(assignmentId)
    .populate("class", "name")
    .populate("teacher", "name email")
    .populate("submissions.student", "name email mssv");

const serializeAssignmentForStudent = (assignment, userId) => {
  const plainAssignment =
    typeof assignment.toObject === "function" ? assignment.toObject() : assignment;

  return {
    ...plainAssignment,
    submissions: (plainAssignment.submissions || []).filter(
      (submission) => toIdString(submission.student) === toIdString(userId),
    ),
  };
};

const serializeAssignment = (assignment, user) =>
  user.role === "teacher"
    ? typeof assignment.toObject === "function"
      ? assignment.toObject()
      : assignment
    : serializeAssignmentForStudent(assignment, user._id);

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, assignmentsUploadDir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${Date.now()}-${sanitizeStoredFilename(file.originalname)}`,
    );
  },
});

const upload = multer({ storage });

router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role === "teacher") {
      const assignments = await Assignment.find({ teacher: req.user._id })
        .populate("class", "name")
        .populate("teacher", "name email")
        .populate("submissions.student", "name email mssv")
        .sort({ createdAt: -1 })
        .lean();

      return res.json(assignments);
    }

    const myClasses = await Class.find({ students: req.user._id }).select("_id");
    const classIds = myClasses.map((classItem) => classItem._id);

    const assignments = await Assignment.find({
      class: { $in: classIds },
      isPublished: true,
    })
      .populate("class", "name")
      .populate("teacher", "name email")
      .populate("submissions.student", "name email mssv")
      .sort({ dueDate: 1 })
      .lean();

    return res.json(
      assignments.map((assignment) =>
        serializeAssignmentForStudent(assignment, req.user._id),
      ),
    );
  } catch (error) {
    console.error("Get assignments error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.get("/class/:classId", auth, async (req, res) => {
  try {
    const canAccess = await hasClassAccess(req.params.classId, req.user._id);
    if (!canAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { class: req.params.classId };
    if (req.user.role !== "teacher") {
      query.isPublished = true;
    }

    const assignments = await Assignment.find(query)
      .populate("class", "name")
      .populate("teacher", "name email")
      .populate("submissions.student", "name email mssv")
      .sort({ dueDate: 1 })
      .lean();

    return res.json(
      assignments.map((assignment) =>
        req.user.role === "teacher"
          ? assignment
          : serializeAssignmentForStudent(assignment, req.user._id),
      ),
    );
  } catch (error) {
    console.error("Get assignments by class error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:id/files/:filename", auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).select(
      "class files teacher",
    );

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const canAccess = await hasClassAccess(assignment.class, req.user._id);
    if (!canAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const fileRecord = assignment.files.find(
      (file) => file.filename === req.params.filename,
    );

    if (!fileRecord) {
      return res.status(404).json({ message: "File not found" });
    }

    const filePath = path.resolve(assignmentsUploadDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.download(filePath, fileRecord.originalName);
  } catch (error) {
    console.error("Download assignment file error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:id/submissions/files/:filename", auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).select(
      "class teacher submissions",
    );

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const isTeacher =
      toIdString(assignment.teacher) === toIdString(req.user._id);
    const allowedSubmission = assignment.submissions.find((submission) => {
      if (!isTeacher && toIdString(submission.student) !== toIdString(req.user._id)) {
        return false;
      }

      return submission.files.some(
        (file) => file.filename === req.params.filename,
      );
    });

    if (!allowedSubmission) {
      return res.status(404).json({ message: "File not found" });
    }

    const fileRecord = allowedSubmission.files.find(
      (file) => file.filename === req.params.filename,
    );
    const filePath = path.resolve(assignmentsUploadDir, req.params.filename);

    if (!fileRecord || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.download(filePath, fileRecord.originalName);
  } catch (error) {
    console.error("Download submission file error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, teacherAuth, upload.array("files"), async (req, res) => {
  try {
    const { title, description, classId, dueDate, maxScore } = req.body;
    const classData = await Class.findById(classId);

    if (!classData || toIdString(classData.teacher) !== toIdString(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const assignment = new Assignment({
      title: title?.trim(),
      description: description?.trim() || "",
      class: classId,
      teacher: req.user._id,
      dueDate: new Date(dueDate),
      maxScore: Number(maxScore) || 100,
      files: getStoredFiles(req.files),
    });

    await assignment.save();

    await createActivity(
      req.user._id,
      "assignment_created",
      `Created assignment: ${assignment.title}`,
      { classId, assignmentId: assignment._id },
    );

    const populatedAssignment = await loadAssignmentForResponse(assignment._id);
    return res.status(201).json(serializeAssignment(populatedAssignment, req.user));
  } catch (error) {
    console.error("Create assignment error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/publish", auth, teacherAuth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate("class");

    if (!assignment || toIdString(assignment.teacher) !== toIdString(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    assignment.isPublished = true;
    await assignment.save();

    await notifyClassStudents(
      assignment.class._id,
      req.user._id,
      "New assignment",
      `Assignment "${assignment.title}" is now available.`,
      "assignment",
      { assignmentId: assignment._id },
    );

    const populatedAssignment = await loadAssignmentForResponse(assignment._id);
    return res.json(serializeAssignment(populatedAssignment, req.user));
  } catch (error) {
    console.error("Publish assignment error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.post("/:id/submit", auth, upload.array("files"), async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can submit" });
    }

    const { content } = req.body;
    const assignment = await Assignment.findById(req.params.id).populate(
      "class",
      "name students teacher",
    );

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const canAccess = await hasClassAccess(assignment.class._id, req.user._id);
    if (!canAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!assignment.isPublished) {
      return res.status(400).json({ message: "Assignment is not published" });
    }

    if (new Date() > assignment.dueDate) {
      return res
        .status(400)
        .json({ message: "Assignment deadline has passed" });
    }

    const trimmedContent = typeof content === "string" ? content.trim() : "";
    const uploadedFiles = getStoredFiles(req.files);
    const existingSubmission = assignment.submissions.find(
      (submission) => toIdString(submission.student) === toIdString(req.user._id),
    );

    if (!trimmedContent && uploadedFiles.length === 0 && !existingSubmission) {
      return res
        .status(400)
        .json({ message: "Please add submission content or at least one file" });
    }

    if (existingSubmission) {
      existingSubmission.files =
        uploadedFiles.length > 0 ? uploadedFiles : existingSubmission.files;
      existingSubmission.content = trimmedContent;
      existingSubmission.submittedAt = new Date();
    } else {
      assignment.submissions.push({
        student: req.user._id,
        files: uploadedFiles,
        content: trimmedContent,
        submittedAt: new Date(),
      });
    }

    await assignment.save();

    await createActivity(
      req.user._id,
      "assignment_submitted",
      `Submitted assignment: ${assignment.title}`,
      { classId: assignment.class._id, assignmentId: assignment._id },
    );

    await createNotification(
      assignment.teacher,
      req.user._id,
      "New submission",
      `${req.user.name} submitted "${assignment.title}"`,
      "assignment",
      { classId: assignment.class._id, assignmentId: assignment._id },
    );

    const populatedAssignment = await loadAssignmentForResponse(assignment._id);
    return res.json({
      message: "Assignment submitted successfully",
      assignment: serializeAssignment(populatedAssignment, req.user),
    });
  } catch (error) {
    console.error("Submit assignment error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.patch(
  "/:id/grade/:submissionId",
  auth,
  teacherAuth,
  async (req, res) => {
    try {
      const assignment = await Assignment.findById(req.params.id).populate(
        "class",
        "name",
      );

      if (
        !assignment ||
        toIdString(assignment.teacher) !== toIdString(req.user._id)
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      const submission = assignment.submissions.id(req.params.submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      const numericScore = Number(req.body.score);
      if (
        !Number.isFinite(numericScore) ||
        numericScore < 0 ||
        numericScore > assignment.maxScore
      ) {
        return res.status(400).json({
          message: `Score must be between 0 and ${assignment.maxScore}`,
        });
      }

      submission.score = numericScore;
      submission.feedback = req.body.feedback?.trim() || "";
      submission.gradedAt = new Date();

      await assignment.save();

      await createActivity(
        req.user._id,
        "assignment_graded",
        `Graded assignment: ${assignment.title}`,
        { classId: assignment.class._id, assignmentId: assignment._id },
      );

      await createNotification(
        submission.student,
        req.user._id,
        "Assignment graded",
        `Your work for "${assignment.title}" has been graded.`,
        "grade",
        { classId: assignment.class._id, assignmentId: assignment._id },
      );

      const populatedAssignment = await loadAssignmentForResponse(assignment._id);
      return res.json({
        message: "Assignment graded successfully",
        assignment: serializeAssignment(populatedAssignment, req.user),
      });
    } catch (error) {
      console.error("Grade assignment error:", error);
      return res.status(500).json({ message: error.message });
    }
  },
);

router.delete("/:id", auth, teacherAuth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (
      !assignment ||
      toIdString(assignment.teacher) !== toIdString(req.user._id)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Assignment.findByIdAndDelete(req.params.id);
    return res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete assignment error:", error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
