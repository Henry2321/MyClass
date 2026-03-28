import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import VideoMeeting from './VideoMeeting';
import { getApiUrl } from '../utils/api';

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
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📚 {classData.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="class-detail-info">
            <p><strong>Mã lớp:</strong> {classData.code}</p>
            <p><strong>Giáo viên:</strong> 👨🏫 {classData.teacher.name}</p>
            <p><strong>Số sinh viên:</strong> 👥 {classData.students.length}</p>
            <p><strong>Mô tả:</strong> {classData.description || 'Chưa có mô tả'}</p>
            <p><strong>Ngày tạo:</strong> 📅 {new Date(classData.createdAt).toLocaleDateString('vi-VN')}</p>
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

function ClassManageModal({ classData, onClose, onDelete }: ClassManageModalProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleAction = (action: string) => {
    setActiveAction(action);
    setTimeout(() => {
      alert(`Đã thực hiện: ${action}`);
      setActiveAction(null);
    }, 1000);
  };

  const handleDelete = () => {
    if (confirm('Bạn có chắc muốn xóa lớp học này?')) {
      onDelete(classData._id);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Quản lý {classData.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="manage-actions">
            <button 
              className={`manage-btn ${activeAction === 'lecture' ? 'loading' : ''}`}
              onClick={() => handleAction('Tạo bài giảng mới')}
              disabled={activeAction !== null}
            >
              📝 Tạo bài giảng mới
            </button>
            <button 
              className={`manage-btn ${activeAction === 'assignment' ? 'loading' : ''}`}
              onClick={() => handleAction('Tạo bài tập mới')}
              disabled={activeAction !== null}
            >
              📋 Tạo bài tập mới
            </button>
            <button 
              className={`manage-btn ${activeAction === 'students' ? 'loading' : ''}`}
              onClick={() => handleAction('Quản lý sinh viên')}
              disabled={activeAction !== null}
            >
              👥 Quản lý sinh viên
            </button>
            <button 
              className={`manage-btn ${activeAction === 'report' ? 'loading' : ''}`}
              onClick={() => handleAction('Xem báo cáo')}
              disabled={activeAction !== null}
            >
              📊 Xem báo cáo
            </button>
            <button 
              className="manage-btn danger"
              onClick={handleDelete}
              disabled={activeAction !== null}
            >
              🗑️ Xóa lớp học
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ClassesProps {
  onJoinClassroom?: () => void;
}

export default function Classes({ onJoinClassroom }: ClassesProps) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [modalType, setModalType] = useState<'detail' | 'manage' | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showVideoMeeting, setShowVideoMeeting] = useState(false);
  const [selectedClassForMeeting, setSelectedClassForMeeting] = useState<Class | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/classes'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const classData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/classes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(classData)
      });

      if (response.ok) {
        const newClass = await response.json();
        setClasses([...classes, newClass]);
        setShowCreateForm(false);
        alert('Tạo lớp học thành công!');
      } else {
        const error = await response.json();
        alert(error.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Lỗi kết nối server');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinMeeting = (classData: Class) => {
    if (onJoinClassroom) {
      onJoinClassroom();
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
    const classCode = formData.get('code') as string;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/classes/join'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: classCode })
      });

      if (response.ok) {
        setShowJoinForm(false);
        alert('Tham gia lớp học thành công!');
        fetchClasses(); // Refresh danh sách lớp
      } else {
        const error = await response.json();
        alert(error.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Lỗi kết nối server');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/classes/${classId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setClasses(classes.filter(c => c._id !== classId));
        alert('Xóa lớp học thành công!');
      } else {
        const error = await response.json();
        alert(error.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Lỗi kết nối server');
    }
  };

  const handleViewDetail = (classData: Class) => {
    setSelectedClass(classData);
    setModalType('detail');
  };

  const handleManage = (classData: Class) => {
    setSelectedClass(classData);
    setModalType('manage');
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
        {user?.role === 'teacher' ? (
          <button className="btn-primary" onClick={() => setShowCreateForm(true)}>+ Tạo lớp mới</button>
        ) : (
          <button className="btn-primary" onClick={() => setShowJoinForm(true)}>🎓 Tham gia lớp</button>
        )}
      </div>

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏫 Tạo lớp học mới</h2>
              <button className="modal-close" onClick={() => setShowCreateForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateClass} className="modal-body">
              <div className="form-group">
                <label>Tên lớp học</label>
                <input name="name" type="text" placeholder="Nhập tên lớp học" required />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea name="description" placeholder="Mô tả về lớp học" rows={3}></textarea>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={createLoading}>
                  {createLoading ? 'Đang tạo...' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinForm && (
        <div className="modal-overlay" onClick={() => setShowJoinForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎓 Tham gia lớp học</h2>
              <button className="modal-close" onClick={() => setShowJoinForm(false)}>✕</button>
            </div>
            <form onSubmit={handleJoinClass} className="modal-body">
              <div className="form-group">
                <label>Mã lớp học</label>
                <input 
                  name="code" 
                  type="text" 
                  placeholder="Nhập mã lớp (VD: ABC123)" 
                  required 
                  style={{ textTransform: 'uppercase' }}
                  maxLength={6}
                />
              </div>
              <div className="form-note">
                <p>💡 <strong>Hướng dẫn:</strong></p>
                <p>• Nhập mã lớp 6 ký tự do giáo viên cung cấp</p>
                <p>• Mã lớp không phân biệt chữ hoa/thường</p>
                <p>• Liên hệ giáo viên nếu không có mã lớp</p>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowJoinForm(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={joinLoading}>
                  {joinLoading ? 'Đang tham gia...' : 'Tham gia lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="classes-grid">
        {classes.map(cls => (
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
              {user?.role === 'teacher' && (
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
          {user?.role === 'teacher' ? (
            <button className="btn-primary" onClick={() => setShowCreateForm(true)}>Tạo lớp đầu tiên</button>
          ) : (
            <button className="btn-primary" onClick={() => setShowJoinForm(true)}>Tham gia lớp đầu tiên</button>
          )}
        </div>
      )}

      {modalType === 'detail' && selectedClass && (
        <ClassDetailModal 
          classData={selectedClass} 
          onClose={closeModal} 
        />
      )}

      {modalType === 'manage' && selectedClass && (
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
