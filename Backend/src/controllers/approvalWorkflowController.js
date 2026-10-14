/**
 * approvalWorkflowController.js
 */

const workflowService = require('../services/approvalWorkflowService');
const { sendSuccess, sendError } = require('../utils/response');
const { getIp } = require('../utils/roles');

exports.getAllWorkflows = async (req, res, next) => {
  try {
    const data = await workflowService.getAllWorkflows();
    return sendSuccess(res, 'Lấy danh sách cấu hình luồng phê duyệt thành công.', data);
  } catch (err) {
    next(err);
  }
};

exports.getApproverRoles = async (req, res, next) => {
  try {
    const roles = await workflowService.getApproverRoles();
    return sendSuccess(res, 'Lấy danh sách vai trò duyệt thành công.', roles);
  } catch (err) {
    next(err);
  }
};

exports.saveWorkflowScope = async (req, res, next) => {
  try {
    const { department_id, levels } = req.body;
    const result = await workflowService.saveWorkflowScope(
      department_id ? Number(department_id) : null,
      levels,
      req.user.user_id,
      getIp(req)
    );
    return sendSuccess(res, result.message, result);
  } catch (err) {
    next(err);
  }
};

exports.deleteDepartmentWorkflow = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const result = await workflowService.deleteDepartmentWorkflow(
      Number(departmentId),
      req.user.user_id,
      getIp(req)
    );
    return sendSuccess(res, result.message);
  } catch (err) {
    next(err);
  }
};

exports.previewApprovalChain = async (req, res, next) => {
  try {
    const { department_id, proposed_salary_min, proposed_salary_max } = req.body;
    const chain = await workflowService.resolveApprovalChain(
      department_id ? Number(department_id) : null,
      proposed_salary_max,
      proposed_salary_min
    );
    return sendSuccess(res, 'Xem trước chuỗi cấp duyệt thành công.', chain);
  } catch (err) {
    next(err);
  }
};

exports.getRequestApprovalSteps = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const steps = await workflowService.getApprovalHistoryForRequest(Number(requestId));
    return sendSuccess(res, 'Lấy lịch sử các bước duyệt thành công.', steps);
  } catch (err) {
    next(err);
  }
};

exports.handleStepAction = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { action, comment } = req.body;
    const updated = await workflowService.processStepApproval(
      Number(requestId),
      action,
      comment,
      req.user,
      getIp(req)
    );
    return sendSuccess(res, 'Xử lý bước phê duyệt thành công.', updated);
  } catch (err) {
    next(err);
  }
};
