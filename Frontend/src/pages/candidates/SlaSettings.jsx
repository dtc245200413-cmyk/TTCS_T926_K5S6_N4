import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiClock, FiPlay, FiSave } from 'react-icons/fi';

const API = 'http://localhost:3000/api/sla';
const stageNames = { NEW: 'Hồ sơ mới', INTERVIEWING: 'Đang phỏng vấn', OFFERED: 'Đã gửi đề nghị' };

const SlaSettings = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(null);
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const loadConfigs = async () => {
    try {
      const response = await axios.get(`${API}/configs`, { headers });
      setConfigs(response.data.data || []);
    } catch (error) {
      setMessage({ error: true, text: error.response?.data?.message || 'Không thể tải cấu hình SLA.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConfigs(); }, []);

  const updateConfig = (stageCode, field, value) => {
    setConfigs(current => current.map(config => config.stage_code === stageCode ? { ...config, [field]: value } : config));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.put(`${API}/configs`, { configs }, { headers });
      setConfigs(response.data.data || []);
      setMessage({ text: 'Đã lưu cấu hình SLA.' });
    } catch (error) {
      setMessage({ error: true, text: error.response?.data?.message || 'Không thể lưu cấu hình.' });
    } finally {
      setSaving(false);
    }
  };

  const runCheck = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const response = await axios.post(`${API}/run`, {}, { headers });
      const result = response.data.data;
      setMessage({ text: result.skipped ? result.reason : `Đã kiểm tra ${result.overdue_candidates} hồ sơ; gửi ${result.reminders_created} thông báo.` });
    } catch (error) {
      setMessage({ error: true, text: error.response?.data?.message || 'Không thể chạy kiểm tra SLA.' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <main style={{ padding: 24, minHeight: 'calc(100vh - 80px)', background: '#f8fafc' }}>
      <div style={{ maxWidth: 850, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <FiClock size={24} color="#4f46e5" />
          <div><h1 className="g-page-title" style={{ margin: 0 }}>Cấu hình SLA ứng viên</h1><p className="g-page-subtitle">Quá hạn sẽ được đánh dấu và recruiter nhận tối đa một nhắc việc mỗi ngày</p></div>
        </header>

        {message && <div role="status" style={{ marginBottom: 14, padding: 12, borderRadius: 6, color: message.error ? '#991b1b' : '#166534', background: message.error ? '#fef2f2' : '#f0fdf4' }}>{message.text}</div>}

        <section style={{ background: '#fff', border: '1px solid #dbe2ea', borderRadius: 8 }}>
          {loading ? <div style={{ padding: 20 }}>Đang tải cấu hình...</div> : configs.map(config => (
            <div key={config.stage_code} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 110px', gap: 16, alignItems: 'center', padding: 16, borderBottom: '1px solid #e2e8f0' }}>
              <div><strong>{stageNames[config.stage_code] || config.stage_code}</strong><div style={{ color: '#64748b', fontSize: 13 }}>Giai đoạn {config.stage_code}</div></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Ngày tối đa <input aria-label={`Ngày tối đa ${config.stage_code}`} type="number" min="1" max="365" value={config.max_days} onChange={event => updateConfig(config.stage_code, 'max_days', event.target.value)} style={{ width: 70, padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} /></label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569' }}><input type="checkbox" checked={Boolean(config.is_active)} onChange={event => updateConfig(config.stage_code, 'is_active', event.target.checked)} /> Bật SLA</label>
            </div>
          ))}
          {!loading && <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16 }}>
            <button onClick={runCheck} disabled={running} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}><FiPlay /> {running ? 'Đang kiểm tra...' : 'Chạy kiểm tra hôm nay'}</button>
            <button onClick={save} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', border: 0, borderRadius: 6, background: '#4f46e5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}><FiSave /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}</button>
          </div>}
        </section>
      </div>
    </main>
  );
};

export default SlaSettings;