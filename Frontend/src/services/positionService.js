import positionApi from '../api/positionApi';

const STORAGE_KEY = 'hr_positions_data';

const INITIAL_POSITIONS = [
  {
    position_id: 1,
    position_code: 'DEV-FE-JR',
    position_name: 'Lập trình viên Frontend (Junior)',
    position_level: 'Junior',
    min_salary: 12000000,
    max_salary: 18000000,
    status: 'ACTIVE',
    description: 'Phát triển giao diện ứng dụng web với ReactJS, HTML5/CSS3.',
  },
  {
    position_id: 2,
    position_code: 'DEV-FE-SR',
    position_name: 'Lập trình viên Senior Frontend',
    position_level: 'Senior',
    min_salary: 30000000,
    max_salary: 45000000,
    status: 'ACTIVE',
    description: 'Thiết kế kiến trúc giao diện, tối ưu hiệu năng và hướng dẫn Junior.',
  },
  {
    position_id: 3,
    position_code: 'DEV-BE-MID',
    position_name: 'Lập trình viên Backend (Middle)',
    position_level: 'Middle',
    min_salary: 20000000,
    max_salary: 32000000,
    status: 'ACTIVE',
    description: 'Xây dựng RESTful API, tối ưu truy vấn cơ sở dữ liệu và bảo mật hệ thống.',
  },
  {
    position_id: 4,
    position_code: 'QA-LEAD',
    position_name: 'Trưởng nhóm Kiểm thử (QA Lead)',
    position_level: 'Lead',
    min_salary: 28000000,
    max_salary: 42000000,
    status: 'ACTIVE',
    description: 'Quản lý quy trình kiểm thử phần mềm, automation test và đảm bảo chất lượng.',
  },
  {
    position_id: 5,
    position_code: 'HR-SPEC',
    position_name: 'Chuyên viên Tuyển dụng',
    position_level: 'Middle',
    min_salary: 14000000,
    max_salary: 22000000,
    status: 'ACTIVE',
    description: 'Tìm kiếm, sàng lọc hồ sơ ứng viên và điều phối phỏng vấn các phòng ban.',
  },
  {
    position_id: 6,
    position_code: 'HR-MGR',
    position_name: 'Trưởng phòng Nhân sự',
    position_level: 'Manager',
    min_salary: 40000000,
    max_salary: 65000000,
    status: 'ACTIVE',
    description: 'Hoạch định chiến lược nhân sự, kiểm soát khung dải lương và phê duyệt offer.',
  },
];

export const getLocalPositions = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_POSITIONS));
      return INITIAL_POSITIONS;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error('Lỗi khi đọc localStorage:', error);
    return INITIAL_POSITIONS;
  }
};

export const fetchPositions = async (params = {}) => {
  try {
    const res = await positionApi.getAll(params);
    if (res.data && res.data.data) {
      return res.data.data;
    }
    return getLocalPositions();
  } catch (err) {
    console.warn('Backend API chưa sẵn sàng hoặc ngoại tuyến, sử dụng dữ liệu offline:', err);
    return getLocalPositions();
  }
};

export const savePositionData = async (data) => {
  try {
    if (data.position_id) {
      const res = await positionApi.update(data.position_id, data);
      return res.data?.data;
    } else {
      const res = await positionApi.create(data);
      return res.data?.data;
    }
  } catch (err) {
    console.warn('Lưu vào LocalStorage do API ngoại tuyến:', err);
    const list = getLocalPositions();
    if (data.position_id) {
      const updated = list.map((p) =>
        p.position_id === data.position_id ? { ...p, ...data } : p
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return data;
    } else {
      const newPos = { ...data, position_id: Date.now() };
      const updated = [newPos, ...list];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return newPos;
    }
  }
};

export const deletePositionData = async (id) => {
  try {
    await positionApi.delete(id);
  } catch (err) {
    console.warn('Xóa khỏi LocalStorage:', err);
  }
  const list = getLocalPositions();
  const updated = list.filter((p) => p.position_id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const resetLocalPositions = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_POSITIONS));
  return INITIAL_POSITIONS;
};
