import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiCall from "../utils/api";

interface Submission {
  id: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  status: "submitted" | "graded" | "late";
}

interface Assignment {
  id: number | string;
  title: string;
  class: string;
  dueDate: string;
  description: string;
  maxGrade: number;
  submissions: Submission[];
  totalStudents: number;
  status: "active" | "completed" | "draft";
  createdAt: string;
}

interface ClassOption {
  _id: string;
  name: string;
}

const seedAssignments: Assignment[] = [
  {
    id: 1,
    title: "Bài tập React Hooks",
    class: "React Nâng cao",
    dueDate: "2026-05-02",
    description: "Thực hành useState, useEffect và custom hooks.",
    maxGrade: 10,
    totalStudents: 25,
    status: "active",
    createdAt: "2026-04-20",
    submissions: [
      {
        id: "1",
        studentName: "Nguyễn Văn A",
        studentEmail: "nguyenvana@email.com",
        submittedAt: "2026-04-24 14:30",
        grade: 8.5,
        feedback: "Bài làm tốt, cần cải thiện error handling.",
        status: "graded",
      },
      {
        id: "2",
        studentName: "Trần Thị B",
        studentEmail: "tranthib@email.com",
        submittedAt: "2026-04-25 09:15",
        status: "submitted",
      },
    ],
  },
  {
    id: 2,
    title: "Thiết kế Database",
    class: "Database Design",
    dueDate: "2026-05-05",
    description: "Thiết kế ERD cho hệ thống quản lý thư viện.",
    maxGrade: 10,
    totalStudents: 30,
    status: "active",
    createdAt: "2026-04-18",
    submissions: [],
  },
];

const getDaysLeft = (dueDate: string) => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Đã hết hạn";
  if (diffDays === 0) return "Hôm nay";
  return `Còn ${diffDays} ngày`;
};

export default function Assignments() {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [assignmentsList, setAssignmentsList] =
    useState<Assignment[]>(seedAssignments);
  const [createForm, setCreateForm] = useState({
    title: "",
    classId: "",
    dueDate: "",
    maxGrade: 10,
    description: "",
  });

  useEffect(() => {
    if (user?.role === "teacher") {
      apiCall("/api/classes")
        .then((response) => response.json())
        .then((data: unknown) => {
          if (Array.isArray(data)) {
            setClasses(data as ClassOption[]);
          }
        })
        .catch(() => undefined);
    }
  }, [user]);

  const filteredAssignments = useMemo(() => {
    if (filterStatus === "all") {
      return assignmentsList;
    }

    return assignmentsList.filter((assignment) => assignment.status === filterStatus);
  }, [assignmentsList, filterStatus]);

  const handleCreateAssignment = () => {
    if (!createForm.title.trim() || !createForm.classId || !createForm.dueDate) {
      alert("Vui lòng nhập đủ thông tin bài tập.");
      return;
    }

    const className =
      classes.find((classItem) => classItem._id === createForm.classId)?.name ||
      "Lớp học";

    const newAssignment: Assignment = {
      id: Date.now(),
      title: createForm.title.trim(),
      class: className,
      dueDate: createForm.dueDate,
      description: createForm.description.trim(),
      maxGrade: Number(createForm.maxGrade) || 10,
      submissions: [],
      totalStudents: 0,
      status: "draft",
      createdAt: new Date().toISOString().split("T")[0],
    };

    setAssignmentsList((prev) => [newAssignment, ...prev]);
    setShowCreateModal(false);
    setCreateForm({
      title: "",
      classId: "",
      dueDate: "",
      maxGrade: 10,
      description: "",
    });
  };

  const openAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowViewModal(true);
  };

  return (
    <>
      <div className="assignments-header-main">
        <div className="assignments-title-section">
          <h1 className="title">Bài tập</h1>
          <p className="subtitle">
            {user?.role === "teacher"
              ? "Quản lý và chấm điểm bài tập của sinh viên"
              : "Theo dõi bài tập và kết quả học tập"}
          </p>
        </div>

        {user?.role === "teacher" && (
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Tạo bài tập
          </button>
        )}
      </div>

      <div className="assignments-controls">
        <div className="filter-tabs">
          <button
            className={filterStatus === "all" ? "active" : ""}
            onClick={() => setFilterStatus("all")}
          >
            Tất cả
          </button>
          <button
            className={filterStatus === "active" ? "active" : ""}
            onClick={() => setFilterStatus("active")}
          >
            Đang mở
          </button>
          <button
            className={filterStatus === "completed" ? "active" : ""}
            onClick={() => setFilterStatus("completed")}
          >
            Đã đóng
          </button>
          {user?.role === "teacher" && (
            <button
              className={filterStatus === "draft" ? "active" : ""}
              onClick={() => setFilterStatus("draft")}
            >
              Bản nháp
            </button>
          )}
        </div>
      </div>

      <div
        className={
          user?.role === "teacher" ? "assignments-grid" : "student-assignments-grid"
        }
      >
        {filteredAssignments.map((assignment) => (
          <div
            key={assignment.id}
            className={
              user?.role === "teacher" ? "assignment-card" : "student-assignment-card"
            }
          >
            <div className="assignment-header">
              <h3>{assignment.title}</h3>
              <span className={`status-badge ${assignment.status}`}>
                {assignment.status === "active"
                  ? "Đang mở"
                  : assignment.status === "completed"
                    ? "Đã đóng"
                    : "Bản nháp"}
              </span>
            </div>

            <div className="assignment-meta">
              <div className="meta-item">
                <span>{assignment.class}</span>
              </div>
              <div className="meta-item">
                <span>Hạn nộp: {assignment.dueDate}</span>
              </div>
              <div className="meta-item">
                <span className="deadline">{getDaysLeft(assignment.dueDate)}</span>
              </div>
            </div>

            <div className="assignment-description">
              <p>{assignment.description}</p>
            </div>

            <div className="assignment-actions">
              <button className="btn-outline" onClick={() => openAssignment(assignment)}>
                Xem chi tiết
              </button>
              {user?.role === "teacher" ? (
                <button className="btn-primary" onClick={() => openAssignment(assignment)}>
                  Xem bài nộp
                </button>
              ) : (
                <button className="btn-primary" onClick={() => alert("Chức năng nộp bài đang được hoàn thiện.")}>
                  Nộp bài
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showViewModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedAssignment.title}</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>{selectedAssignment.description}</p>
              <p>Lớp học: {selectedAssignment.class}</p>
              <p>Hạn nộp: {selectedAssignment.dueDate}</p>
              <p>Điểm tối đa: {selectedAssignment.maxGrade}</p>

              {user?.role === "teacher" && (
                <div className="submissions-grid">
                  {selectedAssignment.submissions.map((submission) => (
                    <div key={submission.id} className="submission-item">
                      <h4>{submission.studentName}</h4>
                      <p>{submission.studentEmail}</p>
                      <p>{submission.submittedAt}</p>
                      <p>Trạng thái: {submission.status}</p>
                      {submission.grade !== undefined && <p>Điểm: {submission.grade}</p>}
                      {submission.feedback && <p>Nhận xét: {submission.feedback}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tạo bài tập mới</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tiêu đề</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Lớp học</label>
                <select
                  value={createForm.classId}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, classId: event.target.value }))
                  }
                >
                  <option value="">Chọn lớp học</option>
                  {classes.map((classItem) => (
                    <option key={classItem._id} value={classItem._id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Hạn nộp</label>
                <input
                  type="date"
                  value={createForm.dueDate}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Điểm tối đa</label>
                <input
                  type="number"
                  value={createForm.maxGrade}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      maxGrade: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  rows={4}
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Hủy
                </button>
                <button className="btn-primary" onClick={handleCreateAssignment}>
                  Tạo bài tập
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
