/**
 * questionService.js
 * Business logic for Question Bank management (SCRUM-74).
 */

const questionRepository = require('../repositories/questionRepository');
const auditRepository    = require('../repositories/auditRepository');

/** Create an Error with an attached HTTP status code */
function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/** Normalize difficulty level to 'Easy' | 'Medium' | 'Hard' */
function normalizeDifficulty(diff) {
  if (!diff) return null;
  const upper = String(diff).trim().toUpperCase();
  if (upper === 'ALL' || upper === '' || upper === 'NULL' || upper === 'UNDEFINED' || upper === 'TẤT CẢ' || upper === 'TAT CA' || upper.includes('TẤT CẢ')) return null;
  if (upper === 'EASY' || upper.includes('EASY') || upper.includes('DỄ') || upper.includes('DE')) return 'Easy';
  if (upper === 'MEDIUM' || upper.includes('MEDIUM') || upper.includes('TRUNG BÌNH') || upper.includes('TRUNG BINH') || upper.includes('TB')) return 'Medium';
  if (upper === 'HARD' || upper.includes('HARD') || upper.includes('KHÓ') || upper.includes('KHO')) return 'Hard';
  return null;
}

/**
 * Get all questions with filters, search, and pagination.
 */
async function getAllQuestions(query = {}) {
  const {
    search = '',
    competency_criteria_id = '',
    criteriaId = '',
    difficulty_level = '',
    difficulty = '',
    page = 1,
    limit = 10,
    sortBy = 'id',
    sortOrder = 'DESC'
  } = query;

  const rawCriteria = competency_criteria_id || criteriaId;
  let parsedCriteriaId = null;
  if (rawCriteria && rawCriteria !== '' && rawCriteria !== 'ALL' && rawCriteria !== 'null' && rawCriteria !== 'undefined') {
    const num = parseInt(rawCriteria, 10);
    if (!isNaN(num) && num > 0) {
      parsedCriteriaId = num;
    }
  }

  const rawDifficulty = difficulty_level || difficulty;
  const normalizedDiff = normalizeDifficulty(rawDifficulty);

  const result = await questionRepository.findAll({
    search: search ? String(search).trim() : '',
    competency_criteria_id: parsedCriteriaId,
    difficulty_level: normalizedDiff,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    sortBy,
    sortOrder
  });

  try {
    const stats = await questionRepository.getSummaryStats();
    result.stats = stats;
  } catch (err) {
    result.stats = { total: 0, easyCount: 0, mediumCount: 0, hardCount: 0 };
  }

  return result;
}

/**
 * Get question by ID.
 */
async function getQuestionById(id) {
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    throw createError("ID câu hỏi không hợp lệ.", 400);
  }

  const question = await questionRepository.findById(parsedId);
  if (!question) {
    throw createError(`Không tìm thấy câu hỏi với ID ${parsedId}.`, 404);
  }

  return question;
}

/**
 * Create a new question.
 */
async function createQuestion(data, userId = null, ipAddress = null) {
  const {
    competency_criteria_id,
    criteriaId,
    difficulty_level,
    difficulty,
    question_text,
    questionText,
    sample_answer,
    sampleAnswer
  } = data;

  const targetCriteriaId = competency_criteria_id || criteriaId;
  const rawDifficulty = difficulty_level || difficulty;
  const rawText = question_text || questionText;
  const rawAnswer = sample_answer || sampleAnswer;

  // Validation
  if (!targetCriteriaId || isNaN(parseInt(targetCriteriaId, 10))) {
    throw createError("Tiêu chí năng lực (competency_criteria_id) là bắt buộc.", 400);
  }

  const normalizedDiff = normalizeDifficulty(rawDifficulty);
  if (!normalizedDiff) {
    throw createError("Mức độ khó (difficulty_level) không hợp lệ. Phải là 'Easy', 'Medium' hoặc 'Hard'.", 400);
  }

  if (!rawText || !rawText.trim()) {
    throw createError("Nội dung câu hỏi (question_text) không được để trống.", 400);
  }

  if (rawText.trim().length < 5) {
    throw createError("Nội dung câu hỏi quá ngắn (tối thiểu 5 ký tự).", 400);
  }

  const newId = await questionRepository.create({
    competency_criteria_id: parseInt(targetCriteriaId, 10),
    difficulty_level: normalizedDiff,
    question_text: rawText.trim(),
    sample_answer: rawAnswer ? rawAnswer.trim() : null
  });

  // Log audit
  try {
    await auditRepository.createLog({
      userId: null,
      performedBy: userId,
      action: 'QUESTION_CREATE',
      entityType: 'questions',
      entityId: String(newId),
      description: `Đã tạo mới câu hỏi ID ${newId} thuộc tiêu chí ID ${targetCriteriaId} (Độ khó: ${normalizedDiff})`,
      ipAddress
    });
  } catch (err) {
    console.error("Audit log failed for QUESTION_CREATE:", err.message);
  }

  return await questionRepository.findById(newId);
}

/**
 * Update an existing question.
 */
async function updateQuestion(id, data, userId = null, ipAddress = null) {
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    throw createError("ID câu hỏi không hợp lệ.", 400);
  }

  const existing = await questionRepository.findById(parsedId);
  if (!existing) {
    throw createError(`Không tìm thấy câu hỏi với ID ${parsedId}.`, 404);
  }

  const {
    competency_criteria_id,
    criteriaId,
    difficulty_level,
    difficulty,
    question_text,
    questionText,
    sample_answer,
    sampleAnswer
  } = data;

  const targetCriteriaId = competency_criteria_id || criteriaId || existing.competency_criteria_id;
  const rawDifficulty = difficulty_level || difficulty || existing.difficulty_level;
  const rawText = question_text !== undefined ? question_text : (questionText !== undefined ? questionText : existing.question_text);
  const rawAnswer = sample_answer !== undefined ? sample_answer : (sampleAnswer !== undefined ? sampleAnswer : existing.sample_answer);

  if (!targetCriteriaId || isNaN(parseInt(targetCriteriaId, 10))) {
    throw createError("Tiêu chí năng lực (competency_criteria_id) là bắt buộc.", 400);
  }

  const normalizedDiff = normalizeDifficulty(rawDifficulty);
  if (!normalizedDiff) {
    throw createError("Mức độ khó (difficulty_level) không hợp lệ. Phải là 'Easy', 'Medium' hoặc 'Hard'.", 400);
  }

  if (!rawText || !rawText.trim()) {
    throw createError("Nội dung câu hỏi (question_text) không được để trống.", 400);
  }

  if (rawText.trim().length < 5) {
    throw createError("Nội dung câu hỏi quá ngắn (tối thiểu 5 ký tự).", 400);
  }

  await questionRepository.update(parsedId, {
    competency_criteria_id: parseInt(targetCriteriaId, 10),
    difficulty_level: normalizedDiff,
    question_text: rawText.trim(),
    sample_answer: rawAnswer ? rawAnswer.trim() : null
  });

  // Log audit
  try {
    await auditRepository.createLog({
      userId: null,
      performedBy: userId,
      action: 'QUESTION_UPDATE',
      entityType: 'questions',
      entityId: String(parsedId),
      description: `Đã cập nhật câu hỏi ID ${parsedId}`,
      ipAddress
    });
  } catch (err) {
    console.error("Audit log failed for QUESTION_UPDATE:", err.message);
  }

  return await questionRepository.findById(parsedId);
}

/**
 * Delete a question by ID.
 */
async function deleteQuestion(id, userId = null, ipAddress = null) {
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    throw createError("ID câu hỏi không hợp lệ.", 400);
  }

  const existing = await questionRepository.findById(parsedId);
  if (!existing) {
    throw createError(`Không tìm thấy câu hỏi với ID ${parsedId}.`, 404);
  }

  await questionRepository.deleteById(parsedId);

  // Log audit
  try {
    await auditRepository.createLog({
      userId: null,
      performedBy: userId,
      action: 'QUESTION_DELETE',
      entityType: 'questions',
      entityId: String(parsedId),
      description: `Đã xóa câu hỏi ID ${parsedId} khỏi ngân hàng câu hỏi`,
      ipAddress
    });
  } catch (err) {
    console.error("Audit log failed for QUESTION_DELETE:", err.message);
  }

  return { id: parsedId, deleted: true };
}

/**
 * Get all criteria for dropdown selectors.
 */
async function getAllCriteria() {
  return await questionRepository.getAllCriteria();
}

/**
 * Get question bank summary statistics.
 */
async function getStats() {
  return await questionRepository.getSummaryStats();
}

module.exports = {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getAllCriteria,
  getStats
};
