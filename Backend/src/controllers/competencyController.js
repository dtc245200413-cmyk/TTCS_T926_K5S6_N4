/**
 * competencyController.js
 * Tiếp nhận request HTTP và trả kết quả cho Client
 */
const competencyService = require('../services/competencyService');

const competencyController = {
  async getAll(req, res) {
    try {
      const data = await competencyService.getAllFrameworks();
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async getById(req, res) {
    try {
      const data = await competencyService.getFrameworkById(req.params.id);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  },

  async create(req, res) {
    try {
      const created = await competencyService.createFramework(req.body);
      return res.status(201).json({
        success: true,
        message: 'Tạo khung năng lực thành công.',
        data: created
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  },

  async update(req, res) {
    try {
      const updated = await competencyService.updateFramework(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Cập nhật khung năng lực thành công.',
        data: updated
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  },

  async delete(req, res) {
    try {
      await competencyService.deleteFramework(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Đã xóa khung năng lực thành công.'
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
};

module.exports = competencyController;