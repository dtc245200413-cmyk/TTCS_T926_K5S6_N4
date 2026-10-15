import React from 'react';

export const CANDIDATE_STATUS_LABELS = {
  NEW: 'Mới',
  INTERVIEWING: 'Phỏng vấn',
  OFFERED: 'Đề nghị (Offer)',
  HIRED: 'Đã tuyển',
  REJECTED: 'Đánh trượt',
  SUBMITTED: 'Đã nộp hồ sơ',
};

const STATUS_COLORS = {
  NEW: ['#dbeafe', '#1d4ed8'],
  INTERVIEWING: ['#fef3c7', '#d97706'],
  OFFERED: ['#e0e7ff', '#4338ca'],
  HIRED: ['#dcfce7', '#16a34a'],
  REJECTED: ['#fee2e2', '#dc2626'],
  SUBMITTED: ['#dbeafe', '#1d4ed8'],
};

export const CandidateStatusBadge = ({ status }) => {
  const [background, color] = STATUS_COLORS[status] || ['#f1f5f9', '#475569'];
  return (
    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background, color }}>
      {CANDIDATE_STATUS_LABELS[status] || status}
    </span>
  );
};

export const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '-');
