import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import budgetApi from '../api/departmentBudgetApi';
import { budgetError } from '../utils/recruitmentBudget';

export default function useDepartmentBudget(departmentId, year) {
  const { hasPermission } = useContext(AuthContext);
  const allowed = hasPermission('DEPARTMENT_BUDGET_VIEW');
  const ready = Boolean(departmentId && /^\d{4}$/.test(String(year)) && Number(year) >= 1000);
  const key = `${departmentId}:${year}:${allowed}`;
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({});
  useEffect(() => {
    if (!ready || !allowed) return;
    const controller = new AbortController();
    setState({ key, loading: true });
    budgetApi.availability(departmentId, year, { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setState({ key, data: response.data.data }); })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: budgetError(error) }); });
    return () => controller.abort();
  }, [departmentId, year, ready, allowed, key, version]);

  const current = state.key === key ? state : {};
  return {
    data: ready && allowed ? current.data : null,
    loading: ready && allowed && (state.key !== key || Boolean(current.loading)),
    error: !ready ? 'Chọn phòng ban và ngày cần người để xem chỉ tiêu.' : !allowed ? 'Bạn chưa có quyền xem chỉ tiêu phòng ban.' : current.error,
    refresh: () => { setState({ key, loading: true }); setVersion(value => value + 1); },
    replace: data => setState({ key, data }),
  };
}
