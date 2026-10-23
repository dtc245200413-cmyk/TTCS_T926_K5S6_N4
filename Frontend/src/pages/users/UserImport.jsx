import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

function UserImport() {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setPreviewData(null);
    setError(null);
    setSuccess(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axiosClient.get('/users/import/template', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_Import_NhanSu.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Có lỗi xảy ra khi tải tệp mẫu.');
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setError('Vui lòng chọn tệp Excel trước khi tải lên.');
      return;
    }

    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axiosClient.post('/users/import/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setPreviewData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi đọc tệp.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;

    const validRows = previewData.filter(row => row.errors.length === 0);
    if (validRows.length === 0) {
      setError('Không có dòng dữ liệu nào hợp lệ để nhập.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosClient.post('/users/import/confirm', { validRows });
      const result = response.data.data;
      setSuccess(`Nhập dữ liệu thành công: ${result.successCount} thành công, ${result.failedCount} thất bại.`);
      setPreviewData(null);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="g-page-header">
        <h1>Nhập danh sách nhân sự (Excel)</h1>
        <Link to="/users" className="btn-secondary">Quay lại danh sách</Link>
      </div>

      <div className="card">
        <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={handleDownloadTemplate} className="btn-secondary">
            Tải tệp mẫu
          </button>
          
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileChange} 
            disabled={loading}
            style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
          />

          <button onClick={handlePreview} className="btn-primary" disabled={!file || loading}>
            {loading ? 'Đang xử lý...' : 'Xem trước'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {previewData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>Kết quả xem trước ({previewData.length} dòng)</h3>
              <button 
                onClick={handleConfirm} 
                className="btn-primary" 
                disabled={loading || previewData.filter(r => r.errors.length === 0).length === 0}
              >
                Nhập các dòng hợp lệ ({previewData.filter(r => r.errors.length === 0).length})
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                  <th>Dòng</th>
                  <th>Mã NV</th>
                  <th>Họ Tên</th>
                  <th>Email</th>
                  <th>Phòng Ban</th>
                  <th>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index} style={{ backgroundColor: row.errors.length > 0 ? '#fef2f2' : 'inherit' }}>
                    <td>{row.row_index}</td>
                    <td>{row.data.employee_code}</td>
                    <td>{row.data.full_name}</td>
                    <td>{row.data.company_email}</td>
                    <td>{row.data.department_name}</td>
                    <td>
                      {row.errors.length > 0 ? (
                        <div style={{ color: 'var(--danger-color)', fontSize: '14px' }}>
                          {row.errors.map((e, i) => <div key={i}>- {e}</div>)}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>Hợp lệ</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserImport;
