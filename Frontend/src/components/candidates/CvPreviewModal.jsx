import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FiDownload, FiExternalLink, FiX, FiFileText, FiAlertCircle } from 'react-icons/fi';
import { renderAsync } from 'docx-preview';
import mammoth from 'mammoth';
import candidateApi from '../../api/candidateApi';

/**
 * Kiểm tra xem đường dẫn có phải liên kết trực tuyến (Drive, LinkedIn, link ngoài) hay không
 */
export function isOnlineUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Kiểm tra xem tệp có đuôi mở rộng .pdf hay không
 */
export function isPdfFile(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  return clean.endsWith('.pdf');
}

/**
 * Kiểm tra xem tệp có đuôi mở rộng .docx hoặc .doc hay không
 */
export function isWordFile(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  return clean.endsWith('.docx') || clean.endsWith('.doc');
}

/**
 * Chuyển đổi link online (như Google Drive) sang dạng nhúng xem trước (preview)
 */
export function getEmbedUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('drive.google.com')) {
    let preview = url.replace(/\/view(\?.*)?$/, '/preview');
    preview = preview.replace(/\/edit(\?.*)?$/, '/preview');
    if (!preview.includes('/preview')) {
      const match = preview.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return preview;
  }
  return url;
}

/**
 * Lấy tên tệp rút gọn từ đường dẫn hoặc URL
 */
export function getFileName(url, defaultName = 'Tệp CV') {
  if (!url || typeof url !== 'string') return defaultName;
  if (isOnlineUrl(url)) {
    try {
      const parsed = new URL(url);
      return parsed.hostname + (parsed.pathname.length > 1 ? parsed.pathname : '');
    } catch {
      return url;
    }
  }
  const parts = url.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || defaultName;
}

/**
 * Hàm tải CV từ Backend gọi API `/api/candidates/:id/resume`
 */
export async function downloadCandidateCv(candidateId, candidateName, resumeUrl) {
  if (isOnlineUrl(resumeUrl)) {
    window.open(resumeUrl, '_blank', 'noopener,noreferrer');
    return { success: true, mode: 'online' };
  }

  const res = await candidateApi.downloadResume(candidateId);

  // Xác định phần mở rộng tệp
  let ext = 'pdf';
  if (resumeUrl && typeof resumeUrl === 'string') {
    const match = resumeUrl.match(/\.([a-zA-Z0-9]+)($|\?|#)/);
    if (match) ext = match[1].toLowerCase();
  } else if (res.headers['content-type']?.includes('word') || res.headers['content-type']?.includes('officedocument')) {
    ext = 'docx';
  }

  let finalFileName = `CV-${(candidateName || `candidate-${candidateId}`).trim()}.${ext}`;

  // Kiểm tra header content-disposition nếu Backend trả về filename
  const disposition = res.headers['content-disposition'];
  if (disposition && disposition.includes('filename=')) {
    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      finalFileName = filenameMatch[1].replace(/['"]/g, '').trim();
    }
  }

  const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = finalFileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return { success: true, fileName: finalFileName };
}

/**
 * Modal Popup xem trước CV trực tiếp:
 * - Render file Word (.docx, .doc) ngay trong modal bằng docx-preview / mammoth kèm thanh cuộn.
 * - Render file PDF trực tiếp bằng <iframe> (PDF viewer).
 * - Render liên kết Drive/online trực tiếp trong <iframe> xem trước.
 * - Giữ nguyên nút Tải CV về máy và nút Mở tab mới ở thanh header phía trên.
 */
const CvPreviewModal = ({ open, onClose, candidate }) => {
  const [objectUrl, setObjectUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [fileType, setFileType] = useState('unknown'); // 'pdf' | 'docx' | 'online' | 'unknown'
  const [mammothHtml, setMammothHtml] = useState('');
  const [wordRendered, setWordRendered] = useState(false);

  const docxContainerRef = useRef(null);

  const candidateId = candidate?.id;
  const resumeUrl = candidate?.resume_url || '';
  const fullName = candidate?.full_name || 'Ứng viên';
  const isOnline = isOnlineUrl(resumeUrl);

  const loadCvContent = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    setError('');
    setMammothHtml('');
    setWordRendered(false);

    // 1. Trường hợp là liên kết online / Google Drive
    if (isOnline) {
      setFileType('online');
      setLoading(false);
      return;
    }

    try {
      const res = await candidateApi.downloadResume(candidateId);
      const contentType = res.headers['content-type'] || '';
      const isWord = isWordFile(resumeUrl) || contentType.includes('word') || contentType.includes('officedocument');
      const isPdf = isPdfFile(resumeUrl) || contentType.includes('application/pdf');

      if (isWord) {
        setFileType('docx');
        const rawData = res.data; // Blob hoặc ArrayBuffer
        let arrayBuffer;
        if (rawData instanceof ArrayBuffer) {
          arrayBuffer = rawData;
        } else if (rawData instanceof Blob) {
          arrayBuffer = await rawData.arrayBuffer();
        } else {
          arrayBuffer = new Uint8Array(rawData).buffer;
        }

        // Tạo objectUrl để nút Tải về hoặc Mở tab mới có thể dùng
        const docBlob = new Blob([arrayBuffer], {
          type: contentType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const url = URL.createObjectURL(docBlob);
        setObjectUrl(url);

        // Hiển thị ngay bằng docx-preview; nếu lỗi thì chuyển sang mammoth
        if (docxContainerRef.current) {
          docxContainerRef.current.innerHTML = '';
          try {
            await renderAsync(arrayBuffer, docxContainerRef.current, null, {
              className: 'docx-preview-item',
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
              breakPages: true,
              experimental: true,
              useBase64URL: true
            });
            setWordRendered(true);
          } catch (docxErr) {
            console.warn('docx-preview gặp lỗi, chuyển sang giải mã bằng mammoth:', docxErr);
            try {
              const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
              setMammothHtml(mammothResult.value);
              setWordRendered(true);
            } catch (mammothErr) {
              console.error('Lỗi chuyển đổi Word qua mammoth:', mammothErr);
              setError('Không thể kết xuất trực tiếp tài liệu Word. Vui lòng bấm "Tải CV về máy" ở trên để xem.');
            }
          }
        }
      } else {
        // Mặc định xử lý dạng PDF
        setFileType('pdf');
        const pdfBlob = new Blob([res.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);
        setObjectUrl(url);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu xem trước CV:', err);
      setError(
        err.response?.status === 404
          ? 'Tệp CV không tồn tại trên hệ thống hoặc hồ sơ chưa có CV.'
          : err.response?.data?.message || 'Không thể tải tệp CV từ máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  }, [candidateId, resumeUrl, isOnline]);

  useEffect(() => {
    if (!open || !candidateId) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
      return;
    }

    loadCvContent();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
    };
  }, [open, candidateId, loadCvContent]);

  // Đóng modal khi bấm phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !candidate) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadCandidateCv(candidateId, fullName, resumeUrl);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể tải file CV về máy.');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenNewTab = () => {
    if (isOnline) {
      window.open(resumeUrl, '_blank', 'noopener,noreferrer');
    } else if (objectUrl) {
      window.open(objectUrl, '_blank');
    }
  };

  const fileName = getFileName(resumeUrl, `CV-${fullName}.${fileType === 'docx' ? 'docx' : 'pdf'}`);
  const embedUrl = isOnline ? getEmbedUrl(resumeUrl) : '';

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 1100,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94vw',
          maxWidth: 1080,
          height: '90vh',
          maxHeight: 920,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          backgroundColor: '#ffffff'
        }}
      >
        {/* MODAL HEADER - GIỮ NGUYÊN NÚT TẢI VỀ VÀ MỞ TAB MỚI */}
        <div
          style={{
            padding: '12px 20px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0
              }}
            >
              <FiFileText />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>CV: {fullName}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 12,
                    backgroundColor: isOnline ? '#e0f2fe' : fileType === 'docx' ? '#fef3c7' : '#dbeafe',
                    color: isOnline ? '#0369a1' : fileType === 'docx' ? '#b45309' : '#1d4ed8'
                  }}
                >
                  {isOnline ? 'Liên kết Online' : fileType === 'docx' ? 'Tài liệu Word (.docx)' : 'Tệp PDF'}
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 500
                }}
                title={fileName}
              >
                {fileName}
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS IN HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {(objectUrl || isOnline) && (
              <button
                type="button"
                className="g-btn-secondary"
                onClick={handleOpenNewTab}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  fontSize: '0.85rem'
                }}
                title="Mở sang tab trình duyệt mới"
              >
                <FiExternalLink /> Mở tab mới
              </button>
            )}

            <button
              type="button"
              className="btn-action-view"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                fontSize: '0.85rem',
                color: '#059669',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0'
              }}
              title="Tải CV về máy tính"
            >
              <FiDownload /> {downloading ? 'Đang tải...' : 'Tải CV về máy'}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
              aria-label="Đóng"
            >
              <FiX />
            </button>
          </div>
        </div>

        {/* MODAL BODY - HIỂN THỊ NỘI DUNG TÀI LIỆU TRỰC TIẾP */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            backgroundColor: '#525659',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {loading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#e2e8f0',
                gap: 12
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  border: '3px solid rgba(255,255,255,0.2)',
                  borderTopColor: '#38bdf8',
                  borderRadius: '50%',
                  animation: 'cvSpin 0.8s linear infinite'
                }}
              />
              <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Đang đọc và hiển thị nội dung CV...</span>
              <style>{`@keyframes cvSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: 32,
                textAlign: 'center',
                backgroundColor: '#f8fafc'
              }}
            >
              <FiAlertCircle style={{ fontSize: '3rem', color: '#ef4444', marginBottom: 12 }} />
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#1e293b' }}>
                Không thể tải nội dung xem trước CV
              </h4>
              <p style={{ margin: '0 0 20px 0', color: '#64748b', maxWidth: 450, fontSize: '0.9rem' }}>
                {error}
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="g-btn-secondary" onClick={loadCvContent}>
                  Thử lại
                </button>
                <button type="button" className="g-btn-primary" onClick={handleDownload} disabled={downloading}>
                  <FiDownload /> Tải CV về máy
                </button>
              </div>
            </div>
          )}

          {/* 1. HIỂN THỊ LINK ONLINE / GOOGLE DRIVE TRỰC TIẾP TRONG IFRAME */}
          {!loading && !error && isOnline && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  padding: '6px 16px',
                  backgroundColor: '#f0f9ff',
                  borderBottom: '1px solid #bae6fd',
                  color: '#0369a1',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8
                }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🌐 Đang xem trước liên kết online: <strong>{resumeUrl}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    textDecoration: 'underline'
                  }}
                >
                  Mở tab mới nếu trang chặn nhúng
                </button>
              </div>
              <iframe
                src={embedUrl}
                title={`CV Online - ${fullName}`}
                width="100%"
                height="100%"
                style={{ border: 'none', flex: 1, backgroundColor: '#ffffff' }}
                allow="autoplay"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          )}

          {/* 2. HIỂN THỊ FILE WORD (.DOCX / .DOC) TRỰC TIẾP BẰNG DOCX-PREVIEW HOẶC MAMMOTH */}
          <div
            style={{
              display: !loading && !error && fileType === 'docx' ? 'block' : 'none',
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              padding: '24px 16px',
              backgroundColor: '#525659'
            }}
          >
            {/* Vùng chứa kết xuất của docx-preview */}
            <div
              ref={docxContainerRef}
              className="cv-docx-container"
              style={{
                margin: '0 auto',
                display: mammothHtml ? 'none' : 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%'
              }}
            />

            {/* Vùng chứa dự phòng khi dùng mammoth */}
            {mammothHtml && (
              <div
                className="cv-mammoth-paper"
                style={{
                  maxWidth: 860,
                  margin: '0 auto',
                  backgroundColor: '#ffffff',
                  padding: '48px 56px',
                  borderRadius: 4,
                  boxShadow: '0 4px 25px rgba(0,0,0,0.3)',
                  color: '#1e293b',
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  minHeight: '70vh'
                }}
                dangerouslySetInnerHTML={{ __html: mammothHtml }}
              />
            )}
          </div>

          {/* 3. HIỂN THỊ FILE PDF TRỰC TIẾP BẰNG IFRAME / NATIVE PDF VIEWER */}
          {!loading && !error && fileType === 'pdf' && objectUrl && (
            <iframe
              src={`${objectUrl}#toolbar=1`}
              title={`CV - ${fullName}`}
              width="100%"
              height="100%"
              style={{
                border: 'none',
                width: '100%',
                height: '100%',
                display: 'block',
                backgroundColor: '#525659'
              }}
            />
          )}
        </div>
      </div>

      {/* Global styles dành riêng cho trang tài liệu Word của docx-preview & mammoth */}
      <style>{`
        .cv-docx-container .docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 20px !important;
        }
        .cv-docx-container .docx-wrapper > section.docx {
          background: #ffffff !important;
          box-shadow: 0 4px 25px rgba(0, 0, 0, 0.3) !important;
          margin-bottom: 20px !important;
          color: #1e293b !important;
          border-radius: 2px !important;
        }
        .cv-mammoth-paper table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        .cv-mammoth-paper table,
        .cv-mammoth-paper th,
        .cv-mammoth-paper td {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
        }
        .cv-mammoth-paper th {
          background-color: #f8fafc;
          font-weight: 600;
        }
        .cv-mammoth-paper ul, .cv-mammoth-paper ol {
          padding-left: 24px;
          margin: 12px 0;
        }
        .cv-mammoth-paper p {
          margin: 8px 0;
        }
      `}</style>
    </div>
  );
};

export default CvPreviewModal;
