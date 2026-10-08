import React, { useState, useRef } from 'react';

const AvatarUpload = ({ onFileSelect }) => {
  // Trạng thái lưu ảnh preview, file đã chọn và thông báo lỗi
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef(null);

  // Cấu hình ràng buộc file
  const MAX_FILE_SIZE_MB = 2; // Tối đa 2MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset lại thông báo lỗi trước đó
    setErrorMessage('');

    // 1. Kiểm tra định dạng ảnh hợp lệ
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage('Định dạng file không hợp lệ! Vui lòng chỉ chọn ảnh JPG, PNG hoặc WEBP.');
      resetFileInput();
      return;
    }

    // 2. Kiểm tra dung lượng ảnh
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setErrorMessage(`Dung lượng ảnh vượt quá giới hạn! Tối đa là ${MAX_FILE_SIZE_MB}MB.`);
      resetFileInput();
      return;
    }

    // 3. Nếu file hợp lệ: tạo URL để xem trước (Preview)
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Gửi file ra component cha (nếu cần xử lý gửi API lên backend sau này)
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const resetFileInput = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    resetFileInput();
    setErrorMessage('');
    if (onFileSelect) {
      onFileSelect(null);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Ảnh đại diện</h3>

      {/* Vùng xem trước ảnh đại diện */}
      <div style={styles.avatarWrapper}>
        <img
          src={previewUrl || 'https://via.placeholder.com/150?text=Avatar'}
          alt="Avatar Preview"
          style={styles.avatarImage}
        />
      </div>

      {/* Nút thao tác tải ảnh */}
      <div style={styles.actionGroup}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/jpg, image/webp"
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          style={styles.uploadBtn}
        >
          Chọn ảnh mới
        </button>

        {previewUrl && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            style={styles.removeBtn}
          >
            Xóa ảnh
          </button>
        )}
      </div>

      <p style={styles.hintText}>
        Hỗ trợ định dạng: JPG, PNG, WEBP. Dung lượng tối đa: {MAX_FILE_SIZE_MB}MB.
      </p>

      {/* Hiển thị thông báo lỗi khi ảnh không hợp lệ */}
      {errorMessage && (
        <div style={styles.errorAlert}>
          <span>⚠️ {errorMessage}</span>
        </div>
      )}
    </div>
  );
};

// CSS-in-JS cơ bản giúp component hiển thị đẹp ngay lập tức
const styles = {
  container: {
    maxWidth: '400px',
    margin: '20px auto',
    padding: '20px',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  title: {
    marginBottom: '16px',
    fontSize: '18px',
    color: '#333',
  },
  avatarWrapper: {
    width: '130px',
    height: '130px',
    margin: '0 auto 16px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '3px solid #007bff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  actionGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  uploadBtn: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  removeBtn: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  hintText: {
    fontSize: '12px',
    color: '#777',
    margin: '6px 0 12px',
  },
  errorAlert: {
    backgroundColor: '#ffebee',
    color: '#d32f2f',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    textAlign: 'left',
    marginTop: '10px',
    border: '1px solid #ffcdd2',
  },
};

export default AvatarUpload;