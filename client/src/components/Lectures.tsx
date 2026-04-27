import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, getApiUrl } from '../utils/api';

interface LectureFile {
  _id: string;
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
  publishedAt?: string;
  createdAt: string;
}

interface MyClass {
  _id: string;
  name: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['ppt', 'pptx'].includes(ext || '')) return '📊';
  if (['doc', 'docx'].includes(ext || '')) return '📝';
  if (['zip', 'rar'].includes(ext || '')) return '📦';
  if (['mp4', 'avi', 'mov'].includes(ext || '')) return '🎥';
  return '📁';
};

export default function Lectures() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [classes, setClasses] = useState<MyClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

  // Create/Edit form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formFiles, setFormFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const fetchLectures = async () => {
    try {
      setError('');
      const res = await apiCall('/api/lectures');
      if (!res.ok) throw new Error('Không thể tải bài giảng');
      const data = await res.json();
      setLectures(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await apiCall('/api/classes');
      if (!res.ok) return;
      const data = await res.json();
      setClasses(data);
    } catch {}
  };

  useEffect(() => {
    fetchLectures();
    if (isTeacher) fetchClasses();
  }, []);

  const handleCreate = async (publish: boolean) => {
    if (!formTitle.trim() || !formClassId) {
      alert('Vui lòng nhập tiêu đề và chọn lớp học');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', formTitle.trim());
      fd.append('content', formContent.trim());
      fd.append('classId', formClassId);
      fd.append('videoUrl', formVideoUrl.trim());
      if (formFiles) {
        Array.from(formFiles).forEach(f => fd.append('files', f));
      }

      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl('/api/lectures'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Lỗi tạo bài giảng');
      }
      const created: Lecture = await res.json();

      if (publish) {
        await apiCall(`/api/lectures/${created._id}/publish`, { method: 'PATCH' });
        created.isPublished = true;
      }

      setLectures(prev => [created, ...prev]);
      setShowCreateModal(false);
      resetForm();
      alert(publish ? 'Bài giảng đã được tạo và xuất bản!' : 'Bài giảng đã lưu nháp!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (publish?: boolean) => {
    if (!selectedLecture) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', formTitle.trim());
      fd.append('content', formContent.trim());
      fd.append('videoUrl', formVideoUrl.trim());
      if (publish !== undefined) fd.append('isPublished', String(publish));
      if (editFileInputRef.current?.files?.length) {
        Array.from(editFileInputRef.current.files).forEach(f => fd.append('files', f));
      }

      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl(`/api/lectures/${selectedLecture._id}`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Lỗi cập nhật');
      }
      const updated: Lecture = await res.json();
      setLectures(prev => prev.map(l => l._id === updated._id ? updated : l));
      setShowEditModal(false);
      alert('Cập nhật thành công!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishToggle = async (lecture: Lecture) => {
    try {
      if (!lecture.isPublished) {
        const res = await apiCall(`/api/lectures/${lecture._id}/publish`, { method: 'PATCH' });
        if (!res.ok) throw new Error('Lỗi xuất bản');
        setLectures(prev => prev.map(l => l._id === lecture._id ? { ...l, isPublished: true } : l));
        alert('Đã xuất bản!');
      } else {
        const token = localStorage.getItem('token');
        const fd = new FormData();
        fd.append('isPublished', 'false');
        const res = await fetch(getApiUrl(`/api/lectures/${lecture._id}`), {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) throw new Error('Lỗi');
        setLectures(prev => prev.map(l => l._id === lecture._id ? { ...l, isPublished: false } : l));
        alert('Đã chuyển về bản nháp!');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (lecture: Lecture) => {
    if (!confirm(`Xóa bài giảng "${lecture.title}"?`)) return;
    try {
      const res = await apiCall(`/api/lectures/${lecture._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Lỗi xóa');
      setLectures(prev => prev.filter(l => l._id !== lecture._id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDownloadFile = (lectureId: string, filename: string, originalName: string) => {
    const token = localStorage.getItem('token');
    const url = getApiUrl(`/api/lectures/${lectureId}/files/${filename}`);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('File không tồn tại');
        return res.blob();
      })
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = originalName;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert('Không thể tải file. File có thể chưa được upload lên server.'));
  };

  const openEdit = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setFormTitle(lecture.title);
    setFormContent(lecture.content || '');
    setFormVideoUrl(lecture.videoUrl || '');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormClassId('');
    setFormVideoUrl('');
    setFormFiles(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredLectures = lectures.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(searchText.toLowerCase());
    if (isTeacher) {
      if (filterStatus === 'published') return l.isPublished && matchSearch;
      if (filterStatus === 'draft') return !l.isPublished && matchSearch;
      return matchSearch;
    }
    return matchSearch;
  });

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div><p>Đang tải...</p></div>;

  return (
    <>
      {isTeacher ? (
        <>
          <div className="lectures-header-main">
            <div className="lectures-title-section">
              <h1 className="title">Bài giảng 📖</h1>
              <p className="subtitle">Quản lý và chia sẻ tài liệu bài giảng</p>
            </div>
            <button className="btn-primary" onClick={() => { resetForm(); setShowCreateModal(true); }}>
              + Tạo bài giảng
            </button>
          </div>

          {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}

          <div className="lectures-controls">
            <div className="filter-tabs">
              {['all', 'published', 'draft'].map(s => (
                <button key={s} className={`tab ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                  {s === 'all' ? `Tất cả (${lectures.length})` : s === 'published' ? `Đã xuất bản (${lectures.filter(l => l.isPublished).length})` : `Bản nháp (${lectures.filter(l => !l.isPublished).length})`}
                </button>
              ))}
            </div>
          </div>

          {filteredLectures.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📖</div>
              <h3>Chưa có bài giảng nào</h3>
              <button className="btn-primary" onClick={() => { resetForm(); setShowCreateModal(true); }}>+ Tạo bài giảng đầu tiên</button>
            </div>
          ) : (
            <div className="lectures-grid">
              {filteredLectures.map(lecture => (
                <div key={lecture._id} className="lecture-card">
                  <div className="lecture-header">
                    <h3>{lecture.title}</h3>
                    <span className={`status-badge ${lecture.isPublished ? 'published' : 'draft'}`}>
                      {lecture.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                    </span>
                  </div>
                  <div className="lecture-meta">
                    <span>📚 {lecture.class?.name}</span>
                    <span>📅 {new Date(lecture.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span>📁 {lecture.files.length} tài liệu</span>
                  </div>
                  {lecture.content && <div className="lecture-description"><p>{lecture.content}</p></div>}
                  {lecture.videoUrl && (
                    <div style={{ marginBottom: 8 }}>
                      <a href={lecture.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#4ade80', fontSize: 13 }}>🎥 Xem video</a>
                    </div>
                  )}
                  <div className="lecture-files">
                    {lecture.files.slice(0, 3).map(f => (
                      <div key={f._id} className="file-item">
                        <span>{getFileIcon(f.originalName)}</span>
                        <span className="file-name">{f.originalName}</span>
                        <span className="file-size">{formatSize(f.size)}</span>
                      </div>
                    ))}
                    {lecture.files.length > 3 && <div className="more-files">+{lecture.files.length - 3} file khác</div>}
                  </div>
                  <div className="lecture-actions">
                    <button className="btn-outline" onClick={() => { setSelectedLecture(lecture); setShowViewModal(true); }}>Xem</button>
                    <button className="btn-outline" onClick={() => openEdit(lecture)}>Chỉnh sửa</button>
                    <button className="btn-primary" onClick={() => handlePublishToggle(lecture)}>
                      {lecture.isPublished ? 'Về nháp' : 'Xuất bản'}
                    </button>
                    <button className="btn-outline" style={{ color: '#ef4444' }} onClick={() => handleDelete(lecture)}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="student-lectures-header">
            <h1 className="title">Bài giảng 📖</h1>
            <p className="subtitle">Truy cập và tải về tài liệu bài giảng</p>
          </div>

          <div className="student-lectures-controls">
            <div className="search-bar">
              <input type="text" placeholder="Tìm kiếm bài giảng..." className="search-input"
                value={searchText} onChange={e => setSearchText(e.target.value)} />
            </div>
          </div>

          {error && <div style={{ color: '#ef4444', margin: '12px 0' }}>{error}</div>}

          {filteredLectures.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📖</div>
              <h3>Chưa có bài giảng nào</h3>
              <p>Bài giảng sẽ xuất hiện khi giáo viên xuất bản</p>
            </div>
          ) : (
            <div className="student-lectures-grid">
              {filteredLectures.map(lecture => (
                <div key={lecture._id} className="student-lecture-card">
                  <div className="lecture-thumbnail"><div className="thumbnail-placeholder">📖</div></div>
                  <div className="lecture-content">
                    <div className="lecture-header">
                      <h3>{lecture.title}</h3>
                      <span className="lecture-class">📚 {lecture.class?.name}</span>
                    </div>
                    {lecture.content && <div className="lecture-description"><p>{lecture.content}</p></div>}
                    <div className="lecture-meta">
                      <span>📅 {new Date(lecture.createdAt).toLocaleDateString('vi-VN')}</span>
                      <span>📁 {lecture.files.length} tài liệu</span>
                      {lecture.teacher && <span>👨‍🏫 {lecture.teacher.name}</span>}
                    </div>
                    {lecture.videoUrl && (
                      <a href={lecture.videoUrl} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-block', marginBottom: 8, color: '#4ade80', fontSize: 13 }}>
                        🎥 Xem video bài giảng
                      </a>
                    )}
                    <div className="student-lecture-actions">
                      <button className="btn-primary" onClick={() => { setSelectedLecture(lecture); setShowViewModal(true); }}>
                        👁️ Xem tài liệu
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal Xem bài giảng */}
      {showViewModal && selectedLecture && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📖 {selectedLecture.title}</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <div className="detail-grid">
                  <div className="detail-item"><strong>Lớp:</strong> {selectedLecture.class?.name}</div>
                  <div className="detail-item"><strong>Ngày tạo:</strong> {new Date(selectedLecture.createdAt).toLocaleDateString('vi-VN')}</div>
                  {isTeacher && <div className="detail-item"><strong>Trạng thái:</strong> {selectedLecture.isPublished ? '✅ Đã xuất bản' : '📝 Bản nháp'}</div>}
                </div>
                {selectedLecture.content && (
                  <div style={{ marginTop: 12 }}>
                    <strong>Nội dung:</strong>
                    <p style={{ marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selectedLecture.content}</p>
                  </div>
                )}
                {selectedLecture.videoUrl && (
                  <div style={{ marginTop: 12 }}>
                    <strong>Video:</strong>{' '}
                    <a href={selectedLecture.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#4ade80' }}>
                      🎥 {selectedLecture.videoUrl}
                    </a>
                  </div>
                )}
              </div>

              <div className="detail-section" style={{ marginTop: 20 }}>
                <h4>📁 Tài liệu đính kèm ({selectedLecture.files.length})</h4>
                {selectedLecture.files.length === 0 ? (
                  <p style={{ color: '#94a3b8' }}>Không có tài liệu</p>
                ) : (
                  <div className="files-list">
                    {selectedLecture.files.map(f => (
                      <div key={f._id} className="file-detail-item">
                        <div className="file-info">
                          <span className="file-icon-large">{getFileIcon(f.originalName)}</span>
                          <div className="file-details">
                            <h5>{f.originalName}</h5>
                            <p>{formatSize(f.size)}</p>
                          </div>
                        </div>
                        <button className="btn-sm" onClick={() => handleDownloadFile(selectedLecture._id, f.filename, f.originalName)}>
                          📥 Tải về
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo bài giảng */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📖 Tạo bài giảng mới</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="create-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Tiêu đề bài giảng *</label>
                    <input type="text" placeholder="Nhập tiêu đề" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Lớp học *</label>
                    <select value={formClassId} onChange={e => setFormClassId(e.target.value)}>
                      <option value="">Chọn lớp học</option>
                      {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Nội dung bài giảng</label>
                  <textarea rows={5} placeholder="Mô tả nội dung bài giảng..." value={formContent} onChange={e => setFormContent(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Link video (YouTube, Drive...)</label>
                  <input type="url" placeholder="https://..." value={formVideoUrl} onChange={e => setFormVideoUrl(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Tài liệu đính kèm</label>
                  <div className="file-upload-area">
                    <input ref={fileInputRef} type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.rar,.mp4"
                      onChange={e => setFormFiles(e.target.files)} />
                    <p className="file-upload-note">PDF, PowerPoint, Word, Archive, Video (tối đa 50MB/file)</p>
                  </div>
                  {formFiles && Array.from(formFiles).map((f, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                      {getFileIcon(f.name)} {f.name} ({formatSize(f.size)})
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button className="btn-outline" disabled={submitting} onClick={() => handleCreate(false)}>
                  {submitting ? 'Đang lưu...' : 'Lưu nháp'}
                </button>
                <button className="btn-primary" disabled={submitting} onClick={() => handleCreate(true)}>
                  {submitting ? 'Đang tạo...' : '🚀 Tạo & Xuất bản'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa */}
      {showEditModal && selectedLecture && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Chỉnh sửa bài giảng</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="create-form">
                <div className="form-group">
                  <label>Tiêu đề</label>
                  <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Nội dung</label>
                  <textarea rows={5} value={formContent} onChange={e => setFormContent(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Link video</label>
                  <input type="url" value={formVideoUrl} onChange={e => setFormVideoUrl(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Tài liệu hiện tại</label>
                  {selectedLecture.files.map(f => (
                    <div key={f._id} style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
                      {getFileIcon(f.originalName)} {f.originalName} ({formatSize(f.size)})
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label>Thêm tài liệu mới</label>
                  <input ref={editFileInputRef} type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.rar,.mp4" />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Hủy</button>
                <button className="btn-outline" disabled={submitting} onClick={() => handleUpdate(false)}>Lưu nháp</button>
                <button className="btn-primary" disabled={submitting} onClick={() => handleUpdate(true)}>
                  {submitting ? 'Đang lưu...' : 'Cập nhật & Xuất bản'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
