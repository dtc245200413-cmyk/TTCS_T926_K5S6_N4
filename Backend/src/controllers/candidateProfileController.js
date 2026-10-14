const service = require('../services/candidateProfileService');
const { sendSuccess } = require('../utils/response');

function handle(work, message, status = 200) {
  return async (req, res, next) => {
    try {
      const result = await work(req);
      return sendSuccess(res, message, result, status);
    } catch (error) { next(error); }
  };
}

module.exports = {
  getTags: handle(req => service.getTags(req.params.id, req.user), 'Lấy nhãn thành công.'),
  addTag: handle(req => service.addTag(req.params.id, req.body, req.user), 'Gắn nhãn thành công.', 201),
  removeTag: handle(req => service.removeTag(req.params.id, req.params.tagId, req.user), 'Bỏ nhãn thành công.'),
  getNotes: handle(req => service.getNotes(req.params.id, req.user), 'Lấy ghi chú thành công.'),
  addNote: handle(req => service.addNote(req.params.id, req.body, req.user), 'Thêm ghi chú thành công.', 201)
};
