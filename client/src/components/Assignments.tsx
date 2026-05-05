import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiCall, { getApiUrl } from "../utils/api";

interface AssignmentFile {
  filename: string;
  originalName: string;
  size: number;
}

interface PersonRef {
  _id: string;
  name: string;
  email?: string;
  mssv?: string;
}

interface AssignmentClass {
  _id: string;
  name: string;
}

interface SubmissionRecord {
  _id: string;
  student: PersonRef | string;
  files: AssignmentFile[];
  content?: string;
  score?: number;
  feedback?: string;
  submittedAt?: string;
  gradedAt?: string;
}

interface AssignmentRecord {
  _id: string;
  title: string;
  description: string;
  class: AssignmentClass | string;
  teacher?: PersonRef | string;
  dueDate: string;
  maxScore: number;
  files: AssignmentFile[];
  submissions: SubmissionRecord[];
  isPublished: boolean;
  createdAt: string;
}

interface ClassOption {
  _id: string;
  name: string;
}

interface AssignmentApiResponse {
  message?: string;
  assignment?: AssignmentRecord;
}

type AssignmentStatus = "active" | "completed" | "draft";

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "--";

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString("vi-VN") : "--";

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getObjectId = (value: PersonRef | string | undefined) => {
  if (!value) return "";
  return typeof value === "string" ? value : value._id;
};

const getDisplayName = (value: PersonRef | string | undefined, fallback = "--") => {
  if (!value) return fallback;
  return typeof value === "string" ? fallback : value.name;
};

const getClassName = (classValue: AssignmentClass | string) =>
  typeof classValue === "string" ? classValue : classValue.name;

const getAssignmentStatus = (
  assignment: AssignmentRecord,
): AssignmentStatus => {
  if (!assignment.isPublished) {
    return "draft";
  }

  return new Date(assignment.dueDate).getTime() < Date.now()
    ? "completed"
    : "active";
};

const getStatusLabel = (status: AssignmentStatus) => {
  switch (status) {
    case "active":
      return "Đang mở";
    case "completed":
      return "Đã đóng";
    default:
      return "Bản nháp";
  }
};

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
  const isTeacher = user?.role === "teacher";

  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<AssignmentRecord | null>(null);
  const [createForm, setCreateForm] = useState({
    title: "",
    classId: "",
    dueDate: "",
    maxScore: "10",
    description: "",
  });
  const [createFiles, setCreateFiles] = useState<FileList | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [submissionFiles, setSubmissionFiles] = useState<FileList | null>(null);
  const [gradingState, setGradingState] = useState<
    Record<string, { score: string; feedback: string }>
  >({});
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const submissionFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [assignmentsResponse, classesResponse] = await Promise.all([
          apiCall("/api/assignments"),
          isTeacher ? apiCall("/api/classes") : Promise.resolve(null),
        ]);

        const assignmentsData = (await assignmentsResponse.json()) as
          | AssignmentRecord[]
          | AssignmentApiResponse;

        if (!assignmentsResponse.ok) {
          throw new Error(
            Array.isArray(assignmentsData)
              ? "Không thể tải bài tập"
              : assignmentsData.message || "Không thể tải bài tập",
          );
        }

        setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);

        if (classesResponse) {
          const classesData = (await classesResponse.json()) as
            | ClassOption[]
            | AssignmentApiResponse;
          if (classesResponse.ok && Array.isArray(classesData)) {
            setClasses(classesData);
          }
        }
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Không thể tải bài tập"));
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [isTeacher]);

  const resetCreateForm = () => {
    setCreateForm({
      title: "",
      classId: "",
      dueDate: "",
      maxScore: "10",
      description: "",
    });
    setCreateFiles(null);
    if (createFileInputRef.current) {
      createFileInputRef.current.value = "";
    }
  };

  const syncAssignment = (nextAssignment: AssignmentRecord) => {
    setAssignments((prev) =>
      prev.some((assignment) => assignment._id === nextAssignment._id)
        ? prev.map((assignment) =>
            assignment._id === nextAssignment._id ? nextAssignment : assignment,
          )
        : [nextAssignment, ...prev],
    );
    setSelectedAssignment((prev) =>
      prev && prev._id === nextAssignment._id ? nextAssignment : prev,
    );
  };

  const getOwnSubmission = (assignment: AssignmentRecord) => {
    if (!user?.id) return null;
    return (
      assignment.submissions.find(
        (submission) => getObjectId(submission.student) === user.id,
      ) || null
    );
  };

  const openAssignment = (assignment: AssignmentRecord) => {
    setSelectedAssignment(assignment);
    setShowViewModal(true);

    if (isTeacher) {
      const initialGrades = assignment.submissions.reduce<
        Record<string, { score: string; feedback: string }>
      >((accumulator, submission) => {
        accumulator[submission._id] = {
          score:
            submission.score === undefined ? "" : String(submission.score),
          feedback: submission.feedback || "",
        };
        return accumulator;
      }, {});
      setGradingState(initialGrades);
    }
  };

  const openSubmitModal = (assignment: AssignmentRecord) => {
    const currentSubmission = getOwnSubmission(assignment);
    setSelectedAssignment(assignment);
    setSubmissionContent(currentSubmission?.content || "");
    setSubmissionFiles(null);
    if (submissionFileInputRef.current) {
      submissionFileInputRef.current.value = "";
    }
    setShowSubmitModal(true);
  };

  const handleCreateAssignment = async (publish: boolean) => {
    if (
      !createForm.title.trim() ||
      !createForm.classId ||
      !createForm.dueDate
    ) {
      alert("Vui lòng nhập đủ tiêu đề, lớp học và hạn nộp.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("title", createForm.title.trim());
      formData.append("classId", createForm.classId);
      formData.append("dueDate", createForm.dueDate);
      formData.append("maxScore", createForm.maxScore || "10");
      formData.append("description", createForm.description.trim());

      if (createFiles) {
        Array.from(createFiles).forEach((file) => {
          formData.append("files", file);
        });
      }

      const token = localStorage.getItem("token");
      const createResponse = await fetch(getApiUrl("/api/assignments"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const createData = (await createResponse.json()) as
        | AssignmentRecord
        | AssignmentApiResponse;

      if (!createResponse.ok || Array.isArray(createData)) {
        throw new Error(
          !Array.isArray(createData) && createData.message
            ? createData.message
            : "Tạo bài tập thất bại",
        );
      }

      let nextAssignment = createData as AssignmentRecord;

      if (publish) {
        const publishResponse = await apiCall(
          `/api/assignments/${nextAssignment._id}/publish`,
          { method: "PATCH" },
        );
        const publishData = (await publishResponse.json()) as
          | AssignmentRecord
          | AssignmentApiResponse;

        if (!publishResponse.ok || Array.isArray(publishData)) {
          throw new Error(
            !Array.isArray(publishData) && publishData.message
              ? publishData.message
              : "Xuất bản bài tập thất bại",
          );
        }

        nextAssignment = publishData as AssignmentRecord;
      }

      syncAssignment(nextAssignment);
      setShowCreateModal(false);
      resetCreateForm();
    } catch (submitError) {
      alert(getErrorMessage(submitError, "Không thể tạo bài tập"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishAssignment = async (assignment: AssignmentRecord) => {
    try {
      const response = await apiCall(`/api/assignments/${assignment._id}/publish`, {
        method: "PATCH",
      });
      const data = (await response.json()) as
        | AssignmentRecord
        | AssignmentApiResponse;

      if (!response.ok || Array.isArray(data)) {
        throw new Error(
          !Array.isArray(data) && data.message
            ? data.message
            : "Không thể xuất bản bài tập",
        );
      }

      syncAssignment(data as AssignmentRecord);
    } catch (publishError) {
      alert(getErrorMessage(publishError, "Không thể xuất bản bài tập"));
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) {
      return;
    }

    if (!submissionContent.trim() && !submissionFiles?.length) {
      alert("Vui lòng nhập nội dung hoặc chọn ít nhất một file nộp bài.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("content", submissionContent.trim());
      if (submissionFiles) {
        Array.from(submissionFiles).forEach((file) => {
          formData.append("files", file);
        });
      }

      const token = localStorage.getItem("token");
      const response = await fetch(
        getApiUrl(`/api/assignments/${selectedAssignment._id}/submit`),
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      const data = (await response.json()) as AssignmentApiResponse;

      if (!response.ok || !data.assignment) {
        throw new Error(data.message || "Không thể nộp bài");
      }

      syncAssignment(data.assignment);
      setShowSubmitModal(false);
      setSubmissionFiles(null);
    } catch (submitError) {
      alert(getErrorMessage(submitError, "Không thể nộp bài"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGradeSubmission = async (submissionId: string) => {
    if (!selectedAssignment) {
      return;
    }

    const draft = gradingState[submissionId];
    if (!draft || draft.score.trim() === "") {
      alert("Vui lòng nhập điểm trước khi lưu.");
      return;
    }

    try {
      const response = await apiCall(
        `/api/assignments/${selectedAssignment._id}/grade/${submissionId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            score: Number(draft.score),
            feedback: draft.feedback,
          }),
        },
      );

      const data = (await response.json()) as AssignmentApiResponse;
      if (!response.ok || !data.assignment) {
        throw new Error(data.message || "Không thể chấm bài");
      }

      syncAssignment(data.assignment);
      const refreshedSubmission = data.assignment.submissions.find(
        (submission) => submission._id === submissionId,
      );

      if (refreshedSubmission) {
        setGradingState((prev) => ({
          ...prev,
          [submissionId]: {
            score:
              refreshedSubmission.score === undefined
                ? ""
                : String(refreshedSubmission.score),
            feedback: refreshedSubmission.feedback || "",
          },
        }));
      }
    } catch (gradeError) {
      alert(getErrorMessage(gradeError, "Không thể chấm bài"));
    }
  };

  const downloadFile = (
    url: string,
    originalName: string,
    fallbackMessage: string,
  ) => {
    const token = localStorage.getItem("token");

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("File không tồn tại");
        }
        return response.blob();
      })
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = originalName;
        link.click();
        URL.revokeObjectURL(link.href);
      })
      .catch(() => {
        alert(fallbackMessage);
      });
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const status = getAssignmentStatus(assignment);
      const matchesStatus = filterStatus === "all" || status === filterStatus;
      const matchesSearch =
        assignment.title.toLowerCase().includes(searchText.toLowerCase()) ||
        getClassName(assignment.class)
          .toLowerCase()
          .includes(searchText.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [assignments, filterStatus, searchText]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <>
      <div className="assignments-header-main">
        <div className="assignments-title-section">
          <h1 className="title">Bài tập</h1>
          <p className="subtitle">
            {isTeacher
              ? "Quản lý, xuất bản và chấm bài tập của lớp"
              : "Theo dõi hạn nộp, nộp bài và xem phản hồi"}
          </p>
        </div>

        {isTeacher && (
          <button
            className="btn-primary"
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
          >
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
          {isTeacher && (
            <button
              className={filterStatus === "draft" ? "active" : ""}
              onClick={() => setFilterStatus("draft")}
            >
              Bản nháp
            </button>
          )}
        </div>

        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Tìm kiếm bài tập..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
      </div>

      {error && <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>}

      {filteredAssignments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>Chưa có bài tập nào</h3>
        </div>
      ) : (
        <div
          className={
            isTeacher ? "assignments-grid" : "student-assignments-grid"
          }
        >
          {filteredAssignments.map((assignment) => {
            const status = getAssignmentStatus(assignment);
            const ownSubmission = isTeacher ? null : getOwnSubmission(assignment);

            return (
              <div
                key={assignment._id}
                className={
                  isTeacher ? "assignment-card" : "student-assignment-card"
                }
              >
                <div className="assignment-header">
                  <h3>{assignment.title}</h3>
                  <span className={`status-badge ${status}`}>
                    {getStatusLabel(status)}
                  </span>
                </div>

                <div className="assignment-meta">
                  <div className="meta-item">
                    <span>{getClassName(assignment.class)}</span>
                  </div>
                  <div className="meta-item">
                    <span>Hạn nộp: {formatDate(assignment.dueDate)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="deadline">
                      {getDaysLeft(assignment.dueDate)}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span>Điểm tối đa: {assignment.maxScore}</span>
                  </div>
                </div>

                <div className="assignment-description">
                  <p>{assignment.description || "Không có mô tả."}</p>
                </div>

                {!isTeacher && ownSubmission && (
                  <div className="assignment-stats">
                    <div className="stat-item">
                      <span className="stat-label">Đã nộp</span>
                      <span className="stat-value">
                        {formatDateTime(ownSubmission.submittedAt)}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Điểm</span>
                      <span className="stat-value">
                        {ownSubmission.score === undefined
                          ? "Chưa chấm"
                          : `${ownSubmission.score}/${assignment.maxScore}`}
                      </span>
                    </div>
                  </div>
                )}

                {isTeacher && (
                  <div className="assignment-stats">
                    <div className="stat-item">
                      <span className="stat-label">Bài nộp</span>
                      <span className="stat-value">
                        {assignment.submissions.length}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Tệp đính kèm</span>
                      <span className="stat-value">{assignment.files.length}</span>
                    </div>
                  </div>
                )}

                <div className="assignment-actions">
                  <button
                    className="btn-outline"
                    onClick={() => openAssignment(assignment)}
                  >
                    Xem chi tiết
                  </button>

                  {isTeacher ? (
                    !assignment.isPublished && (
                      <button
                        className="btn-primary"
                        onClick={() => void handlePublishAssignment(assignment)}
                      >
                        Xuất bản
                      </button>
                    )
                  ) : (
                    <button
                      className="btn-primary"
                      disabled={new Date(assignment.dueDate).getTime() < Date.now()}
                      onClick={() => openSubmitModal(assignment)}
                    >
                      {ownSubmission ? "Cập nhật bài nộp" : "Nộp bài"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showViewModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div
            className="modal-content large"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{selectedAssignment.title}</h2>
              <button
                className="modal-close"
                onClick={() => setShowViewModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p>{selectedAssignment.description || "Không có mô tả."}</p>
              <p>Lớp học: {getClassName(selectedAssignment.class)}</p>
              <p>Hạn nộp: {formatDateTime(selectedAssignment.dueDate)}</p>
              <p>Điểm tối đa: {selectedAssignment.maxScore}</p>

              {selectedAssignment.files.length > 0 && (
                <div className="files-list" style={{ marginTop: 16 }}>
                  {selectedAssignment.files.map((file) => (
                    <div key={file.filename} className="file-detail-item">
                      <div className="file-details">
                        <h5>{file.originalName}</h5>
                        <p>{formatSize(file.size)}</p>
                      </div>
                      <button
                        className="btn-sm"
                        onClick={() =>
                          downloadFile(
                            getApiUrl(
                              `/api/assignments/${selectedAssignment._id}/files/${file.filename}`,
                            ),
                            file.originalName,
                            "Không thể tải file bài tập.",
                          )
                        }
                      >
                        Tải về
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isTeacher ? (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ marginBottom: 12 }}>Bài nộp</h3>
                  {selectedAssignment.submissions.length === 0 ? (
                    <p>Chưa có sinh viên nào nộp bài.</p>
                  ) : (
                    <div className="submissions-grid">
                      {selectedAssignment.submissions.map((submission) => (
                        <div key={submission._id} className="submission-item">
                          <h4>{getDisplayName(submission.student, "Sinh viên")}</h4>
                          <p>
                            {typeof submission.student === "string"
                              ? "--"
                              : submission.student.email || "--"}
                          </p>
                          <p>Nộp lúc: {formatDateTime(submission.submittedAt)}</p>
                          {submission.content && <p>{submission.content}</p>}

                          {submission.files.length > 0 && (
                            <div style={{ margin: "12px 0" }}>
                              {submission.files.map((file) => (
                                <div
                                  key={file.filename}
                                  className="file-detail-item"
                                  style={{ marginBottom: 8 }}
                                >
                                  <div className="file-details">
                                    <h5>{file.originalName}</h5>
                                    <p>{formatSize(file.size)}</p>
                                  </div>
                                  <button
                                    className="btn-sm"
                                    onClick={() =>
                                      downloadFile(
                                        getApiUrl(
                                          `/api/assignments/${selectedAssignment._id}/submissions/files/${file.filename}`,
                                        ),
                                        file.originalName,
                                        "Không thể tải file bài nộp.",
                                      )
                                    }
                                  >
                                    Tải file
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="form-group">
                            <label>Điểm</label>
                            <input
                              type="number"
                              min={0}
                              max={selectedAssignment.maxScore}
                              value={gradingState[submission._id]?.score || ""}
                              onChange={(event) =>
                                setGradingState((prev) => ({
                                  ...prev,
                                  [submission._id]: {
                                    score: event.target.value,
                                    feedback:
                                      prev[submission._id]?.feedback ||
                                      submission.feedback ||
                                      "",
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>Nhận xét</label>
                            <textarea
                              rows={3}
                              value={gradingState[submission._id]?.feedback || ""}
                              onChange={(event) =>
                                setGradingState((prev) => ({
                                  ...prev,
                                  [submission._id]: {
                                    score:
                                      prev[submission._id]?.score ||
                                      (submission.score === undefined
                                        ? ""
                                        : String(submission.score)),
                                    feedback: event.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <button
                            className="btn-primary"
                            onClick={() => void handleGradeSubmission(submission._id)}
                          >
                            Lưu điểm
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                (() => {
                  const ownSubmission = getOwnSubmission(selectedAssignment);
                  return (
                    <div style={{ marginTop: 24 }}>
                      <h3 style={{ marginBottom: 12 }}>Bài nộp của bạn</h3>
                      {ownSubmission ? (
                        <>
                          <p>Nộp lúc: {formatDateTime(ownSubmission.submittedAt)}</p>
                          <p>
                            Điểm:
                            {" "}
                            {ownSubmission.score === undefined
                              ? "Chưa chấm"
                              : `${ownSubmission.score}/${selectedAssignment.maxScore}`}
                          </p>
                          {ownSubmission.feedback && (
                            <p>Nhận xét: {ownSubmission.feedback}</p>
                          )}
                          {ownSubmission.content && <p>{ownSubmission.content}</p>}
                          {ownSubmission.files.length > 0 && (
                            <div className="files-list" style={{ marginTop: 12 }}>
                              {ownSubmission.files.map((file) => (
                                <div key={file.filename} className="file-detail-item">
                                  <div className="file-details">
                                    <h5>{file.originalName}</h5>
                                    <p>{formatSize(file.size)}</p>
                                  </div>
                                  <button
                                    className="btn-sm"
                                    onClick={() =>
                                      downloadFile(
                                        getApiUrl(
                                          `/api/assignments/${selectedAssignment._id}/submissions/files/${file.filename}`,
                                        ),
                                        file.originalName,
                                        "Không thể tải file bài nộp.",
                                      )
                                    }
                                  >
                                    Tải về
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p>Bạn chưa nộp bài này.</p>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {showSubmitModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div
            className="modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Nộp bài: {selectedAssignment.title}</h2>
              <button
                className="modal-close"
                onClick={() => setShowSubmitModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nội dung</label>
                <textarea
                  rows={5}
                  value={submissionContent}
                  onChange={(event) => setSubmissionContent(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label>File nộp bài</label>
                <input
                  ref={submissionFileInputRef}
                  type="file"
                  multiple
                  onChange={(event) => setSubmissionFiles(event.target.files)}
                />
              </div>
              <div className="form-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Hủy
                </button>
                <button
                  className="btn-primary"
                  disabled={submitting}
                  onClick={() => void handleSubmitAssignment()}
                >
                  Gửi bài
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="modal-content large"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Tạo bài tập mới</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
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
                    setCreateForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Lớp học</label>
                <select
                  value={createForm.classId}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      classId: event.target.value,
                    }))
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
                  type="datetime-local"
                  value={createForm.dueDate}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Điểm tối đa</label>
                <input
                  type="number"
                  min={1}
                  value={createForm.maxScore}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      maxScore: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  rows={5}
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Tài liệu đính kèm</label>
                <input
                  ref={createFileInputRef}
                  type="file"
                  multiple
                  onChange={(event) => setCreateFiles(event.target.files)}
                />
              </div>
              <div className="form-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button
                  className="btn-outline"
                  disabled={submitting}
                  onClick={() => void handleCreateAssignment(false)}
                >
                  Lưu nháp
                </button>
                <button
                  className="btn-primary"
                  disabled={submitting}
                  onClick={() => void handleCreateAssignment(true)}
                >
                  Xuất bản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
