/**
 * interviewQuestionService.js
 */

const questionRepo = require('../repositories/interviewQuestionRepository');
const auditRepo = require('../repositories/auditRepository');

async function getAllQuestions(query) {
  const result = await questionRepo.getAll(query);
  const limit = parseInt(query.limit, 10) || 20;
  const page = parseInt(query.page, 10) || 1;

  return {
    data: result.data,
    meta: {
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    }
  };
}

async function getQuestionById(id) {
  const question = await questionRepo.findById(id);
  if (!question) {
    const error = new Error('Câu hỏi không tồn tại.');
    error.statusCode = 404;
    throw error;
  }
  return question;
}

async function createQuestion(data, performedByUserId, ipAddress) {
  const { criteriaId, questionContent, difficultyLevel, goodAnswerHint } = data;

  if (!criteriaId || !questionContent) {
    const error = new Error('Tiêu chí và Nội dung câu hỏi là bắt buộc.');
    error.statusCode = 400;
    throw error;
  }

  const insertId = await questionRepo.create({
    criteriaId,
    questionContent,
    difficultyLevel,
    goodAnswerHint
  });

  const newQuestion = await getQuestionById(insertId);

  await auditRepo.create({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'INTERVIEW_QUESTION_CREATED',
    entityType: 'interview_questions',
    entityId: String(insertId),
    description: `Created interview question for criteria ID ${criteriaId}`,
    ipAddress
  });

  return newQuestion;
}

async function updateQuestion(id, data, performedByUserId, ipAddress) {
  const question = await questionRepo.findById(id);
  if (!question) {
    const error = new Error('Câu hỏi không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  const { criteria_id, question_content, difficulty_level, good_answer_hint } = data;
  const fields = {};

  if (criteria_id !== undefined) fields.criteria_id = criteria_id;
  if (question_content !== undefined) fields.question_content = question_content;
  if (difficulty_level !== undefined) fields.difficulty_level = difficulty_level;
  if (good_answer_hint !== undefined) fields.good_answer_hint = good_answer_hint;

  await questionRepo.update(id, fields);

  const updatedQuestion = await getQuestionById(id);

  await auditRepo.create({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'INTERVIEW_QUESTION_UPDATED',
    entityType: 'interview_questions',
    entityId: String(id),
    description: `Updated interview question ${id}`,
    ipAddress
  });

  return updatedQuestion;
}

async function deleteQuestion(id, performedByUserId, ipAddress) {
  const question = await questionRepo.findById(id);
  if (!question) {
    const error = new Error('Câu hỏi không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  await questionRepo.deleteQuestion(id);

  await auditRepo.create({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'INTERVIEW_QUESTION_DELETED',
    entityType: 'interview_questions',
    entityId: String(id),
    description: `Deleted interview question ${id}`,
    ipAddress
  });

  return true;
}

async function getCriteriaOptions() {
  return await questionRepo.getAllCriteria();
}

module.exports = {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getCriteriaOptions
};
