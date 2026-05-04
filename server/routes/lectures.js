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

ensureUploadDir();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, lecturesUploadDir);
  },
  filename: (req, file, cb) => {
    const safeOriginalName = path
      .basename(file.originalname)
      .replace(/[^\w.\-()\s]/g, "_");
    cb(null, `${Date.now()}-${safeOriginalName}`);
  },
});

const upload = multer({ storage });

// Get all lectures for current user
router.get("/", auth, async (req, res) => {
  try {
    let lectures;
    if (req.user.role === "teacher") {
      lectures = await Lecture.find({ teacher: req.user._id })
        .populate("class", "name")
        .sort({ createdAt: -1 });
    } else {
      const Class = require("../models/Class");
      const myClasses = await Class.find({ students: req.user._id }).select(
        "_id",
      );
      const classIds = myClasses.map((c) => c._id);
      lectures = await Lecture.find({
        class: { $in: classIds },
        isPublished: true,
      })
        .populate("class", "name")
        .populate("teacher", "name")
        .sort({ createdAt: -1 });
    }
    res.json(lectures);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Download lecture file
router.get("/:id/files/:filename", auth, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id).populate("class");
    if (!lecture) return res.status(404).json({ message: "Lecture not found" });
    const filePath = path.resolve(
      __dirname,
      "..",
      "uploads",
      "lectures",
      req.params.filename,
    );
    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: "File not found" });
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update lecture (teacher only)
router.patch(
  "/:id",
  auth,
  teacherAuth,
  upload.array("files"),
  async (req, res) => {
    try {
      const lecture = await Lecture.findById(req.params.id);
      if (!lecture || lecture.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      const { title, content, videoUrl, isPublished } = req.body;
      if (title) lecture.title = title;
      if (content !== undefined) lecture.content = content;
      if (videoUrl !== undefined) lecture.videoUrl = videoUrl;
      if (isPublished !== undefined)
        lecture.isPublished = isPublished === "true" || isPublished === true;
      if (req.files?.length) {
        const newFiles = req.files.map((file) => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size,
        }));
        lecture.files.push(...newFiles);
      }
      await lecture.save();
      await lecture.populate("class", "name");
      res.json(lecture);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Delete lecture (teacher only)
router.delete("/:id", auth, teacherAuth, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture || lecture.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }
    await Lecture.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get lectures by class
router.get("/class/:classId", auth, async (req, res) => {
  try {
    const lectures = await Lecture.find({
      class: req.params.classId,
      isPublished: true,
    })
      .populate("teacher", "name")
      .sort({ createdAt: -1 });

    res.json(lectures);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create lecture (teacher only)
router.post("/", auth, teacherAuth, upload.array("files"), async (req, res) => {
  try {
    const { title, content, classId, videoUrl } = req.body;

    const classData = await Class.findById(classId);
    if (
      !classData ||
      classData.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const files =
      req.files?.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
      })) || [];

    const lecture = new Lecture({
      title,
      content,
      class: classId,
      teacher: req.user._id,
      files,
      videoUrl,
    });

    await lecture.save();
    await lecture.populate("teacher", "name");

    // Create activity
    await createActivity(
      req.user._id,
      "lecture_created",
      `Tạo bài giảng: ${title}`,
      { classId, lectureId: lecture._id },
    );

    res.status(201).json(lecture);
  } catch (error) {
    console.error("Create lecture error:", error);
    res.status(500).json({
      message: error.message || "Khong the tai len tai lieu bai giang",
    });
  }
});

// Publish lecture
router.patch("/:id/publish", auth, teacherAuth, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id).populate("class");

    if (!lecture || lecture.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    lecture.isPublished = true;
    lecture.publishedAt = new Date();
    await lecture.save();

    // Create activity
    await createActivity(
      req.user._id,
      "lecture_published",
      `Xuất bản bài giảng: ${lecture.title}`,
      { classId: lecture.class._id, lectureId: lecture._id },
    );

    // Notify students
    await notifyClassStudents(
      lecture.class._id,
      req.user._id,
      "Bài giảng mới",
      `Bài giảng "${lecture.title}" đã được xuất bản`,
      "lecture",
      { lectureId: lecture._id },
    );

    res.json(lecture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
