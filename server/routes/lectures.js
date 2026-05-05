const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Lecture = require("../models/Lecture");
const Class = require("../models/Class");
const { auth, teacherAuth } = require("../middleware/auth");
const {
  createActivity,
  notifyClassStudents,
} = require("../utils/notifications");

const router = express.Router();
const lecturesUploadDir = path.resolve(__dirname, "..", "uploads", "lectures");

const ensureUploadDir = () => {
  if (!fs.existsSync(lecturesUploadDir)) {
    fs.mkdirSync(lecturesUploadDir, { recursive: true });
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

const loadLectureForResponse = async (lectureId) =>
  Lecture.findById(lectureId)
    .populate("class", "name")
    .populate("teacher", "name email");

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, lecturesUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${sanitizeStoredFilename(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role === "teacher") {
      const lectures = await Lecture.find({ teacher: req.user._id })
        .populate("class", "name")
        .populate("teacher", "name email")
        .sort({ createdAt: -1 });

      return res.json(lectures);
    }

    const myClasses = await Class.find({ students: req.user._id }).select("_id");
    const classIds = myClasses.map((classItem) => classItem._id);

    const lectures = await Lecture.find({
      class: { $in: classIds },
      isPublished: true,
    })
      .populate("class", "name")
      .populate("teacher", "name email")
      .sort({ createdAt: -1 });

    return res.json(lectures);
  } catch (error) {
    console.error("Get lectures error:", error);
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

    const lectures = await Lecture.find(query)
      .populate("teacher", "name email")
      .populate("class", "name")
      .sort({ createdAt: -1 });

    return res.json(lectures);
  } catch (error) {
    console.error("Get lectures by class error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:id/files/:filename", auth, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id).select("class files");
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    const canAccess = await hasClassAccess(lecture.class, req.user._id);
    if (!canAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const fileRecord = lecture.files.find(
      (file) => file.filename === req.params.filename,
    );
    if (!fileRecord) {
      return res.status(404).json({ message: "File not found" });
    }

    const filePath = path.resolve(lecturesUploadDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.download(filePath, fileRecord.originalName);
  } catch (error) {
    console.error("Download lecture file error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, teacherAuth, upload.array("files"), async (req, res) => {
  try {
    const { title, content, classId, videoUrl } = req.body;
    const classData = await Class.findById(classId);

    if (!classData || toIdString(classData.teacher) !== toIdString(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const lecture = new Lecture({
      title: title?.trim(),
      content: content?.trim() || "",
      class: classId,
      teacher: req.user._id,
      files: getStoredFiles(req.files),
      videoUrl: videoUrl?.trim() || "",
    });

    await lecture.save();

    await createActivity(
      req.user._id,
      "lecture_created",
      `Created lecture: ${lecture.title}`,
      { classId, lectureId: lecture._id },
    );

    const populatedLecture = await loadLectureForResponse(lecture._id);
    return res.status(201).json(populatedLecture);
  } catch (error) {
    console.error("Create lecture error:", error);
    return res.status(500).json({
      message: error.message || "Could not upload lecture materials",
    });
  }
});

router.patch("/:id", auth, teacherAuth, upload.array("files"), async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture || toIdString(lecture.teacher) !== toIdString(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, content, videoUrl, isPublished } = req.body;

    if (title) lecture.title = title.trim();
    if (content !== undefined) lecture.content = content.trim();
    if (videoUrl !== undefined) lecture.videoUrl = videoUrl.trim();
    if (isPublished !== undefined) {
      lecture.isPublished = isPublished === "true" || isPublished === true;
    }
    if (req.files?.length) {
      lecture.files.push(...getStoredFiles(req.files));
    }

    await lecture.save();

    const populatedLecture = await loadLectureForResponse(lecture._id);
    return res.json(populatedLecture);
  } catch (error) {
    console.error("Update lecture error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/publish", auth, teacherAuth, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id).populate("class");

    if (!lecture || toIdString(lecture.teacher) !== toIdString(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    lecture.isPublished = true;
    lecture.publishedAt = new Date();
    await lecture.save();

    await createActivity(
      req.user._id,
      "lecture_published",
      `Published lecture: ${lecture.title}`,
      { classId: lecture.class._id, lectureId: lecture._id },
    );

    await notifyClassStudents(
      lecture.class._id,
      req.user._id,
      "New lecture",
      `Lecture "${lecture.title}" is now available.`,
      "lecture",
      { lectureId: lecture._id },
    );

    const populatedLecture = await loadLectureForResponse(lecture._id);
    return res.json(populatedLecture);
  } catch (error) {
    console.error("Publish lecture error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, teacherAuth, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture || toIdString(lecture.teacher) !== toIdString(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Lecture.findByIdAndDelete(req.params.id);
    return res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete lecture error:", error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
