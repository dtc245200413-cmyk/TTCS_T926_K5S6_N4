import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiAlertCircle, FiArrowDown, FiArrowUp, FiCheck, FiGitBranch, FiPlus, FiRefreshCw, FiSave, FiTrash2 } from 'react-icons/fi';

const API = 'http://localhost:5000/api';

const ApprovalWorkflowSettings = () => {
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [workflows, setWorkflows] = useState({ globalLevels: [], departmentWorkflows: [] });
  const [scope, setScope] = useState('GLOBAL');
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [previewSalary, setPreviewSalary] = useState('25000000');
  const [previewSteps, setPreviewSteps] = useState([]);
  const [previewError, setPreviewError] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [workflowResponse, departmentResponse, roleResponse] = await Promise.all([
        axios.get(`${API}/approval-workflows`, { headers }),
        axios.get(`${API}/departments`, { headers }),
        axios.get(`${API}/approval-workflows/roles`, { headers })
      ]);
      const nextWorkflows = workflowResponse.data.data;
      const departmentData = departmentResponse.data.data;
      setWorkflows(nextWorkflows);
      setDepartments(Array.isArray(departmentData) ? departmentData : departmentData.departments || []);
      setRoles(roleResponse.data.data || []);
    } catch (error) {
      setFeedback({ type: 'error', text: error.response?.data?.message || 'Không thể tải cấu hình luồng duyệt.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const saved = scope === 'GLOBAL'
      ? workflows.globalLevels
      : workflows.departmentWorkflows.find(item => String(item.department_id) === scope)?.levels || workflows.globalLevels;
    setLevels(saved.map((level, index) => ({
      step_number: index + 1,
      step_name: level.step_name || '',
      step_description: level.step_description || '',
      approver_role_code: level.approver_role_code || '',
      min_salary: level.min_salary ?? (index === 0 ? 0 : ''),
      max_salary: level.max_salary ?? ''
    })));
  }, [scope, workflows]);

  const updateLevel = (index, field, value) => {
    setLevels(current => current.map((level, levelIndex) => (
      levelIndex === index ? { ...level, [field]: value } : level
    )));
  };

  const addLevel = () => {
    const previous = levels[levels.length - 1];
    const nextMin = previous && previous.max_salary !== ''
      ? Number(previous.max_salary) + 1
      : '';
    setLevels(current => [...current, {
      step_number: current.length + 1,
      step_name: '',
      step_description: '',
      approver_role_code: '',
      min_salary: nextMin,
      max_salary: ''
    }]);
  };

  const moveLevel = (index, offset) => {
    setLevels(current => {
      const targetIndex = index + offset;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      return reordered;
    });
  };

  const cancelChanges = () => {
    const saved = scope === 'GLOBAL'
      ? workflows.globalLevels
      : workflows.departmentWorkflows.find(item => String(item.department_id) === scope)?.levels || workflows.globalLevels;
    setLevels(saved.map((level, index) => ({
      step_number: index + 1,
      step_name: level.step_name || '',
      step_description: level.step_description || '',
      approver_role_code: level.approver_role_code || '',
      min_salary: level.min_salary ?? (index === 0 ? 0 : ''),
      max_salary: level.max_salary ?? ''
    })));
    setPreviewSteps([]);
    setFeedback(null);
  };

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        department_id: scope === 'GLOBAL' ? null : Number(scope),
        levels: levels.map((level, index) => ({
          step_number: index + 1,
          step_name: level.step_name.trim() || `Cấp duyệt ${index + 1}`,
          step_description: level.step_description.trim(),
          approver_role_code: level.approver_role_code,
          min_salary: Number(level.min_salary || 0),
          max_salary: level.max_salary === '' ? null : Number(level.max_salary)
        }))
      };
      const response = await axios.post(`${API}/approval-workflows/scope`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedback({ type: 'success', text: response.data.message || 'Đã lưu luồng duyệt.' });
      await loadSettings();
    } catch (error) {
      setFeedback({ type: 'error', text: error.response?.data?.message || 'Không thể lưu cấu hình.' });
    } finally {
      setSaving(false);
    }
  };

  const removeDepartmentWorkflow = async () => {
    if (scope === 'GLOBAL' || !window.confirm('Xóa cấu hình riêng để phòng ban dùng luồng toàn công ty?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/approval-workflows/scope/${scope}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedback({ type: 'success', text: 'Đã xóa cấu hình riêng; phòng ban sẽ dùng luồng toàn công ty.' });
      await loadSettings();
    } catch (error) {
      setFeedback({ type: 'error', text: error.response?.data?.message || 'Không thể xóa cấu hình.' });
    }
  };

  const previewWorkflow = async () => {
    setPreviewError('');
    setPreviewSteps([]);
    const salary = Number(previewSalary);
    if (!Number.isFinite(salary) || salary < 0) {
      setPreviewError('Nhập mức lương hợp lệ để xem trước.');
      return;
    }
    const applicable = levels.filter(level => salary >= Number(level.min_salary || 0));
    if (applicable.length === 0) {
      setPreviewError('Chưa có cấp duyệt áp dụng cho mức lương này.');
      return;
    }
    const steps = levels.map((level, index) => ({
      step_number: index + 1,
      step_name: level.step_name || `Cấp duyệt ${index + 1}`,
      approver_role_code: level.approver_role_code,
      min_salary: Number(level.min_salary || 0),
      max_salary: level.max_salary === '' ? null : Number(level.max_salary),
      is_applicable: salary >= Number(level.min_salary || 0),
      is_escalated: level.max_salary !== '' && salary > Number(level.max_salary)
    }));
    const highestLevel = applicable[applicable.length - 1];
    const exceedsTopLimit = highestLevel.max_salary !== '' && salary > Number(highestLevel.max_salary);
    const hasDirector = steps.some(step => step.approver_role_code === 'APPROVER');
    if (exceedsTopLimit && !hasDirector) {
      const directorRole = roles.find(role => role.role_code === 'APPROVER');
      steps.push({
        step_number: steps.length + 1,
        step_name: 'Giám đốc - duyệt vượt hạn mức',
        approver_role_code: 'APPROVER',
        min_salary: salary,
        max_salary: null,
        is_applicable: true,
        is_escalated: true,
        approver_role_name: directorRole?.role_name || 'Giám đốc'
      });
    }
    setPreviewSteps(steps);
  };

  const hasDepartmentOverride = workflows.departmentWorkflows.some(item => String(item.department_id) === scope);
  if (loading) return <div style={{ padding: 24 }}>Đang tải cấu hình...</div>;

  return (
    <main className="g-page-container" style={{ display: 'flex', flexDirection: 'column', margin: '-24px -22px -28px', padding: '12px 18px 4px', minHeight: 'calc(100vh - 92px)', width: 'calc(100% + 44px)', background: '#f8fafc' }}>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', width: '100%', minHeight: '100%', maxWidth: 'none', margin: 0 }}>
        <header className="g-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, marginBottom: 10 }}>
          <FiGitBranch size={22} color="#4f46e5" />
          <div>
            <h1 className="g-page-title" style={{ margin: 0, fontSize: 22, lineHeight: 1.15 }}>Cấu hình luồng phê duyệt</h1>
            <p className="g-page-subtitle" style={{ marginTop: 3, fontSize: 12 }}>Thiết lập cấp duyệt theo phòng ban và mức lương đề xuất</p>
          </div>
        </header>

        {feedback && (
          <div role="status" style={{ marginBottom: 16, padding: 12, borderRadius: 8, color: feedback.type === 'error' ? '#991b1b' : '#166534', background: feedback.type === 'error' ? '#fef2f2' : '#f0fdf4' }}>
            {feedback.text}
          </div>
        )}

        <section className="g-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, .85fr) minmax(300px, 1.3fr) auto', gap: 12, alignItems: 'center', margin: 0, padding: 10, background: '#fff', border: '1px solid #dbe3ef', borderRadius: 8 }}>
          <label style={{ display: 'grid', gap: 5, color: '#334155', fontWeight: 700, fontSize: 13 }} htmlFor="workflow-scope">
            {scope === 'GLOBAL' ? 'Phạm vi áp dụng' : <>Phòng ban <span style={{ color: '#ef4444' }}>*</span></>}
            <select className="g-form-input" id="workflow-scope" value={scope} onChange={event => setScope(event.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#172033', fontWeight: 500 }}>
              <option value="GLOBAL">Toàn công ty</option>
              {departments.map(department => (
                <option key={department.department_id} value={department.department_id}>{department.department_name}</option>
              ))}
            </select>
          </label>
          {scope !== 'GLOBAL' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 6, color: '#1d4ed8', background: '#eff6ff', fontSize: 11, lineHeight: 1.4 }}>
              <FiAlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>{hasDepartmentOverride ? 'Đang sử dụng cấu hình riêng cho phòng ban này' : 'Đang sử dụng cấu hình chung của công ty'}</strong>
                <div style={{ color: '#64748b' }}>{hasDepartmentOverride ? 'Các thay đổi chỉ áp dụng cho phòng ban này.' : 'Lưu cấu hình để tạo luồng riêng; nếu không, hệ thống dùng luồng chung.'}</div>
              </div>
            </div>
          )}
          {scope !== 'GLOBAL' && hasDepartmentOverride && (
              <button type="button" onClick={removeDepartmentWorkflow} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#334155', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <FiRefreshCw /> Đặt lại mặc định
            </button>
          )}
        </section>

        <section className="g-card" style={{ margin: '10px 0 0', padding: 0, background: '#fff', border: '1px solid #dbe3ef', borderRadius: 8, overflowX: 'auto' }}>
          <h2 style={{ margin: 0, padding: '9px 12px 6px', fontSize: 14, color: '#1e293b' }}>Danh sách cấp phê duyệt</h2>
          <div style={{ minWidth: 820 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 100px minmax(140px, 1.1fr) 100px 110px minmax(145px, 1.15fr) 80px', gap: 6, padding: '7px 10px', background: '#f1f5f9', color: '#475569', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
            <span>#</span><span>Tên bước</span><span>Vai trò duyệt</span><span>Lương từ (VNĐ)</span><span>Lương đến (VNĐ)</span><span>Ghi chú</span><span>Thao tác</span>
          </div>
          {levels.map((level, index) => (
            <div key={`${scope}-${index}`} style={{ display: 'grid', gridTemplateColumns: '28px 100px minmax(140px, 1.1fr) 100px 110px minmax(145px, 1.15fr) 80px', gap: 6, alignItems: 'center', padding: '5px 10px', borderTop: '1px solid #e2e8f0' }}>
              <strong style={{ textAlign: 'center', color: '#475569', fontSize: 12 }}>{index + 1}</strong>
              <input className="g-form-input" aria-label={`Tên cấp ${index + 1}`} value={level.step_name} onChange={event => updateLevel(index, 'step_name', event.target.value)} placeholder={`Cấp ${index + 1}`} style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '6px 7px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 5 }} />
              <select className="g-form-input" aria-label={`Vai trò cấp ${index + 1}`} value={level.approver_role_code} onChange={event => updateLevel(index, 'approver_role_code', event.target.value)} style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '6px 7px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 5, background: '#fff' }}>
                <option value="">Chọn vai trò</option>
                {roles.map(role => <option key={role.role_code} value={role.role_code}>{role.role_name} ({role.role_code})</option>)}
              </select>
              <input className="g-form-input" aria-label={`Lương tối thiểu cấp ${index + 1}`} type="number" min="0" value={level.min_salary} onChange={event => updateLevel(index, 'min_salary', event.target.value)} style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '6px 7px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 5 }} />
              <input className="g-form-input" aria-label={`Lương tối đa cấp ${index + 1}`} type="number" min="0" value={level.max_salary} onChange={event => updateLevel(index, 'max_salary', event.target.value)} placeholder="Không giới hạn" style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '6px 7px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 5 }} />
              <input className="g-form-input" aria-label={`Ghi chú cấp ${index + 1}`} value={level.step_description} onChange={event => updateLevel(index, 'step_description', event.target.value)} placeholder="Mô tả trách nhiệm duyệt" style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '6px 7px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 5 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <button type="button" title="Chuyển lên" aria-label={`Chuyển cấp ${index + 1} lên`} disabled={index === 0} onClick={() => moveLevel(index, -1)} style={{ display: 'grid', placeItems: 'center', width: 23, height: 25, border: '1px solid #e2e8f0', borderRadius: 4, color: index === 0 ? '#cbd5e1' : '#64748b', background: '#fff', cursor: index === 0 ? 'not-allowed' : 'pointer' }}><FiArrowUp size={12} /></button>
                <button type="button" title="Chuyển xuống" aria-label={`Chuyển cấp ${index + 1} xuống`} disabled={index === levels.length - 1} onClick={() => moveLevel(index, 1)} style={{ display: 'grid', placeItems: 'center', width: 23, height: 25, border: '1px solid #e2e8f0', borderRadius: 4, color: index === levels.length - 1 ? '#cbd5e1' : '#64748b', background: '#fff', cursor: index === levels.length - 1 ? 'not-allowed' : 'pointer' }}><FiArrowDown size={12} /></button>
                <button type="button" title="Xóa cấp duyệt" aria-label={`Xóa cấp ${index + 1}`} disabled={levels.length <= 1} onClick={() => setLevels(current => current.filter((_, levelIndex) => levelIndex !== index))} style={{ display: 'grid', placeItems: 'center', width: 23, height: 25, border: 0, borderRadius: 4, color: levels.length <= 1 ? '#cbd5e1' : '#ef4444', background: 'transparent', cursor: levels.length <= 1 ? 'not-allowed' : 'pointer' }}><FiTrash2 size={12} /></button>
              </div>
            </div>
          ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '8px 12px', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" onClick={addLevel} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 5, background: '#fff', color: '#334155', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              <FiPlus /> Thêm cấp duyệt
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '0 12px 10px', padding: '7px 9px', border: '1px solid #fed7aa', borderRadius: 5, color: '#9a3412', background: '#fff7ed', fontSize: 10, lineHeight: 1.35 }}>
            <FiAlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <div><strong>Lưu ý:</strong><ul style={{ margin: '2px 0 0', paddingLeft: 15 }}><li>Các khoảng lương không được chồng chéo và phải liên tiếp.</li><li>Nếu mức lương đề xuất vượt trần cao nhất, hệ thống tự thêm cấp Giám đốc.</li><li>Mỗi cấp phải có vai trò duyệt hợp lệ.</li></ul></div>
          </div>
        </section>

        <section className="g-card" style={{ display: 'grid', flex: '1 0 150px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', alignContent: 'stretch', gap: 12, margin: '10px 0 0', padding: 10, background: '#fff', border: '1px solid #dbe3ef', borderRadius: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
            <div><h2 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Xem trước luồng phê duyệt</h2><p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Nhập mức lương để xem các cấp sẽ được áp dụng</p></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ flex: 1 }}><span style={{ display: 'block', marginBottom: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>MỨC LƯƠNG ĐỀ XUẤT (VNĐ)</span><input className="g-form-input" type="number" min="0" value={previewSalary} onChange={event => setPreviewSalary(event.target.value)} placeholder="Ví dụ: 25.000.000" style={{ width: '100%', boxSizing: 'border-box', padding: 10, border: '1px solid #cbd5e1', borderRadius: 6 }} /></label>
              <button className="g-btn-primary" type="button" disabled={!previewSalary} onClick={previewWorkflow} style={{ alignSelf: 'end', padding: '8px 13px', borderRadius: 6, background: '#4f46e5', whiteSpace: 'nowrap' }}>Xem trước</button>
            </div>
            {previewError && <div role="alert" style={{ color: '#b91c1c', fontSize: 13 }}>{previewError}</div>}
          </div>
          <div style={{ display: 'flex', minWidth: 0, minHeight: 110, flexDirection: 'column', justifyContent: 'center', padding: 10, borderRadius: 7, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <strong style={{ display: 'block', marginBottom: 8, color: '#334155', fontSize: 11 }}>KẾT QUẢ LUỒNG PHÊ DUYỆT</strong>
            {previewSteps.length === 0 ? <div style={{ color: '#64748b', fontSize: 13 }}>Nhập mức lương và chọn “Xem trước” để kiểm tra.</div> : <>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, overflowX: 'auto', paddingBottom: 5 }}>
                {previewSteps.map((step, index) => (
                  <React.Fragment key={`${step.approver_role_code}-${index}`}>
                    {index > 0 && <span aria-hidden="true" style={{ alignSelf: 'center', color: '#94a3b8', fontSize: 20 }}>→</span>}
                    <div style={{ display: 'flex', flex: '1 0 112px', flexDirection: 'column', alignItems: 'center', gap: 5, textAlign: 'center', color: step.is_applicable ? '#1e293b' : '#64748b' }}>
                      <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 99, color: '#fff', background: step.is_applicable ? '#4f46e5' : '#94a3b8', fontSize: 12, fontWeight: 800 }}>{index + 1}</span>
                      <strong style={{ fontSize: 12 }}>{step.step_name}</strong>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{step.approver_role_code === 'APPROVER' ? '(Giám đốc)' : step.max_salary === null ? '(Không giới hạn)' : `(Đến ${Number(step.max_salary).toLocaleString('vi-VN')})`}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 99, color: step.is_applicable ? '#166534' : '#475569', background: step.is_applicable ? '#dcfce7' : '#e2e8f0', fontSize: 10, fontWeight: 700 }}>{step.is_applicable && <FiCheck />} {step.is_applicable ? 'Phải duyệt' : 'Không áp dụng'}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ marginTop: 8, padding: '7px 8px', borderRadius: 6, color: '#1d4ed8', background: '#eff6ff', fontSize: 11 }}>
                Với mức lương {Number(previewSalary).toLocaleString('vi-VN')} VNĐ, yêu cầu sẽ được duyệt bởi {previewSteps.filter(step => step.is_applicable).map(step => step.step_name).join(' và ')}.
              </div>
            </>}
          </div>
        </section>

        <footer style={{ position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'auto', padding: '7px 0', background: 'rgba(248,250,252,.96)', borderTop: '1px solid #e2e8f0' }}>
          <button className="g-btn-secondary" type="button" onClick={cancelChanges} disabled={saving} style={{ padding: '7px 12px', borderRadius: 5, fontSize: 12 }}>Hủy thay đổi</button>
          <button className="g-btn-primary" type="button" onClick={save} disabled={saving || levels.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 5, background: '#4f46e5', fontSize: 12 }}><FiSave /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}</button>
        </footer>
      </div>
    </main>
  );
};

export default ApprovalWorkflowSettings;