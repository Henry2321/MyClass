import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LectureFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
}

interface Lecture {
  id: number;
  title: string;
  class: string;
  date: string;
  duration: string;
  status: 'published' | 'draft';
  description?: string;
  files: LectureFile[];
  views: number;
  downloads: number;
}

export default function Lectures() {
  const { user } = useAuth();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [lecturesList, setLecturesList] = useState<Lecture[]>([
    { 
      id: 1, 
      title: 'Giới thiệu React Hooks', 
      class: 'React Nâng cao',
      date: '2024-03-10',
      duration: '45 phút',
      status: 'published',
      description: 'Tìm hiểu về useState, useEffect và các hooks cơ bản trong React',
      views: 156,
      downloads: 23,
      files: [
        { id: '1', name: 'React-Hooks-Slides.pptx', type: 'PowerPoint', size: '2.5 MB', uploadDate: '2024-03-10' },
        { id: '2', name: 'React-Hooks-Examples.zip', type: 'Archive', size: '1.2 MB', uploadDate: '2024-03-10' },
        { id: '3', name: 'React-Hooks-Notes.pdf', type: 'PDF', size: '850 KB', uploadDate: '2024-03-10' }
      ]
    },
    { 
      id: 2, 
      title: 'State Management với Redux', 
      class: 'React Nâng cao',
      date: '2024-03-12',
      duration: '60 phút',
      status: 'draft',
      description: 'Quản lý state phức tạp với Redux Toolkit',
      views: 0,
      downloads: 0,
      files: [
        { id: '4', name: 'Redux-Basics.pptx', type: 'PowerPoint', size: '3.1 MB', uploadDate: '2024-03-12' },
        { id: '5', name: 'Redux-Project.zip', type: 'Archive', size: '5.2 MB', uploadDate: '2024-03-12' }
      ]
    },
    { 
      id: 3, 
      title: 'API Integration', 
      class: 'Node.js Backend',
      date: '2024-03-15',
      duration: '50 phút',
      status: 'published',
      description: 'Tích hợp API RESTful và xử lý dữ liệu',
      views: 89,
      downloads: 15,
      files: [
        { id: '6', name: 'API-Integration.pdf', type: 'PDF', size: '1.8 MB', uploadDate: '2024-03-15' },
        { id: '7', name: 'API-Examples.js', type: 'JavaScript', size: '45 KB', uploadDate: '2024-03-15' }
      ]
    }
  ]);

  const handlePublishLecture = (lectureId: number) => {
    if (confirm('Bạn có chắc muốn xuất bản bài giảng này?')) {
      setLecturesList(prev => prev.map(lecture => 
        lecture.id === lectureId 
          ? { ...lecture, status: 'published' as const }
          : lecture
      ));
      alert('Bài giảng đã được xuất bản thành công!');
    }
  };

  const handleUnpublishLecture = (lectureId: number) => {
    if (confirm('Bạn có chắc muốn chuyển bài giảng về bản nháp?')) {
      setLecturesList(prev => prev.map(lecture => 
        lecture.id === lectureId 
          ? { ...lecture, status: 'draft' as const }
          : lecture
      ));
      alert('Bài giảng đã chuyển về bản nháp!');
    }
  };

  const handleQuickAction = (action: string) => {
    setShowQuickActions(false);
    
    switch(action) {
      case 'create-lecture':
        setShowCreateModal(true);
        break;
      case 'upload-files':
        document.getElementById('file-upload')?.click();
        break;
      case 'view-analytics':
        alert('Chức năng phân tích đang được phát triển');
        break;
      case 'export-data':
        alert('Chức năng xuất dữ liệu đang được phát triển');
        break;
      case 'settings':
        alert('Chức năng cài đặt đang được phát triển');
        break;
    }
  };

  const handleViewLecture = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setShowViewModal(true);
  };

  const handleEditLecture = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setShowEditModal(true);
  };

  const getFileIcon = (type: string) => {
    switch(type.toLowerCase()) {
      case 'pdf': return '📄';
      case 'powerpoint': return '📊';
      case 'word': return '📝';
      case 'archive': return '📦';
      case 'javascript': return '💻';
      case 'video': return '🎥';
      default: return '📁';
    }
  };

  const filteredLectures = lecturesList.filter(lecture => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'published') return lecture.status === 'published';
    if (filterStatus === 'draft') return lecture.status === 'draft';
    return true;
  });

  return (
    <>
      {user?.role === 'teacher' ? (
        // Giao diện cho giáo viên
        <>
          <div className="lectures-header-main">
            <div className="lectures-title-section">
              <h1 className="title">Bài giảng 📖</h1>
              <p className="subtitle">Quản lý và chia sẻ tài liệu bài giảng</p>
            </div>
            
            <div className="header-actions">
              <button 
                className="quick-action-btn"
                onClick={() => setShowQuickActions(!showQuickActions)}
              >
                ⚡ Thao tác nhanh
              </button>
              {showQuickActions && (
                <div className="quick-actions-dropdown">
                  <button onClick={() => handleQuickAction('create-lecture')}>➕ Tạo bài giảng mới</button>
                  <button onClick={() => handleQuickAction('upload-files')}>📁 Upload tài liệu</button>
                  <button onClick={() => handleQuickAction('view-analytics')}>📊 Xem thống kê</button>
                  <button onClick={() => handleQuickAction('export-data')}>📤 Xuất dữ liệu</button>
                  <button onClick={() => handleQuickAction('settings')}>⚙️ Cài đặt</button>
                </div>
              )}
            </div>
          </div>
          
          <div className="lectures-controls">
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ Tạo bài giảng</button>
            <input type="file" id="file-upload" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.rar" style={{display: 'none'}} />
            <div className="filter-tabs">
              <button 
                className={`tab ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                Tất cả ({lecturesList.length})
              </button>
              <button 
                className={`tab ${filterStatus === 'published' ? 'active' : ''}`}
                onClick={() => setFilterStatus('published')}
              >
                Đã xuất bản ({lecturesList.filter(l => l.status === 'published').length})
              </button>
              <button 
                className={`tab ${filterStatus === 'draft' ? 'active' : ''}`}
                onClick={() => setFilterStatus('draft')}
              >
                Bản nháp ({lecturesList.filter(l => l.status === 'draft').length})
              </button>
            </div>
          </div>

          <div className="lectures-grid">
            {filteredLectures.map(lecture => (
              <div key={lecture.id} className="lecture-card">
                <div className="lecture-header">
                  <h3>{lecture.title}</h3>
                  <span className={`status-badge ${lecture.status}`}>
                    {lecture.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                  </span>
                </div>
                
                <div className="lecture-meta">
                  <div className="meta-item">
                    <span>{lecture.class}</span>
                  </div>
                  <div className="meta-item">
                    <span>{lecture.date}</span>
                  </div>
                  <div className="meta-item">
                    <span>⏱️ {lecture.duration}</span>
                  </div>
                </div>

                <div className="lecture-description">
                  <p>{lecture.description}</p>
                </div>

                <div className="lecture-files">
                  <h4>Tài liệu ({lecture.files.length})</h4>
                  <div className="files-preview">
                    {lecture.files.slice(0, 3).map(file => (
                      <div key={file.id} className="file-item">
                        <span className="file-icon">{getFileIcon(file.type)}</span>
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{file.size}</span>
                      </div>
                    ))}
                    {lecture.files.length > 3 && (
                      <div className="more-files">+{lecture.files.length - 3} file khác</div>
                    )}
                  </div>
                </div>

                <div className="lecture-stats">
                  <div className="stat-item">
                    <span>{lecture.views} lượt xem</span>
                  </div>
                  <div className="stat-item">
                    <span>{lecture.downloads} lượt tải</span>
                  </div>
                </div>

                <div className="lecture-actions">
                  <button 
                    className="btn-outline"
                    onClick={() => handleViewLecture(lecture)}
                  >
                    Xem
                  </button>
                  <button 
                    className="btn-outline"
                    onClick={() => handleEditLecture(lecture)}
                  >
                    Chỉnh sửa
                  </button>
                  {lecture.status === 'draft' ? (
                    <button 
                      className="btn-primary"
                      onClick={() => handlePublishLecture(lecture.id)}
                    >
                      Xuất bản
                    </button>
                  ) : (
                    <button 
                      className="btn-outline"
                      onClick={() => handleUnpublishLecture(lecture.id)}
                    >
                      Chuyển về nháp
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        // Giao diện cho sinh viên
        <>
          <div className="student-lectures-header">
            <div className="lectures-title-section">
              <h1 className="title">Bài giảng 📖</h1>
              <p className="subtitle">Truy cập và tải về tài liệu bài giảng</p>
            </div>
          </div>
          
          <div className="student-lectures-controls">
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Tìm kiếm bài giảng..."
                className="search-input"
              />
              <button className="search-btn">🔍</button>
            </div>
            <div className="filter-tabs">
              <button 
                className={`tab ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                Tất cả ({lecturesList.filter(l => l.status === 'published').length})
              </button>
              <button 
                className={`tab ${filterStatus === 'recent' ? 'active' : ''}`}
                onClick={() => setFilterStatus('recent')}
              >
                Gần đây
              </button>
              <button 
                className={`tab ${filterStatus === 'downloaded' ? 'active' : ''}`}
                onClick={() => setFilterStatus('downloaded')}
              >
                Đã tải
              </button>
            </div>
          </div>

          <div className="student-lectures-grid">
            {lecturesList.filter(l => l.status === 'published').map(lecture => (
              <div key={lecture.id} className="student-lecture-card">
                <div className="lecture-thumbnail">
                  <div className="thumbnail-placeholder">
                    📖
                  </div>
                </div>
                
                <div className="lecture-content">
                  <div className="lecture-header">
                    <h3>{lecture.title}</h3>
                    <span className="lecture-class">📚 {lecture.class}</span>
                  </div>
                  
                  <div className="lecture-description">
                    <p>{lecture.description}</p>
                  </div>
                  
                  <div className="lecture-meta">
                    <span>📅 {lecture.date}</span>
                    <span>📁 {lecture.files.length} tài liệu</span>
                    <span>👁️ {lecture.views} lượt xem</span>
                  </div>
                  
                  <div className="student-lecture-actions">
                    <button 
                      className="btn-primary"
                      onClick={() => {
                        // Tăng lượt xem
                        setLecturesList(prev => prev.map(l => 
                          l.id === lecture.id ? { ...l, views: l.views + 1 } : l
                        ));
                        handleViewLecture(lecture);
                      }}
                    >
                      👁️ Xem bài giảng
                    </button>
                    <button 
                      className="btn-outline"
                      onClick={() => {
                        // Tăng lượt tải
                        setLecturesList(prev => prev.map(l => 
                          l.id === lecture.id ? { ...l, downloads: l.downloads + 1 } : l
                        ));
                        alert(`Đang tải tài liệu bài giảng: ${lecture.title}\n\nFile bao gồm: ${lecture.files.map(f => f.name).join(', ')}`);
                      }}
                    >
                      📥 Tải tài liệu
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {filteredLectures.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📖</div>
          <h3>Chưa có bài giảng nào</h3>
          <p>Tạo bài giảng đầu tiên để bắt đầu chia sẻ kiến thức</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Tạo bài giảng đầu tiên
          </button>
        </div>
      )}

      {/* Modal Xem bài giảng */}
      {showViewModal && selectedLecture && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👁️ {selectedLecture.title}</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="lecture-details">
                <div className="detail-section">
                  <h4>📋 Thông tin bài giảng</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <strong>Lớp học:</strong> {selectedLecture.class}
                    </div>
                    <div className="detail-item">
                      <strong>Ngày tạo:</strong> {selectedLecture.date}
                    </div>
                    <div className="detail-item">
                      <strong>Thời lượng:</strong> {selectedLecture.duration}
                    </div>
                    <div className="detail-item">
                      <strong>Trạng thái:</strong> 
                      <span className={`status-badge ${selectedLecture.status}`}>
                        {selectedLecture.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                      </span>
                    </div>
                  </div>
                  <div className="description-section">
                    <strong>Mô tả:</strong>
                    <p>{selectedLecture.description}</p>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>📁 Tài liệu đính kèm ({selectedLecture.files.length})</h4>
                  <div className="files-list">
                    {selectedLecture.files.map(file => (
                      <div key={file.id} className="file-detail-item">
                        <div className="file-info">
                          <span className="file-icon-large">{getFileIcon(file.type)}</span>
                          <div className="file-details">
                            <h5>{file.name}</h5>
                            <p>{file.type} • {file.size} • Tải lên {file.uploadDate}</p>
                          </div>
                        </div>
                        <div className="file-actions">
                          <button className="btn-sm">👁️ Xem</button>
                          <button className="btn-sm">📥 Tải về</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>📊 Thống kê</h4>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-number">{selectedLecture.views}</div>
                      <div className="stat-label">Lượt xem</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{selectedLecture.downloads}</div>
                      <div className="stat-label">Lượt tải</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{selectedLecture.files.length}</div>
                      <div className="stat-label">Tài liệu</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa bài giảng */}
      {showEditModal && selectedLecture && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Chỉnh sửa bài giảng</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Tiêu đề bài giảng</label>
                    <input type="text" defaultValue={selectedLecture.title} />
                  </div>
                  <div className="form-group">
                    <label>Lớp học</label>
                    <select defaultValue={selectedLecture.class}>
                      <option>React Nâng cao</option>
                      <option>Node.js Backend</option>
                      <option>CNTT01</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ngày tạo</label>
                    <input type="date" defaultValue={selectedLecture.date} />
                  </div>
                  <div className="form-group">
                    <label>Thời lượng (phút)</label>
                    <input type="number" defaultValue={parseInt(selectedLecture.duration)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Mô tả</label>
                  <textarea defaultValue={selectedLecture.description} rows={4}></textarea>
                </div>
                <div className="form-group">
                  <label>Tài liệu hiện tại</label>
                  <div className="current-files">
                    {selectedLecture.files.map(file => (
                      <div key={file.id} className="current-file-item">
                        <span className="file-icon">{getFileIcon(file.type)}</span>
                        <span className="file-name">{file.name}</span>
                        <button className="btn-sm danger">🗑️ Xóa</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Thêm tài liệu mới</label>
                  <div className="file-upload-area">
                    <input type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.rar" />
                    <div className="file-upload-label">
                      Chọn tập tin hoặc kéo thả vào đây
                    </div>
                    <p className="file-upload-note">Hỗ trợ: PDF, PowerPoint, Word, Archive (Tối đa 50MB)</p>
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Hủy</button>
                <button className="btn-outline" onClick={() => {
                  if (selectedLecture) {
                    const updatedLecture = {
                      ...selectedLecture,
                      status: 'draft' as const
                    };
                    setLecturesList(prev => prev.map(lecture => 
                      lecture.id === selectedLecture.id ? updatedLecture : lecture
                    ));
                    setShowEditModal(false);
                    alert('Bài giảng đã được lưu nháp!');
                  }
                }}>Lưu nháp</button>
                <button className="btn-primary" onClick={() => {
                  if (selectedLecture) {
                    const updatedLecture = {
                      ...selectedLecture,
                      status: 'published' as const
                    };
                    setLecturesList(prev => prev.map(lecture => 
                      lecture.id === selectedLecture.id ? updatedLecture : lecture
                    ));
                    setShowEditModal(false);
                    alert('Bài giảng đã được cập nhật!');
                  }
                }}>Cập nhật</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo bài giảng mới */}
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
                    <label>Tiêu đề bài giảng</label>
                    <input type="text" placeholder="Nhập tiêu đề bài giảng" />
                  </div>
                  <div className="form-group">
                    <label>Lớp học</label>
                    <select>
                      <option>Chọn lớp học</option>
                      <option>React Nâng cao</option>
                      <option>Node.js Backend</option>
                      <option>CNTT01</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ngày tạo</label>
                    <input type="date" />
                  </div>
                  <div className="form-group">
                    <label>Thời lượng (phút)</label>
                    <input type="number" placeholder="45" min="15" max="300" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Mô tả bài giảng</label>
                  <textarea placeholder="Mô tả nội dung bài giảng" rows={4}></textarea>
                </div>
                <div className="form-group">
                  <label>Tài liệu đính kèm</label>
                  <div className="file-upload-area">
                    <input type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.rar" />
                    <div className="file-upload-label">
                      Chọn tập tin hoặc kéo thả vào đây
                    </div>
                    <p className="file-upload-note">Hỗ trợ: PDF, PowerPoint, Word, Archive (Tối đa 50MB)</p>
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button className="btn-outline" onClick={() => {
                  const formData = new FormData(document.querySelector('.create-form') as HTMLFormElement);
                  const newLecture: Lecture = {
                    id: Math.max(...lecturesList.map(l => l.id)) + 1,
                    title: (document.querySelector('input[placeholder="Nhập tiêu đề bài giảng"]') as HTMLInputElement)?.value || 'Bài giảng mới',
                    class: (document.querySelector('select') as HTMLSelectElement)?.value || 'Chưa chọn',
                    date: (document.querySelector('input[type="date"]') as HTMLInputElement)?.value || new Date().toISOString().split('T')[0],
                    duration: ((document.querySelector('input[type="number"]') as HTMLInputElement)?.value || '45') + ' phút',
                    status: 'draft',
                    description: (document.querySelector('textarea') as HTMLTextAreaElement)?.value || '',
                    views: 0,
                    downloads: 0,
                    files: []
                  };
                  setLecturesList(prev => [...prev, newLecture]);
                  setShowCreateModal(false);
                  alert('Bài giảng đã được lưu nháp!');
                }}>Lưu nháp</button>
                <button className="btn-primary" onClick={() => {
                  const newLecture: Lecture = {
                    id: Math.max(...lecturesList.map(l => l.id)) + 1,
                    title: (document.querySelector('input[placeholder="Nhập tiêu đề bài giảng"]') as HTMLInputElement)?.value || 'Bài giảng mới',
                    class: (document.querySelector('select') as HTMLSelectElement)?.value || 'Chưa chọn',
                    date: (document.querySelector('input[type="date"]') as HTMLInputElement)?.value || new Date().toISOString().split('T')[0],
                    duration: ((document.querySelector('input[type="number"]') as HTMLInputElement)?.value || '45') + ' phút',
                    status: 'published',
                    description: (document.querySelector('textarea') as HTMLTextAreaElement)?.value || '',
                    views: 0,
                    downloads: 0,
                    files: []
                  };
                  setLecturesList(prev => [...prev, newLecture]);
                  setShowCreateModal(false);
                  alert('Bài giảng đã được tạo và xuất bản!');
                }}>Tạo bài giảng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}