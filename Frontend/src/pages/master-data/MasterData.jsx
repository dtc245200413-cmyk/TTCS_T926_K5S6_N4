import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GROUPS = [
  { value: 'CANDIDATE_SOURCE', label: 'Nguồn ứng viên' },
  { value: 'REJECTION_REASON', label: 'Lý do loại hồ sơ' },
  { value: 'WORK_LOCATION', label: 'Địa điểm làm việc' },
  { value: 'WORK_TYPE', label: 'Hình thức làm việc' }
];

const MasterData = () => {
  const [activeGroup, setActiveGroup] = useState('CANDIDATE_SOURCE');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedItemId, setDraggedItemId] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    display_order: 0,
    is_active: true
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const getPlaceholders = () => {
    switch(activeGroup) {
      case 'CANDIDATE_SOURCE': return { code: 'VD: LINKEDIN, REFERRAL...', name: 'VD: Mạng xã hội LinkedIn', desc: 'VD: Nguồn ứng viên từ mạng xã hội LinkedIn' };
      case 'REJECTION_REASON': return { code: 'VD: NOT_MATCH_SKILL, HIGH_SALARY...', name: 'VD: Không phù hợp kỹ năng', desc: 'VD: Kỹ năng của ứng viên không đáp ứng yêu cầu' };
      case 'WORK_LOCATION': return { code: 'VD: HN_CAUGIAY, HCM_Q1...', name: 'VD: Hà Nội - Cầu Giấy', desc: 'VD: Văn phòng làm việc tại quận Cầu Giấy, HN' };
      case 'WORK_TYPE': return { code: 'VD: FULLTIME, PARTTIME...', name: 'VD: Toàn thời gian', desc: 'VD: Làm việc toàn thời gian 8h/ngày' };
      default: return { code: 'VD: CODE', name: 'VD: Tên hiển thị', desc: 'Mô tả chi tiết' };
    }
  };
  const placeholders = getPlaceholders();

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3000/api/master-data?group=${activeGroup}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setItems(res.data.data);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể tải dữ liệu danh mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeGroup]);

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditItem(item);
      setFormData({
        code: item.code,
        name: item.name,
        description: item.description || '',
        display_order: item.display_order,
        is_active: item.is_active
      });
    } else {
      setEditItem(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        display_order: items.length + 1,
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = { ...formData, category_group: activeGroup };
      
      if (editItem) {
        await axios.put(`http://localhost:3000/api/master-data/${editItem.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Cập nhật thành công');
      } else {
        await axios.post('http://localhost:3000/api/master-data', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Thêm mới thành công');
      }
      handleCloseModal();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/master-data/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Xóa thành công');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa');
    }
  };

  const handleDragStart = (e, id) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag image to be generated before styling the dragged row
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItemId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    if (draggedItemId === targetId) return;

    const newItems = [...items];
    const draggedIdx = newItems.findIndex(i => i.id === draggedItemId);
    const targetIdx = newItems.findIndex(i => i.id === targetId);
    
    // Remove dragged item and insert at target position
    const [draggedItem] = newItems.splice(draggedIdx, 1);
    newItems.splice(targetIdx, 0, draggedItem);
    
    // Re-assign display_order based on new array order
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      display_order: index + 1
    }));
    
    setItems(updatedItems);
    
    try {
      const token = localStorage.getItem('token');
      const payload = {
        items: updatedItems.map(i => ({ id: i.id, display_order: i.display_order }))
      };
      await axios.put('http://localhost:3000/api/master-data/reorder', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
      alert('Không thể lưu thứ tự mới');
      fetchData(); // Revert on failure
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 80px)' }}>
      <style>{`
        .tooltip-container:hover .tooltip-text {
          visibility: visible !important;
          opacity: 1 !important;
        }
      `}</style>
      <div style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '1.75rem', color: '#0f172a' }}>Danh mục Hệ thống</h1>
            <p style={{ margin: 0, color: '#64748b' }}>Quản lý các danh mục dùng chung cho toàn bộ hệ thống</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}
          >
            <span>➕</span> Thêm danh mục mới
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
          {GROUPS.map(group => (
            <button
              key={group.value}
              onClick={() => setActiveGroup(group.value)}
              style={{
                padding: '10px 20px',
                borderRadius: '20px',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                backgroundColor: activeGroup === group.value ? '#4f46e5' : 'white',
                color: activeGroup === group.value ? 'white' : '#64748b',
                boxShadow: activeGroup === group.value ? '0 4px 10px rgba(79, 70, 229, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
            >
              {group.label}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Chưa có dữ liệu cho danh mục này.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '16px', color: '#475569', fontWeight: '700', width: '80px' }}>Thứ tự</th>
                  <th style={{ padding: '16px', color: '#475569', fontWeight: '700', width: '150px' }}>Mã (Code)</th>
                  <th style={{ padding: '16px', color: '#475569', fontWeight: '700' }}>Tên hiển thị</th>
                  <th style={{ padding: '16px', color: '#475569', fontWeight: '700' }}>Mô tả</th>
                  <th style={{ padding: '16px', color: '#475569', fontWeight: '700', width: '120px' }}>Trạng thái</th>
                  <th style={{ padding: '16px', color: '#475569', fontWeight: '700', width: '120px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr 
                    key={item.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item.id)}
                    style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.2s', cursor: 'grab' }}
                    onDragEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onDragLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '16px', textAlign: 'center', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <span style={{ color: '#cbd5e1', fontSize: '1.2rem' }}>⋮⋮</span>
                      <span style={{ display: 'inline-block', width: '28px', height: '28px', lineHeight: '28px', backgroundColor: '#e2e8f0', borderRadius: '50%', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
                        {item.display_order}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <code style={{ padding: '4px 8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.85rem', color: '#0f172a' }}>{item.code}</code>
                    </td>
                    <td style={{ padding: '16px', fontWeight: '600', color: '#0f172a' }}>{item.name}</td>
                    <td style={{ padding: '16px', color: '#64748b', fontSize: '0.9rem' }}>{item.description}</td>
                    <td style={{ padding: '16px' }}>
                      {item.is_active ? (
                        <span style={{ padding: '4px 10px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>Hoạt động</span>
                      ) : (
                        <span style={{ padding: '4px 10px', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>Vô hiệu</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button onClick={() => handleOpenModal(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', marginRight: '12px' }} title="Sửa">✏️</button>
                      
                      {item.is_referenced ? (
                        <div style={{ display: 'inline-block', position: 'relative' }} className="tooltip-container">
                          <button 
                            disabled
                            style={{ background: 'none', border: 'none', cursor: 'not-allowed', fontSize: '1.2rem', opacity: 0.3, filter: 'grayscale(100%)' }}
                          >
                            🗑️
                          </button>
                          <div className="tooltip-text" style={{ visibility: 'hidden', width: '220px', backgroundColor: '#1e293b', color: '#fff', textAlign: 'center', borderRadius: '6px', padding: '8px', position: 'absolute', zIndex: 1, bottom: '125%', left: '50%', transform: 'translateX(-50%)', opacity: 0, transition: 'opacity 0.3s', fontSize: '0.8rem', pointerEvents: 'none' }}>
                            Không thể xóa do danh mục đang được sử dụng
                            <div style={{ content: '""', position: 'absolute', top: '100%', left: '50%', marginLeft: '-5px', borderWidth: '5px', borderStyle: 'solid', borderColor: '#1e293b transparent transparent transparent' }}></div>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title="Xóa">🗑️</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h2 style={{ margin: '0 0 24px 0', color: '#0f172a' }}>
              {editItem ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                  {editItem ? 'Đang cập nhật trong nhóm' : 'Đang thêm mới vào nhóm'}
                </label>
                {activeGroup === 'CANDIDATE_SOURCE' && !editItem ? (
                  <select 
                    value={selectedTemplate} 
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    style={{ width: '100%', padding: '4px 0', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#0f172a', fontWeight: '700', fontSize: '1.05rem', cursor: 'pointer', appearance: 'none', textOverflow: 'ellipsis' }}
                  >
                    <option value="">Nguồn ứng viên</option>
                    <option value="SOCIAL_MEDIA">Mạng xã hội chuyên nghiệp & giải trí</option>
                    <option value="JOB_BOARDS">Trang đăng tin tuyển dụng (Job Boards)</option>
                    <option value="CAREER_SITE">Website công ty (Career Site)</option>
                    <option value="REFERRAL">Giới thiệu nội bộ (Employee Referral)</option>
                    <option value="AGENCY">Đơn vị tuyển dụng bên ngoài (Headhunter / Agency)</option>
                    <option value="EVENTS">Sự kiện & Trực tiếp</option>
                  </select>
                ) : activeGroup === 'REJECTION_REASON' && !editItem ? (
                  <select 
                    value={selectedTemplate} 
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    style={{ width: '100%', padding: '4px 0', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#0f172a', fontWeight: '700', fontSize: '1.05rem', cursor: 'pointer', appearance: 'none', textOverflow: 'ellipsis' }}
                  >
                    <option value="">Lý do loại hồ sơ</option>
                    <option value="LACK_EXPERIENCE">Thiếu kinh nghiệm / Chuyên môn</option>
                    <option value="FAIL_TEST">Không đạt Bài test / Ngoại ngữ</option>
                    <option value="HIGH_SALARY">Kỳ vọng lương quá cao</option>
                    <option value="NOT_FIT_CULTURE">Không hợp Văn hóa / Thái độ</option>
                    <option value="NO_SHOW">Bỏ lịch phỏng vấn (No-show)</option>
                    <option value="WITHDRAW">Ứng viên tự rút / Nhận việc khác</option>
                    <option value="CANNOT_CONTACT">Không liên lạc được</option>
                  </select>
                ) : activeGroup === 'WORK_LOCATION' && !editItem ? (
                  <select 
                    value={selectedTemplate} 
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    style={{ width: '100%', padding: '4px 0', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#0f172a', fontWeight: '700', fontSize: '1.05rem', cursor: 'pointer', appearance: 'none', textOverflow: 'ellipsis' }}
                  >
                    <option value="">Địa điểm làm việc</option>
                    <option value="HN">Hà Nội</option>
                    <option value="HCM">TP. HCM</option>
                    <option value="DN">Đà Nẵng</option>
                  </select>
                ) : activeGroup === 'WORK_TYPE' && !editItem ? (
                  <select 
                    value={selectedTemplate} 
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    style={{ width: '100%', padding: '4px 0', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#0f172a', fontWeight: '700', fontSize: '1.05rem', cursor: 'pointer', appearance: 'none', textOverflow: 'ellipsis' }}
                  >
                    <option value="">Hình thức làm việc</option>
                    <option value="FULLTIME">Toàn thời gian (Full-time)</option>
                    <option value="PARTTIME">Bán thời gian (Part-time)</option>
                    <option value="INTERNSHIP">Thực tập sinh (Internship)</option>
                    <option value="CONTRACT">Hợp đồng / Dự án (Contract)</option>
                    <option value="REMOTE">Làm việc từ xa (Remote)</option>
                    <option value="HYBRID">Kết hợp (Hybrid)</option>
                  </select>
                ) : (
                  <select 
                    value={activeGroup} 
                    onChange={(e) => setActiveGroup(e.target.value)}
                    style={{ width: '100%', padding: '4px 0', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#0f172a', fontWeight: '700', fontSize: '1.05rem', cursor: 'pointer', appearance: 'none' }}
                  >
                    {GROUPS.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                )}
                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '1.2rem', color: '#64748b' }}>
                  ⌄
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>Mã (Code) *</label>
                <input 
                  type="text" 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  disabled={!!editItem}
                  required
                  placeholder={placeholders.code}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: editItem ? '#f1f5f9' : 'white' }} 
                />
                {editItem && <small style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>Không thể thay đổi mã của danh mục đã tạo.</small>}
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>Tên hiển thị *</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder={placeholders.name}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>Mô tả</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  placeholder={placeholders.desc}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }} 
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>Thứ tự hiển thị</label>
                  <input 
                    type="number" 
                    value={formData.display_order} 
                    onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>Trạng thái</label>
                  <select 
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
                  >
                    <option value="true">Hoạt động</option>
                    <option value="false">Vô hiệu hóa</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={handleCloseModal} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>Hủy</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', fontWeight: '600', cursor: 'pointer', color: 'white' }}>Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterData;
