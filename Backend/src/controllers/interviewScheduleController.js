const service = require('../services/interviewScheduleService');
const { sendSuccess } = require('../utils/response');

function handle(work, message, status = 200) {
  return async (req, res, next) => {
    try { return sendSuccess(res, message, await work(req), status); }
    catch (error) { next(error); }
  };
}

module.exports = {
  getAll: handle(req => service.getAll(req.query, req.user), 'Lấy danh sách lịch thành công.'),
  getOptions: handle(req => service.getOptions(req.user), 'Lấy danh mục đặt lịch thành công.'),
  getById: handle(req => service.getById(req.params.id, req.user), 'Lấy lịch phỏng vấn thành công.'),
  create: handle(req => service.create(req.body, req.user), 'Tạo lịch phỏng vấn thành công.', 201),
  update: handle(req => service.update(req.params.id, req.body, req.user), 'Cập nhật lịch phỏng vấn thành công.'),
  cancel: handle(req => service.cancel(req.params.id, req.body, req.user), 'Hủy lịch phỏng vấn thành công.')
};
