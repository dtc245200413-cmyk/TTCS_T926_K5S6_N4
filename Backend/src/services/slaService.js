const repository = require('../repositories/slaRepository');
const notificationRepository = require('../repositories/notificationRepository');
const { pool } = require('../config/database');
const { httpError } = require('../utils/roles');

const CONFIGURABLE_STAGES = new Set(['NEW', 'INTERVIEWING', 'OFFERED']);
let activeRun = null;

async function getConfigs() {
  return repository.getConfigs();
}

async function saveConfigs(configs, userId) {
  if (!Array.isArray(configs) || configs.length === 0) {
    throw httpError('Cần cấu hình ít nhất một giai đoạn SLA.', 400);
  }
  const seenStages = new Set();
  for (const config of configs) {
    const stageCode = String(config.stage_code || '').trim().toUpperCase();
    const maxDays = Number(config.max_days);
    if (!CONFIGURABLE_STAGES.has(stageCode)) throw httpError(`Giai đoạn SLA không hợp lệ: ${stageCode || '(trống)'}.`, 400);
    if (seenStages.has(stageCode)) throw httpError(`Giai đoạn ${stageCode} bị lặp.`, 400);
    if (!Number.isInteger(maxDays) || maxDays < 1 || maxDays > 365) {
      throw httpError(`Số ngày SLA của ${stageCode} phải từ 1 đến 365.`, 400);
    }
    seenStages.add(stageCode);
    await repository.saveConfig({ stageCode, maxDays, isActive: config.is_active !== false, userId });
  }
  return repository.getConfigs();
}

async function runDailySlaCheck(triggerType = 'SCHEDULED') {
  if (activeRun) return activeRun;
  activeRun = (async () => {
    const connection = await pool.getConnection();
    let runId = null;
    try {
      await connection.beginTransaction();
      const run = await repository.beginDailyRun(connection);
      runId = run.id;
      if (!run.started) {
        await connection.commit();
        return { skipped: true, reason: run.reason || 'Đã chạy SLA hôm nay.' };
      }
      if (triggerType !== 'SCHEDULED') {
        await connection.execute(
          "UPDATE scheduled_job_runs SET trigger_type = ? WHERE id = ?",
          [triggerType, runId]
        );
      }
      await connection.commit();

      const candidates = await repository.findOverdueCandidates();
      let remindersCreated = 0;
      for (const candidate of candidates) {
        await repository.markOverdue(candidate.id);
        const recipients = await repository.getRecipients(candidate);
        for (const recipientId of recipients) {
          const reminderConnection = await pool.getConnection();
          try {
            await reminderConnection.beginTransaction();
            const created = await repository.createReminder(
              candidate.id,
              recipientId,
              candidate.stage_code,
              candidate.overdue_days,
              reminderConnection
            );
            if (created) {
              await notificationRepository.create({
                userId: recipientId,
                title: `Ứng viên quá hạn SLA: ${candidate.full_name}`,
                message: `Hồ sơ đang ở giai đoạn ${candidate.stage_code}, quá hạn ${candidate.overdue_days} ngày. Vui lòng xử lý.`,
                type: 'CANDIDATE_SLA_OVERDUE',
                link: '/candidates'
              }, reminderConnection);
              remindersCreated += 1;
            }
            await reminderConnection.commit();
          } catch (error) {
            await reminderConnection.rollback();
            throw error;
          } finally {
            reminderConnection.release();
          }
        }
      }

      const summary = { overdue_candidates: candidates.length, reminders_created: remindersCreated };
      await repository.finishDailyRun(runId, 'SUCCESS', summary);
      return { skipped: false, ...summary };
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      await repository.finishDailyRun(runId, 'FAILED', { error: error.message }).catch(() => {});
      throw error;
    } finally {
      connection.release();
      activeRun = null;
    }
  })();
  return activeRun;
}

module.exports = { getConfigs, saveConfigs, runDailySlaCheck };