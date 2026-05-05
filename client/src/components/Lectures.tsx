import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiCall, { getApiUrl } from "../utils/api";

interface LectureFile {
  filename: string;
  originalName: string;
  size: number;
}

interface LectureClass {
  _id: string;
  name: string;
}

interface Lecture {
  _id: string;
  title: string;
  content: string;
  class: LectureClass;
  teacher?: { name: string };
  files: LectureFile[];
  videoUrl?: string;
  isPublished: boolean;
  createdAt: string;
}

interface ClassOption {
  _id: string;
  name: string;
}

interface ApiMessage {
  message?: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function Lectures() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formFiles, setFormFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [lecturesResponse, classesResponse] = await Promise.all([
          apiCall("/api/lectures"),
          isTeacher ? apiCall("/api/classes") : Promise.resolve(null),
        ]);

        const lecturesData = (await lecturesResponse.json()) as
          | Lecture[]
          | ApiMessage;
        if (!lecturesResponse.ok) {
          throw new Error(
            Array.isArray(lecturesData)
              ? "Không thể tải bài giảng"
              : lecturesData.message || "Không thể tải bài giảng",
          );
        }
        setLectures(Array.isArray(lecturesData) ? lecturesData : []);

        if (classesResponse) {
          const classesData = (await classesResponse.json()) as
            | ClassOption[]
            | ApiMessage;
          if (classesResponse.ok && Array.isArray(classesData)) {
            setClasses(classesData);
          }
        }
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Không thể tải bài giảng"));
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [isTeacher]);

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormClassId("");
    setFormVideoUrl("");
    setFormFiles(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateLecture = async (publish: boolean) => {
    if (!formTitle.trim() || !formClassId) {
      alert("Vui lòng nhập tiêu đề và chọn lớp học");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("title", formTitle.trim());
      formData.append("content", formContent.trim());
      formData.append("classId", formClassId);
      formData.append("videoUrl", formVideoUrl.trim());

      if (formFiles) {
        Array.from(formFiles).forEach((file) => formData.append("files", file));
      }

      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl("/api/lectures"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as Lecture & ApiMessage;

      if (!response.ok) {
        throw new Error(data.message || "Tạo bài giảng thất bại");
      }

      let nextLecture: Lecture = data;

      if (publish) {
        const publishResponse = await apiCall(`/api/lectures/${data._id}/publish`, {
          method: "PATCH",
        });
        const publishData = (await publishResponse.json()) as Lecture & ApiMessage;
        if (!publishResponse.ok) {
          throw new Error(
            publishData.message || "Xuáº¥t báº£n bĂ i giáº£ng tháº¥t báº¡i",
          );
        }
        nextLecture = { ...data, ...publishData, isPublished: true };
      }

      setLectures((prev) => [nextLecture, ...prev]);
      setShowCreateModal(false);
      resetForm();
    } catch (submitError) {
      alert(getErrorMessage(submitError, "Không thể tạo bài giảng"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishToggle = async (lecture: Lecture) => {
    if (lecture.isPublished) {
      alert("Phiên bản hiện tại chỉ hỗ trợ xuất bản bài giảng.");
      return;
    }

    try {
      const response = await apiCall(`/api/lectures/${lecture._id}/publish`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Xuất bản thất bại");
      }

      setLectures((prev) =>
        prev.map((item) =>
          item._id === lecture._id ? { ...item, isPublished: true } : item,
        ),
      );
    } catch (publishError) {
      alert(getErrorMessage(publishError, "Không thể xuất bản bài giảng"));
    }
  };

  const handleDownloadFile = (
    lectureId: string,
    filename: string,
    originalName: string,
  ) => {
    const token = localStorage.getItem("token");
    const url = getApiUrl(`/api/lectures/${lectureId}/files/${filename}`);

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
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
        alert("Không thể tải file.");
      });
  };

  const filteredLectures = lectures.filter((lecture) => {
    const matchesSearch = lecture.title
      .toLowerCase()
      .includes(searchText.toLowerCase());

    if (!matchesSearch) {
      return false;
    }

    if (!isTeacher) {
      return true;
    }

    if (filterStatus === "published") {
      return lecture.isPublished;
    }

    if (filterStatus === "draft") {
      return !lecture.isPublished;
    }

    return true;
  });

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
      {isTeacher ? (
        <>
          <div className="lectures-header-main">
            <div className="lectures-title-section">
              <h1 className="title">Bài giảng</h1>
              <p className="subtitle">
                Quản lý và xuất bản tài liệu bài giảng
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
            >
              + Tạo bài giảng
            </button>
          </div>

          <div className="lectures-controls">
            <div className="filter-tabs">
              <button
                className={filterStatus === "all" ? "active" : ""}
                onClick={() => setFilterStatus("all")}
              >
                Tất cả
              </button>
              <button
                className={filterStatus === "published" ? "active" : ""}
                onClick={() => setFilterStatus("published")}
              >
                Đã xuất bản
              </button>
              <button
                className={filterStatus === "draft" ? "active" : ""}
                onClick={() => setFilterStatus("draft")}
              >
                Bản nháp
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="student-lectures-header">
          <h1 className="title">Bài giảng</h1>
          <p className="subtitle">Truy cập và tải về tài liệu bài giảng</p>
        </div>
      )}

      <div className="student-lectures-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Tìm kiếm bài giảng..."
            className="search-input"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
      </div>

      {error && <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>}

      {filteredLectures.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📖</div>
          <h3>Chưa có bài giảng nào</h3>
        </div>
      ) : (
        <div className={isTeacher ? "lectures-grid" : "student-lectures-grid"}>
          {filteredLectures.map((lecture) => (
            <div
              key={lecture._id}
              className={isTeacher ? "lecture-card" : "student-lecture-card"}
            >
              <div className="lecture-content">
                <div className="lecture-header">
                  <h3>{lecture.title}</h3>
                  {isTeacher && (
                    <span
                      className={`status-badge ${lecture.isPublished ? "published" : "draft"}`}
                    >
                      {lecture.isPublished ? "Đã xuất bản" : "Bản nháp"}
                    </span>
                  )}
                </div>

                <div className="lecture-meta">
                  <span>📚 {lecture.class?.name}</span>
                  <span>
                    📅 {new Date(lecture.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                  <span>📁 {lecture.files.length} tài liệu</span>
                  {!isTeacher && lecture.teacher && (
                    <span>👨‍🏫 {lecture.teacher.name}</span>
                  )}
                </div>

                {lecture.content && (
                  <div className="lecture-description">
                    <p>{lecture.content}</p>
                  </div>
                )}

                {lecture.videoUrl && (
                  <a href={lecture.videoUrl} target="_blank" rel="noreferrer">
                    🎥 Xem video
                  </a>
                )}

                <div className="lecture-actions">
                  <button
                    className="btn-outline"
                    onClick={() => {
                      setSelectedLecture(lecture);
                      setShowViewModal(true);
                    }}
                  >
                    Xem
                  </button>
                  {isTeacher && !lecture.isPublished && (
                    <button
                      className="btn-primary"
                      onClick={() => void handlePublishToggle(lecture)}
                    >
                      Xuất bản
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showViewModal && selectedLecture && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedLecture.title}</h2>
              <button
                className="modal-close"
                onClick={() => setShowViewModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>{selectedLecture.content}</p>
              <div className="files-list">
                {selectedLecture.files.map((file) => (
                  <div key={file.filename} className="file-detail-item">
                    <div className="file-details">
                      <h5>{file.originalName}</h5>
                      <p>{formatSize(file.size)}</p>
                    </div>
                    <button
                      className="btn-sm"
                      onClick={() =>
                        handleDownloadFile(
                          selectedLecture._id,
                          file.filename,
                          file.originalName,
                        )
                      }
                    >
                      Tải về
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tạo bài giảng mới</h2>
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
                  value={formTitle}
                  onChange={(event) => setFormTitle(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Lớp học</label>
                <select
                  value={formClassId}
                  onChange={(event) => setFormClassId(event.target.value)}
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
                <label>Nội dung</label>
                <textarea
                  rows={5}
                  value={formContent}
                  onChange={(event) => setFormContent(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Video URL</label>
                <input
                  type="text"
                  value={formVideoUrl}
                  onChange={(event) => setFormVideoUrl(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Tài liệu</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(event) => setFormFiles(event.target.files)}
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
                  onClick={() => void handleCreateLecture(false)}
                >
                  Lưu nháp
                </button>
                <button
                  className="btn-primary"
                  disabled={submitting}
                  onClick={() => void handleCreateLecture(true)}
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
