/**
 * competencyService.js
 * Xử lý logic nghiệp vụ SCRUM-71: Kiểm tra tổng trọng số = 100%
 */
const competencyRepository = require('../repositories/competencyRepository');

const competencyService = {
  // Hàm kiểm tra tính hợp lệ của dữ liệu và trọng số
  validateFrameworkData(data) {
    const job_title = (data.job_title || data.position || '').trim();
    const framework_name = (data.framework_name || data.title || '').trim();
    const { criteria } = data;

    if (!job_title) {
      throw new Error('Chức danh (job_title) không được để trống.');
    }
    if (!framework_name) {
      throw new Error('Tên khung năng lực (framework_name) không được để trống.');
    }
    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      throw new Error('Khung năng lực phải có ít nhất 1 tiêu chí đánh giá.');
    }

    // Tính tổng trọng số
    let totalWeight = 0;
    for (const c of criteria) {
      const weight = Number(c.weight);
      if (isNaN(weight) || weight <= 0) {
        throw new Error(`Trọng số của tiêu chí "${c.criterion_name || 'chưa đặt tên'}" phải lớn hơn 0.`);
      }
      totalWeight += weight;
    }

    // Kiểm tra tổng trọng số có đúng 100% không (cho phép sai số làm tròn nhỏ 0.01)
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error(`Tổng trọng số các tiêu chí phải bằng đúng 100%. Hiện tại đang là: ${totalWeight}%.`);
    }
  },

  async getAllFrameworks() {
    return await competencyRepository.findAll();
  },

  async getFrameworkById(id) {
    const framework = await competencyRepository.findById(id);
    if (!framework) {
      throw new Error('Không tìm thấy khung năng lực với ID yêu cầu.');
    }
    return framework;
  },

  async createFramework(data) {
    this.validateFrameworkData(data);
    const newId = await competencyRepository.create(data);
    return await competencyRepository.findById(newId);
  },

  async updateFramework(id, data) {
    const existing = await competencyRepository.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy khung năng lực để cập nhật.');
    }
    this.validateFrameworkData(data);
    await competencyRepository.update(id, data);
    return await competencyRepository.findById(id);
  },

  async deleteFramework(id) {
    const existing = await competencyRepository.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy khung năng lực để xóa.');
    }
    return await competencyRepository.delete(id);
  }
};

module.exports = competencyService;