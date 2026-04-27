import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ClassDetailModalProps {
  classData: any;
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
            <p><strong>Giáo viên:</strong> 👨🏫 {classData.teacher}</p>
            <p><strong>Số sinh viên:</strong> 👥 {classData.students}</p>
            <p><strong>Lịch học:</strong> 📅 Thứ 2, 4, 6 - 7:00-9:00</p>
            <p><strong>Phòng học:</strong> 🏫 Phòng 301</p>
          </div>
          <div className="class-stats">
            <div className="stat-item">
              <span className="stat-number">12</span>
              <span className="stat-label">Bài giảng</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">8</span>
              <span className="stat-label">Bài tập</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">85%</span>
              <span className="stat-label">Hoàn thành</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ClassManageModalProps {
  classData: any;
  onClose: () => void;
}

function ClassManageModal({ classData, onClose }: ClassManageModalProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleAction = (action: string) => {
    setActiveAction(action);
    // Simulate action
    setTimeout(() => {
      alert(`Đã thực hiện: ${action}`);
      setActiveAction(null);
    }, 1000);
  };

  const handleImportStudents = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const emails = text.split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes('@'));
        
        if (emails.length === 0) {
          alert('Không tìm thấy email hợp lệ trong file.');
          return;
        }

        alert(`Đã đọc ${emails.length} email từ file. Chức năng API đang được gọi...`);
        // Note: Enhanced version might not have full API integration yet
      };
      reader.readAsText(file);
    };
    input.click();
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
              onClick={handleImportStudents}
              disabled={activeAction !== null}
            >
              👥 Import danh sách SV
            </button>
            <button 
              className={`manage-btn ${activeAction === 'report' ? 'loading' : ''}`}
              onClick={() => handleAction('Xem báo cáo')}
              disabled={activeAction !== null}
            >
              📊 Xem báo cáo
            </button>
            <button 
              className={`manage-btn ${activeAction === 'settings' ? 'loading' : ''}`}
              onClick={() => handleAction('Cài đặt lớp học')}
              disabled={activeAction !== null}
            >
              ⚙️ Cài đặt lớp học
            </button>
            <button 
              className={`manage-btn danger ${activeAction === 'delete' ? 'loading' : ''}`}
              onClick={() => {
                if (confirm('Bạn có chắc muốn xóa lớp học này?')) {
                  handleAction('Xóa lớp học');
                }
              }}
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

export default function Classes() {
  const { user } = useAuth();
  const [classes] = useState([
    { id: 1, name: 'React Nâng cao', code: 'REACT01', students: 25, teacher: 'Nguyễn Văn A' },
    { id: 2, name: 'Node.js Backend', code: 'NODE01', students: 18, teacher: 'Trần Thị B' },
    { id: 3, name: 'Database Design', code: 'DB01', students: 30, teacher: 'Lê Văn C' }
  ]);
  
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [modalType, setModalType] = useState<'detail' | 'manage' | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateClass = () => {
    setShowCreateForm(true);
  };

  const handleSubmitNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Đã tạo lớp học mới thành công!');
    setShowCreateForm(false);
  };

  const handleViewDetail = (classData: any) => {
    setSelectedClass(classData);
    setModalType('detail');
  };

  const handleManage = (classData: any) => {
    setSelectedClass(classData);
    setModalType('manage');
  };

  const closeModal = () => {
    setSelectedClass(null);
    setModalType(null);
  };

  return (
    <>
      <h1 className="title">Lớp học 📚</h1>
      
      {user?.role === 'teacher' && (
        <div className="classes-header">
          <button className="btn-primary" onClick={handleCreateClass}>+ Tạo lớp mới</button>
        </div>
      )}

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏫 Tạo lớp học mới</h2>
              <button className="modal-close" onClick={() => setShowCreateForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitNewClass} className="modal-body">
              <div className="form-group">
                <label>Tên lớp học</label>
                <input type="text" placeholder="Nhập tên lớp học" required />
              </div>
              <div className="form-group">
                <label>Mã lớp</label>
                <input type="text" placeholder="VD: WEB2024" required />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea placeholder="Mô tả về lớp học" rows={3}></textarea>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Tạo lớp</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="classes-grid">
        {classes.map(cls => (
          <div key={cls.id} className="class-card">
            <div className="class-header">
              <h3>{cls.name}</h3>
              <span className="class-code">{cls.code}</span>
            </div>
            <div className="class-info">
              <p>👨🏫 {cls.teacher}</p>
              <p>👥 {cls.students} sinh viên</p>
            </div>
            <div className="class-actions">
              <button 
                className="btn-outline"
                onClick={() => handleViewDetail(cls)}
              >
                Xem chi tiết
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
        />
      )}
    </>
  );
}