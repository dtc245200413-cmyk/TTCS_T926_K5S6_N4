const { pool } = require('../config/database');
const { lockCandidates, withCandidateTransaction } = require('../utils/candidateTransaction');

const phoneDigitsSql = (column) => `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), ' ', ''), '-', ''), '+', ''), '(', ''), ')', ''), '.', '')`;

async function findPotentialDuplicates({ candidateId = null, email = '', phone = '' }) {
  const conditions = [];
  const params = [];
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  if (normalizedEmail) {
    conditions.push('LOWER(TRIM(c.email)) = ?');
    params.push(normalizedEmail);
  }
  if (normalizedPhone) {
    conditions.push(`${phoneDigitsSql('c.phone')} = ?`);
    params.push(normalizedPhone);
  }
  if (!conditions.length) return [];

  let excludeClause = '';
  if (candidateId) {
    excludeClause = 'AND c.id <> ?';
    params.push(candidateId);
  }

  const [rows] = await pool.query(`
    SELECT c.*, d.department_name, p.position_name
    FROM candidates c
    LEFT JOIN recruitment_requests r ON r.id = c.recruitment_request_id
    LEFT JOIN departments d ON d.department_id = r.department_id
    LEFT JOIN job_positions p ON p.position_id = r.position_id
    WHERE c.merged_into_id IS NULL
      AND (${conditions.join(' OR ')}) ${excludeClause}
    ORDER BY c.created_at DESC
    LIMIT 20
  `, params);
  return rows;
}

async function mergeCandidates({ primaryId, secondaryId, chosenFields, mergedBy }) {
  return withCandidateTransaction(async connection => {
    const candidates = await lockCandidates(connection, [primaryId, secondaryId]);
    const primary = candidates.find(candidate => Number(candidate.id) === Number(primaryId));
    const secondary = candidates.find(candidate => Number(candidate.id) === Number(secondaryId));
    if (!primary || !secondary) throw Object.assign(new Error('Không tìm thấy một trong hai hồ sơ.'), { statusCode: 404 });
    if (primary.id === secondary.id) throw Object.assign(new Error('Không thể gộp một hồ sơ với chính nó.'), { statusCode: 400 });
    if (primary.merged_into_id || secondary.merged_into_id) {
      throw Object.assign(new Error('Một hồ sơ đã được gộp trước đó.'), { statusCode: 409 });
    }

    const fields = ['full_name', 'email', 'phone', 'source_code', 'recruitment_request_id', 'status'];
    const mergedValues = {};
    const fieldSources = {};
    for (const field of fields) {
      const requestedSource = chosenFields?.[field];
      const primaryIsEmpty = primary[field] === null || primary[field] === undefined || primary[field] === '';
      const source = ['primary', 'secondary'].includes(requestedSource)
        ? requestedSource
        : (primaryIsEmpty ? 'secondary' : 'primary');
      fieldSources[field] = source;
      mergedValues[field] = source === 'secondary' ? secondary[field] : primary[field];
    }

    const setClauses = fields.map(field => `\`${field}\` = ?`).join(', ');
    await connection.execute(
      `UPDATE candidates SET ${setClauses} WHERE id = ?`,
      [...fields.map(field => mergedValues[field]), primaryId]
    );

    const [childTables] = await connection.execute(`
      SELECT table_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND column_name = ?
    `, ['candidate_id']);
    const movedChildren = [];
    for (const childTable of childTables) {
      const tableName = childTable.table_name || childTable.TABLE_NAME;
      const safeTableName = String(tableName).replace(/[^a-zA-Z0-9_]/g, '');
      if (!safeTableName || safeTableName === 'sla_reminders') continue;
      // SCRUM-337 tags have a composite key, not an id column. Keep shared tags
      // on the secondary record so undo can restore both profiles without data loss.
      if (safeTableName === 'candidate_tags') {
        const [tags] = await connection.execute(
          'SELECT candidate_id, tag_id FROM candidate_tags WHERE candidate_id IN (?, ?) FOR UPDATE',
          [primaryId, secondaryId]
        );
        const existing = new Set(tags.filter(tag => Number(tag.candidate_id) === Number(primaryId)).map(tag => Number(tag.tag_id)));
        const tagIds = tags.filter(tag => Number(tag.candidate_id) === Number(secondaryId) && !existing.has(Number(tag.tag_id))).map(tag => tag.tag_id);
        if (tagIds.length) {
          await connection.execute(
            `UPDATE candidate_tags SET candidate_id = ? WHERE candidate_id = ? AND tag_id IN (${tagIds.map(() => '?').join(',')})`,
            [primaryId, secondaryId, ...tagIds]
          );
          movedChildren.push({ table: safeTableName, tag_ids: tagIds });
        }
        continue;
      }
      if (safeTableName === 'candidate_ratings') {
        const [ratings] = await connection.execute(
          'SELECT candidate_id, reviewer_id FROM candidate_ratings WHERE candidate_id IN (?, ?) FOR UPDATE',
          [primaryId, secondaryId]
        );
        const reviewers = new Set(ratings.filter(row => Number(row.candidate_id) === Number(primaryId)).map(row => Number(row.reviewer_id)));
        if (ratings.some(row => Number(row.candidate_id) === Number(secondaryId) && reviewers.has(Number(row.reviewer_id)))) {
          throw Object.assign(new Error('Không thể gộp: cùng một người đã đánh giá cả hai hồ sơ. Các đánh giá được giữ nguyên; vui lòng kiểm tra trước khi gộp.'), { statusCode: 409 });
        }
      }
      const [rows] = await connection.execute(
        `SELECT id FROM \`${safeTableName}\` WHERE candidate_id = ?`,
        [secondaryId]
      );
      if (!rows.length) continue;
      await connection.execute(`UPDATE \`${safeTableName}\` SET candidate_id = ? WHERE candidate_id = ?`, [primaryId, secondaryId]);
      movedChildren.push({ table: safeTableName, ids: rows.map(row => row.id) });
    }

    await connection.execute(
      'UPDATE candidates SET merged_into_id = ?, merged_at = NOW() WHERE id = ?',
      [primaryId, secondaryId]
    );
    const [result] = await connection.execute(`
      INSERT INTO candidate_merges
        (primary_id, secondary_id, primary_snapshot, secondary_snapshot, chosen_fields, moved_children, status, merged_by, merged_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, NOW())
    `, [
      primaryId,
      secondaryId,
      JSON.stringify(primary),
      JSON.stringify(secondary),
      JSON.stringify(fieldSources),
      JSON.stringify(movedChildren),
      mergedBy
    ]);
    return result.insertId;
  });
}

async function findActiveMerges() {
  const [rows] = await pool.query(`
    SELECT m.id, m.primary_id, m.secondary_id, m.primary_snapshot, m.secondary_snapshot,
           m.merged_at, TIMESTAMPDIFF(HOUR, m.merged_at, NOW()) AS hours_since_merge,
           p.full_name AS primary_name, s.full_name AS secondary_name
    FROM candidate_merges m
    JOIN candidates p ON p.id = m.primary_id
    JOIN candidates s ON s.id = m.secondary_id
    WHERE m.status = 'ACTIVE'
    ORDER BY m.merged_at DESC
  `);
  return rows;
}

async function undoMerge(mergeId, userId) {
  return withCandidateTransaction(async connection => {
    const [rows] = await connection.execute(
      'SELECT *, TIMESTAMPDIFF(SECOND, merged_at, NOW()) AS seconds_since_merge FROM candidate_merges WHERE id = ? FOR UPDATE',
      [mergeId]
    );
    const merge = rows[0];
    if (!merge || merge.status !== 'ACTIVE') throw Object.assign(new Error('Không tìm thấy lịch sử gộp còn hiệu lực.'), { statusCode: 404 });
    if (Number(merge.seconds_since_merge) > 24 * 60 * 60) {
      throw Object.assign(new Error('Chỉ có thể hoàn tác trong vòng 24 giờ sau khi gộp.'), { statusCode: 400 });
    }
    await lockCandidates(connection, [merge.primary_id, merge.secondary_id]);

    const primary = typeof merge.primary_snapshot === 'string' ? JSON.parse(merge.primary_snapshot) : merge.primary_snapshot;
    const secondary = typeof merge.secondary_snapshot === 'string' ? JSON.parse(merge.secondary_snapshot) : merge.secondary_snapshot;
    const fields = ['full_name', 'email', 'phone', 'source_code', 'recruitment_request_id', 'status'];
    const setClauses = fields.map(field => `\`${field}\` = ?`).join(', ');
    await connection.execute(
      `UPDATE candidates SET ${setClauses} WHERE id = ?`,
      [...fields.map(field => primary[field]), merge.primary_id]
    );
    await connection.execute(
      `UPDATE candidates SET ${setClauses}, merged_into_id = NULL, merged_at = NULL WHERE id = ?`,
      [...fields.map(field => secondary[field]), merge.secondary_id]
    );

    const movedChildren = typeof merge.moved_children === 'string' ? JSON.parse(merge.moved_children) : merge.moved_children || [];
    for (const child of movedChildren) {
      const tableName = String(child.table || '').replace(/[^a-zA-Z0-9_]/g, '');
      if (tableName === 'candidate_tags' && Array.isArray(child.tag_ids) && child.tag_ids.length) {
        await connection.execute(
          `UPDATE candidate_tags SET candidate_id = ? WHERE candidate_id = ? AND tag_id IN (${child.tag_ids.map(() => '?').join(',')})`,
          [merge.secondary_id, merge.primary_id, ...child.tag_ids]
        );
        continue;
      }
      const ids = Array.isArray(child.ids) ? child.ids : [];
      if (!tableName || !ids.length) continue;
      const placeholders = ids.map(() => '?').join(',');
      await connection.execute(
        `UPDATE \`${tableName}\` SET candidate_id = ? WHERE candidate_id = ? AND id IN (${placeholders})`,
        [merge.secondary_id, merge.primary_id, ...ids]
      );
    }

    await connection.execute(
      "UPDATE candidate_merges SET status = 'UNDONE', undone_by = ?, undone_at = NOW() WHERE id = ?",
      [userId, mergeId]
    );
    return { primary_id: merge.primary_id, secondary_id: merge.secondary_id };
  });
}

module.exports = { findPotentialDuplicates, mergeCandidates, findActiveMerges, undoMerge };
