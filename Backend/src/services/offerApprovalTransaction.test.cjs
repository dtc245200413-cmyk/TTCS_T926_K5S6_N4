'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createOfferApprovalTransaction } = require('./offerApprovalTransaction');

const assignment = {
  offer_id: 17, application_id: 19, row_version: 4,
  submission_id: 29, submission_number: 2, offer_row_version: 4,
  approver_id: 11, assigned_by: 12,
  assignment_source: 'trusted-workflow', assignment_reference: 'assignment:29', assignment_version: '2',
  decision_source: 'verified-decision', decision_reference: 'decision:9', decision_version: '1'
};
function fixture({
  offer = { id: 17, application_id: 19, row_version: 4, status: 'PENDING_APPROVAL', created_by: 7 },
  assignments = [assignment], updateRows = 1, historyId = 101,
  sqlErrorAt, mismatchProof = {}, auditReturn, outboxReturn
} = {}) {
  const steps = [];
  let conn;
  let auditEvents = [], outboxEvents = [];
  const fault = point => {
    if (sqlErrorAt?.point === point) throw Object.assign(new Error('PRIVATE SQL DETAILS'), {
      code: sqlErrorAt.code, errno: sqlErrorAt.errno
    });
  };
  conn = {
    beginTransaction: async () => { steps.push('BEGIN'); fault('begin'); },
    commit: async () => { steps.push('COMMIT'); fault('commit'); },
    rollback: async () => { steps.push('ROLLBACK'); },
    release: () => { steps.push('RELEASE'); },
    execute: async (sql, args) => {
      if (sql.includes('SELECT id, application_id') && sql.includes('FROM candidate_offers')) {
        steps.push(['LOCK_OFFER', sql, args]); fault('lock');
        return [offer ? [offer] : []];
      }
      if (sql.includes('JOIN offer_submissions')) {
        steps.push(['READ_ASSIGNMENT', sql, args]); fault('assignment');
        return [assignments];
      }
      if (sql.includes('UPDATE candidate_offers')) {
        steps.push(['UPDATE', sql, args]); fault('update');
        return [{ affectedRows: updateRows }];
      }
      if (sql.includes('INSERT INTO offer_approvals')) {
        steps.push(['HISTORY', sql, args]); fault('history');
        return [{ insertId: historyId }];
      }
      throw Error('Unexpected SQL: ' + sql);
    }
  };
  const pool = { getConnection: async () => { steps.push('GET_CONNECTION'); return conn; } };
  const verifyProvenance = async ({ conn: sameConn, evidence }) => {
    assert.equal(sameConn, conn);
    steps.push('VERIFY_PROVENANCE');
    fault('provenance');
    return {
      verified: true, offer_id: evidence.offer_id, application_id: evidence.application_id,
      submission_id: evidence.submission_id, approver_id: evidence.approver_id,
      offer_row_version: evidence.offer_row_version,
      assignment_reference: evidence.assignment_reference,
      assignment_version: evidence.assignment_version, ...mismatchProof
    };
  };
  const ack = event => ({ acknowledged: true, id: 201,
    offer_id: event.offer_id, submission_id: event.submission_id,
    actor_user_id: event.actor_user_id });
  const writeAudit = async ({ conn: sameConn, event }) => {
    assert.equal(sameConn, conn);
    auditEvents.push(event); steps.push('AUDIT'); fault('audit');
    return auditReturn === undefined ? ack(event) : auditReturn;
  };
  const enqueueOutbox = async ({ conn: sameConn, event }) => {
    assert.equal(sameConn, conn);
    outboxEvents.push(event); steps.push('OUTBOX'); fault('outbox');
    return outboxReturn === undefined ? ack(event) : outboxReturn;
  };
  const transaction = createOfferApprovalTransaction({ pool, verifyProvenance, writeAudit, enqueueOutbox });
  const request = { offerId: 17, actorUserId: 11, expectedRowVersion: 4, action: 'APPROVED' };
  return { transaction, request, steps, auditEvents, outboxEvents, conn };
}

for (const [action, status, reason] of [
  ['APPROVED', 'APPROVED', undefined],
  ['REJECTED', 'REJECTED', 'Policy mismatch'],
  ['REQUEST_CHANGE', 'CHANGE_REQUESTED', 'Please revise salary']
]) {
  test(`${action}: locked, assigned, version-CAS, history, audit and outbox before commit`, async () => {
    const f = fixture();
    const result = await f.transaction.decide({ ...f.request, action, reason });
    assert.deepEqual(result, {
      offer_id: 17, submission_id: 29, row_version: 5, status, action,
      notification_status: 'QUEUED_NOT_DELIVERED'
    });
    assert.deepEqual(f.steps.map(x => typeof x === 'string' ? x : x[0]), [
      'GET_CONNECTION', 'BEGIN', 'LOCK_OFFER', 'READ_ASSIGNMENT',
      'VERIFY_PROVENANCE', 'UPDATE', 'HISTORY', 'AUDIT', 'OUTBOX', 'COMMIT', 'RELEASE'
    ]);
    const update = f.steps.find(x => x[0] === 'UPDATE');
    assert.match(update[1], /WHERE id = \? AND status = 'PENDING_APPROVAL' AND row_version = \?/);
    assert.deepEqual(update[2], [status, action, 17, 4]);
    const assignmentSql = f.steps.find(x => x[0] === 'READ_ASSIGNMENT')[1];
    assert.match(assignmentSql, /a\.revoked_at IS NULL/);
    assert.match(assignmentSql, /FROM user_roles ur/);
    assert.match(assignmentSql, /MAX\(last_sub\.submission_number\)/);
    assert.equal(f.auditEvents.length, 1);
    assert.equal(f.outboxEvents.length, 1);
    assert.equal(f.auditEvents[0].submission_id, 29);
    assert.equal(f.auditEvents[0].approval_history_id, 101);
    assert.equal(f.auditEvents[0].reason, reason || null);
  });
}

test('requires all three trusted evidence/audit/outbox callbacks before DB access', async () => {
  for (const missing of ['verifyProvenance', 'writeAudit', 'enqueueOutbox', 'pool']) {
    let opens = 0;
    const adapters = { pool: { getConnection: async () => { opens++; } },
      verifyProvenance: async () => ({}), writeAudit: async () => ({}), enqueueOutbox: async () => ({}) };
    delete adapters[missing];
    await assert.rejects(createOfferApprovalTransaction(adapters).decide({
      offerId: 17, actorUserId: 11, expectedRowVersion: 4, action: 'APPROVED'
    }), { statusCode: 503, code: 'OFFER_APPROVAL_WRITER_NOT_CONNECTED' });
    assert.equal(opens, 0);
  }
});

test('untrusted or malformed input rejects before DB access', async () => {
  for (const change of [
    { offerId: 0 }, { offerId: '17 OR 1=1' }, { actorUserId: '11.1' },
    { expectedRowVersion: null }, { action: 'PENDING_RESPONSE' },
    { action: 'REJECTED', reason: '' }, { action: 'REQUEST_CHANGE', reason: '  ' },
    { reason: 1234 }, { reason: 'a'.repeat(4001) }
  ]) {
    const f = fixture();
    await assert.rejects(f.transaction.decide({ ...f.request, ...change }), { statusCode: 400 });
    assert.deepEqual(f.steps, []);
  }
});

test('no Offer row denies without disclosing sensitive fields', async () => {
  const f = fixture({ offer: null });
  await assert.rejects(f.transaction.decide(f.request), e => e.statusCode === 403 && !e.message.includes('salary'));
  assert.deepEqual(f.steps.slice(-2), ['ROLLBACK', 'RELEASE']);
  assert.equal(f.steps.some(x => x[0] === 'UPDATE'), false);
});

test('wrong status or stale row version never queries assignments', async () => {
  for (const offer of [
    { id: 17, application_id: 19, status: 'APPROVED', row_version: 4 },
    { id: 17, application_id: 19, status: 'PENDING_APPROVAL', row_version: 5 }
  ]) {
    const f = fixture({ offer });
    await assert.rejects(f.transaction.decide(f.request), { statusCode: 409 });
    assert.equal(f.steps.some(x => x[0] === 'READ_ASSIGNMENT'), false);
    assert.deepEqual(f.steps.slice(-2), ['ROLLBACK', 'RELEASE']);
  }
});

test('missing or ambiguous assignment denies writes', async () => {
  for (const assignments of [[], [assignment, assignment]]) {
    const f = fixture({ assignments });
    await assert.rejects(f.transaction.decide(f.request), { statusCode: 403 });
    assert.equal(f.steps.some(x => x[0] === 'UPDATE'), false);
    assert.deepEqual(f.steps.slice(-2), ['ROLLBACK', 'RELEASE']);
  }
});

test('untrusted provenance, wrong application or withdrawn assignment deny writes', async () => {
  for (const options of [
    { mismatchProof: { verified: false } },
    { mismatchProof: { submission_id: 999 } },
    { assignments: [{ ...assignment, application_id: 222 }] },
    { assignments: [{ ...assignment, approver_id: 999 }] }
  ]) {
    const f = fixture(options);
    await assert.rejects(f.transaction.decide(f.request), { statusCode: 403 });
    assert.equal(f.steps.some(x => x[0] === 'UPDATE'), false);
  }
});

test('optimistic update with zero affected rows rolls back without history', async () => {
  const f = fixture({ updateRows: 0 });
  await assert.rejects(f.transaction.decide(f.request), { statusCode: 409 });
  assert.equal(f.steps.some(x => x[0] === 'HISTORY'), false);
  assert.deepEqual(f.steps.slice(-2), ['ROLLBACK', 'RELEASE']);
});

test('history insert failure prevents audit, outbox and commit', async () => {
  const f = fixture({ historyId: 0 });
  await assert.rejects(f.transaction.decide(f.request), { statusCode: 503 });
  assert.deepEqual(f.steps.slice(-2), ['ROLLBACK', 'RELEASE']);
  assert.equal(f.steps.includes('AUDIT'), false);
});

test('audit and outbox errors each roll back the state/history transaction', async () => {
  for (const point of ['audit', 'outbox']) {
    const f = fixture({ sqlErrorAt: { point, code: 'MOCK_ADAPTER_FAULT' } });
    await assert.rejects(f.transaction.decide(f.request), /PRIVATE SQL DETAILS/);
    assert.equal(f.steps.includes('COMMIT'), false);
    assert.deepEqual(f.steps.slice(-2), ['ROLLBACK', 'RELEASE']);
  }
});

test('audit and outbox must provide matching durable acknowledgements', async () => {
  const badAck = { acknowledged: true, id: 201, offer_id: 17,
    submission_id: 999, actor_user_id: 11 };
  for (const options of [{ auditReturn: badAck }, { outboxReturn: badAck },
    { auditReturn: { acknowledged: false } }, { outboxReturn: { acknowledged: false } }]) {
    const f = fixture(options);
    await assert.rejects(f.transaction.decide(f.request), { statusCode: 503 });
    assert.equal(f.steps.includes('COMMIT'), false);
    assert.deepEqual(f.steps.slice(-2), ['ROLLBACK', 'RELEASE']);
  }
});

test('schema errors map to safe 503, optimistic conflicts map to safe 409', async () => {
  for (const [code, expected] of [ ['ER_NO_SUCH_TABLE', 503], ['ER_BAD_FIELD_ERROR', 503],
    ['ER_DUP_ENTRY', 409], ['ER_LOCK_DEADLOCK', 409], ['ER_LOCK_WAIT_TIMEOUT', 409] ]) {
    const f = fixture({ sqlErrorAt: { point: 'history', code } });
    await assert.rejects(f.transaction.decide(f.request), e =>
      e.statusCode === expected && !e.message.includes('PRIVATE SQL DETAILS'));
    assert.deepEqual(f.steps.slice(-2), ['ROLLBACK', 'RELEASE']);
  }
});

test('unrelated SQL errors are never disguised as migration errors', async () => {
  const f = fixture({ sqlErrorAt: { point: 'history', code: 'ER_ACCESS_DENIED_ERROR' } });
  await assert.rejects(f.transaction.decide(f.request), e =>
    e.code === 'ER_ACCESS_DENIED_ERROR' && !('statusCode' in e));
  assert.deepEqual(f.steps.slice(-2), ['ROLLBACK', 'RELEASE']);
});

test('commit failure is not success and connection is released', async () => {
  const f = fixture({ sqlErrorAt: { point: 'commit', code: 'ER_LOCK_DEADLOCK' } });
  await assert.rejects(f.transaction.decide(f.request), { statusCode: 409 });
  assert.deepEqual(f.steps.slice(-3), ['COMMIT', 'ROLLBACK', 'RELEASE']);
});
