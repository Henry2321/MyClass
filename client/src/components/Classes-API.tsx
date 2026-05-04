import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import VideoMeeting from "./VideoMeeting";
import { getApiUrl } from "../utils/api";
import * as XLSX from "xlsx";

interface Class {
  _id: string;
  name: string;
  code: string;
  description?: string;
  teacher: {
    _id: string;
    name: string;
    email: string;
  };
  students: any[];
  createdAt: string;
}

interface ClassDetailModalProps {
  classData: Class;
  onClose: () => void;
}

function ClassDetailModal({ classData, onClose }: ClassDetailModalProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          getApiUrl(`/api/students/class/${classData._id}`),
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setStudents(data);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [classData._id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📚 {classData.name}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div
            className="class-detail-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: "20px",
            }}
          >
            <div
              className="class-detail-info"
              style={{
                padding: "20px",
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
              }}
            >
              <h4 style={{ marginBottom: "15px", color: "#1e293b" }}>
                Thông tin chi tiết
              </h4>
              <p style={{ marginBottom: "10px" }}>
                <strong>Mã lớp:</strong>{" "}
                <span style={{ color: "#4ade80", fontWeight: "bold" }}>
                  {classData.code}
                </span>
              </p>
              <p style={{ marginBottom: "10px" }}>
                <strong>Giáo viên:</strong> 👨🏫 {classData.teacher.name}
              </p>
              <p style={{ marginBottom: "10px" }}>
                <strong>Số sinh viên:</strong> 👥 {students.length}
              </p>
              <p style={{ marginBottom: "10px" }}>
                <strong>Mô tả:</strong>{" "}
                {classData.description || "Chưa có mô tả"}
              </p>
              <p>
                <strong>Ngày tạo:</strong> 📅{" "}
                {new Date(classData.createdAt).toLocaleDateString("vi-VN")}
              </p>
            </div>

            <div
              className="class-students-list"
              style={{
                padding: "20px",
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
              }}
            >
              <h4 style={{ marginBottom: "15px", color: "#1e293b" }}>
                Danh sách sinh viên trong lớp
              </h4>
              {loading ? (
                <p>Đang tải danh sách...</p>
              ) : students.length === 0 ? (
                <p style={{ color: "#64748b", fontStyle: "italic" }}>
                  Chưa có sinh viên nào trong lớp này. Vui lòng sử dụng tính
                  năng "Quản lý" để Import danh sách Excel.
                </p>
              ) : (
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: "2px solid #e2e8f0",
                          textAlign: "left",
                        }}
                      >
                        <th style={{ padding: "10px" }}>Tên</th>
                        <th style={{ padding: "10px" }}>MSSV</th>
                        <th style={{ padding: "10px", textAlign: "center" }}>
                          Điểm danh
                        </th>
                        <th style={{ padding: "10px", textAlign: "center" }}>
                          Số lần thoát
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => (
                        <tr
                          key={index}
                          style={{ borderBottom: "1px solid #e2e8f0" }}
                        >
                          <td style={{ padding: "10px" }}>{student.name}</td>
                          <td style={{ padding: "10px" }}>
                            {student.mssv || "---"}
                          </td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            {student.isPresent ? (
                              <span
                                style={{ color: "#22c55e", fontSize: "20px" }}
                              >
                                ✅
                              </span>
                            ) : (
                              <span
                                style={{ color: "#cbd5e1", fontSize: "20px" }}
                              >
                                ➖
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                backgroundColor:
                                  student.leaveCount > 2
                                    ? "#fee2e2"
                                    : "#f1f5f9",
                                color:
                                  student.leaveCount > 2
                                    ? "#ef4444"
                                    : "#64748b",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              {student.leaveCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ClassManageModalProps {
  classData: Class;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function ClassManageModal({
  classData,
  onClose,
  onDelete,
}: ClassManageModalProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showAttendanceReport, setShowAttendanceReport] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const handleAction = (action: string) => {
    setActiveAction(action);
    setTimeout(() => {
      alert(`Đã thực hiện: ${action}`);
      setActiveAction(null);
    }, 1000);
  };

  const fetchAttendanceReport = async () => {
    setLoadingReport(true);
    setShowAttendanceReport(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        getApiUrl(`/api/students/class/${classData._id}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setAttendanceData(data);
      }
    } catch (error) {
      console.error("Error fetching attendance report:", error);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleImportStudents = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.csv,.txt";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        let studentsData: { name: string; mssv: string }[] = [];
        const fileName = file.name.toLowerCase();

        try {
          if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
            }) as any[][];

            jsonData.forEach((row) => {
              if (Array.isArray(row) && row.length >= 2) {
                let mssv = "";
                let name = "";

                row.forEach((cell) => {
                  const cellStr = String(cell).trim();
                  // Tìm MSSV (dãy số 5-15 ký tự)
                  if (/^\d{5,15}$/.test(cellStr)) {
                    mssv = cellStr;
                  }
                  // Tìm Tên (chuỗi chữ, không phải số, dài hơn 2 ký tự)
                  else if (
                    cellStr.length > 2 &&
                    /[a-zA-ZÀ-ỹ]/.test(cellStr) &&
                    !cellStr.includes("@")
                  ) {
                    name = cellStr;
                  }
                });

                if (mssv) {
                  studentsData.push({
                    mssv,
                    name: name || `Sinh viên ${mssv}`,
                  });
                }
              }
            });
          } else {
            const text = new TextDecoder().decode(
              event.target?.result as ArrayBuffer,
            );
            const lines = text.split(/[\n\r]+/);
            lines.forEach((line) => {
              const parts = line.split(/[,|\t]+/).map((p) => p.trim());
              if (parts.length >= 2) {
                const mssv = parts.find((p) => /^\d{5,15}$/.test(p));
                const name = parts.find(
                  (p) => p.length > 2 && /[a-zA-ZÀ-ỹ]/.test(p) && p !== mssv,
                );
                if (mssv) {
                  studentsData.push({
                    mssv,
                    name: name || `Sinh viên ${mssv}`,
                  });
                }
              }
            });
          }

          if (studentsData.length === 0) {
            alert(
              "Không tìm thấy dữ liệu sinh viên hợp lệ. Vui lòng đảm bảo file có cột MSSV và Tên.",
            );
            return;
          }

          const token = localStorage.getItem("token");
          const res = await fetch(
            getApiUrl(`/api/classes/${classData._id}/import-students`),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ students: studentsData }),
            },
          );

          const data = await res.json();
          if (res.ok) {
            alert(data.message);
            // Tự động mở Báo cáo điểm danh để xem danh sách mới upload
            fetchAttendanceReport();
          } else {
            alert(data.message || "Có lỗi xảy ra khi import.");
          }
        } catch (error) {
          console.error("Import error:", error);
          alert("Lỗi khi xử lý file hoặc kết nối server.");
        }
      };

      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

  const handleDelete = () => {
    if (confirm("Bạn có chắc muốn xóa lớp học này?")) {
      onDelete(classData._id);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Quản lý {classData.name}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="manage-actions">
            <button
              className={`manage-btn ${activeAction === "lecture" ? "loading" : ""}`}
              onClick={() => handleAction("Tạo bài giảng mới")}
              disabled={activeAction !== null}
            >
              📝 Tạo bài giảng mới
            </button>
            <button
              className={`manage-btn ${activeAction === "assignment" ? "loading" : ""}`}
              onClick={() => handleAction("Tạo bài tập mới")}
              disabled={activeAction !== null}
            >
              📋 Tạo bài tập mới
            </button>
            <button
              className={`manage-btn ${activeAction === "students" ? "loading" : ""}`}
              onClick={handleImportStudents}
              disabled={activeAction !== null}
            >
              👥 Import danh sách SV
            </button>
            <button
              className={`manage-btn ${activeAction === "report" ? "loading" : ""}`}
              onClick={fetchAttendanceReport}
              disabled={activeAction !== null}
            >
              📊 Báo cáo điểm danh
            </button>
            <button
              className="manage-btn danger"
              onClick={handleDelete}
              disabled={activeAction !== null}
            >
              🗑️ Xóa lớp học
            </button>
          </div>

          {showAttendanceReport && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px",
                }}
              >
                <h4 style={{ color: "#1e293b" }}>📋 Danh sách & Báo cáo AI</h4>
                <button
                  onClick={() => setShowAttendanceReport(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  Đóng x
                </button>
              </div>

              {loadingReport ? (
                <p>Đang tải dữ liệu...</p>
              ) : attendanceData.length === 0 ? (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    fontStyle: "italic",
                  }}
                >
                  Chưa có sinh viên nào trong danh sách lớp.
                </p>
              ) : (
                <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                          textAlign: "left",
                          color: "#64748b",
                        }}
                      >
                        <th style={{ padding: "8px" }}>Tên SV</th>
                        <th style={{ padding: "8px", textAlign: "center" }}>
                          MSSV
                        </th>
                        <th style={{ padding: "8px", textAlign: "center" }}>
                          Điểm danh
                        </th>
                        <th style={{ padding: "8px", textAlign: "center" }}>
                          Số lần Out
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.map((s, idx) => (
                        <tr
                          key={idx}
                          style={{ borderBottom: "1px solid #f1f5f9" }}
                        >
                          <td style={{ padding: "8px" }}>
                            <div>{s.name}</div>
                          </td>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            {s.mssv || "---"}
                          </td>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            {s.isPresent ? (
                              <span title="Đã điểm danh">✅</span>
                            ) : (
                              <span title="Vắng">➖</span>
                            )}
                          </td>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            <span
                              style={{
                                color: s.leaveCount > 2 ? "#ef4444" : "#64748b",
                                fontWeight:
                                  s.leaveCount > 2 ? "bold" : "normal",
                              }}
                            >
                              {s.leaveCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ClassesProps {
  onJoinClassroom?: (classId: string) => void;
}

export default function Classes({ onJoinClassroom }: ClassesProps) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [modalType, setModalType] = useState<"detail" | "manage" | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showVideoMeeting, setShowVideoMeeting] = useState(false);
  const [selectedClassForMeeting, setSelectedClassForMeeting] =
    useState<Class | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl("/api/classes"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const classData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl("/api/classes"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(classData),
      });

      if (response.ok) {
        const newClass = await response.json();
        setClasses([...classes, newClass]);
        setShowCreateForm(false);
        alert("Tạo lớp học thành công!");
      } else {
        const error = await response.json();
        alert(error.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      alert("Lỗi kết nối server");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinMeeting = (classData: Class) => {
    if (onJoinClassroom) {
      onJoinClassroom(classData._id);
    } else {
      setSelectedClassForMeeting(classData);
      setShowVideoMeeting(true);
    }
  };

  const handleLeaveMeeting = () => {
    setShowVideoMeeting(false);
    setSelectedClassForMeeting(null);
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const classCode = formData.get("code") as string;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl("/api/classes/join"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: classCode }),
      });

      const result = await response.clone().json();

      if (response.ok) {
        setShowJoinForm(false);
        await fetchClasses();
        alert("Tham gia lớp học thành công!");
        return;
      }

      if (result.message === "Already joined this class") {
        setShowJoinForm(false);
        await fetchClasses();
        alert("Bạn đã tham gia lớp này rồi.");
        return;
      }

      if (response.ok) {
        setShowJoinForm(false);
        alert("Tham gia lớp học thành công!");
        fetchClasses(); // Refresh danh sách lớp
      } else {
        const error = await response.json();
        alert(error.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      alert("Lỗi kết nối server");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl(`/api/classes/${classId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setClasses(classes.filter((c) => c._id !== classId));
        alert("Xóa lớp học thành công!");
      } else {
        const error = await response.json();
        alert(error.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      alert("Lỗi kết nối server");
    }
  };

  const handleViewDetail = (classData: Class) => {
    setSelectedClass(classData);
    setModalType("detail");
  };

  const handleManage = (classData: Class) => {
    setSelectedClass(classData);
    setModalType("manage");
  };

  const closeModal = () => {
    setSelectedClass(null);
    setModalType(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Đang tải danh sách lớp học...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="title">Lớp học 📚</h1>

      <div className="classes-header">
        {user?.role === "teacher" ? (
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            + Tạo lớp mới
          </button>
        ) : (
          <button className="btn-primary" onClick={() => setShowJoinForm(true)}>
            🎓 Tham gia lớp
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏫 Tạo lớp học mới</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="modal-body">
              <div className="form-group">
                <label>Tên lớp học</label>
                <input
                  name="name"
                  type="text"
                  placeholder="Nhập tên lớp học"
                  required
                />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  name="description"
                  placeholder="Mô tả về lớp học"
                  rows={3}
                ></textarea>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createLoading}
                >
                  {createLoading ? "Đang tạo..." : "Tạo lớp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinForm && (
        <div className="modal-overlay" onClick={() => setShowJoinForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎓 Tham gia lớp học</h2>
              <button
                className="modal-close"
                onClick={() => setShowJoinForm(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleJoinClass} className="modal-body">
              <div className="form-group">
                <label>Mã lớp học</label>
                <input
                  name="code"
                  type="text"
                  placeholder="Nhập mã lớp (VD: ABC123)"
                  required
                  style={{ textTransform: "uppercase" }}
                  maxLength={6}
                />
              </div>
              <div className="form-note">
                <p>
                  💡 <strong>Hướng dẫn:</strong>
                </p>
                <p>• Nhập mã lớp 6 ký tự do giáo viên cung cấp</p>
                <p>• Mã lớp không phân biệt chữ hoa/thường</p>
                <p>• Liên hệ giáo viên nếu không có mã lớp</p>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowJoinForm(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={joinLoading}
                >
                  {joinLoading ? "Đang tham gia..." : "Tham gia lớp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="classes-grid">
        {classes.map((cls) => (
          <div key={cls._id} className="class-card">
            <div className="class-header">
              <h3>{cls.name}</h3>
              <span className="class-code">{cls.code}</span>
            </div>
            <div className="class-info">
              <p>👨🏫 {cls.teacher.name}</p>
              <p>👥 {cls.students.length} sinh viên</p>
            </div>
            <div className="class-actions">
              <button
                className="btn-outline"
                onClick={() => handleViewDetail(cls)}
              >
                Xem chi tiết
              </button>
              <button
                className="btn-primary join-meeting"
                onClick={() => handleJoinMeeting(cls)}
              >
                🎥 Tham gia học
              </button>
              {user?.role === "teacher" && (
                <button
                  className="btn-outline"
                  onClick={() => handleManage(cls)}
                >
                  Quản lý
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {classes.length === 0 && (
        <div className="empty-state">
          <p>📚 Chưa có lớp học nào</p>
          {user?.role === "teacher" ? (
            <button
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Tạo lớp đầu tiên
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => setShowJoinForm(true)}
            >
              Tham gia lớp đầu tiên
            </button>
          )}
        </div>
      )}

      {modalType === "detail" && selectedClass && (
        <ClassDetailModal classData={selectedClass} onClose={closeModal} />
      )}

      {modalType === "manage" && selectedClass && (
        <ClassManageModal
          classData={selectedClass}
          onClose={closeModal}
          onDelete={handleDeleteClass}
        />
      )}

      {showVideoMeeting && selectedClassForMeeting && (
        <VideoMeeting
          classData={selectedClassForMeeting}
          onLeave={handleLeaveMeeting}
        />
      )}
    </>
  );
}
