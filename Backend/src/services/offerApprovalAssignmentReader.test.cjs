'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createOfferApprovalAssignmentReader } = require('./offerApprovalAssignmentReader');
const evidence = {
  offer_id: 17, application_id: 29, submission_id: 31, submission_number: 2,
  row_version: 4, offer_row_version: 4, approver_id: 11, assigned_by: 8,
  assignment_source: 'test-workflow', assignment_reference: 'assign:31', assignment_version: '2',
  decision_source: 'decision', decision_reference: '42', decision_version: '1'
};
function fixture({ rows = [evidence], verifyProvenance } = {}) {
  const queries = [];
  const conn = { execute: async (sql, params) => { queries.push({ sql, params }); return [rows]; } };
  const reader = createOfferApprovalAssignmentReader({ verifyProvenance });
  return { queries, conn, reader, args: { conn, offerId: 17, actorUserId: 11, rowVersion: 4 } };
}
function approvalProof({ evidence: record }) {
  return { verified: true, offer_id: record.offer_id, application_id: record.application_id,
    submission_id: record.submission_id, approver_id: record.approver_id,
    offer_row_version: record.offer_row_version,
    assignment_reference: record.assignment_reference, assignment_version: record.assignment_version };
}

test('missing trusted verifier blocks without any SQL', async () => {
  const { reader, conn, args, queries } = fixture();
  await assert.rejects(reader.loadAssignedApprover(args), { statusCode: 503 });
  assert.equal(queries.length, 0);
});
test('cannot accept invalid or spoofable identities', async () => {
  const { reader, args, queries } = fixture({ verifyProvenance: approvalProof });
  await assert.rejects(reader.loadAssignedApprover({ ...args, actorUserId: 0 }), { statusCode: 403 });
  await assert.rejects(reader.loadAssignedApprover({ ...args, rowVersion: '1 OR 1=1' }), { statusCode: 403 });
  assert.equal(queries.length, 0);
});
test('exact active assignment, role AND current submission/version SQL enforced', async () => {
  const { reader, args, queries } = fixture({ verifyProvenance: approvalProof });
  const record = await reader.loadAssignedApprover(args);
  assert.equal(record.provenance_verified, true);
  assert.equal(queries.length, 1);
  const { sql, params } = queries[0];
  assert.deepEqual(params, [11, 17, 4]);
  for (const pattern of [ /a\.revoked_at IS NULL/, /o\.status = 'PENDING_APPROVAL'/,
    /o\.row_version = \?/, /offer_row_version = o\.row_version/, /MAX\(last_sub\.submission_number\)/,
    /u\.status = 'ACTIVE'/, /r\.role_code IN/, /FOR UPDATE/ ]) assert.match(sql, pattern);
});
test('no assignment or duplicate assignment is always denied', async () => {
  for (const rows of [[], [evidence, evidence]]) {
    const { reader, args } = fixture({ rows, verifyProvenance: approvalProof });
    await assert.rejects(reader.loadAssignedApprover(args), { statusCode: 403 });
  }
});
test('untrusted row identity, assignment or decision metadata is denied', async () => {
  for (const mutation of [ { approver_id: 12 }, { offer_row_version: 3 },
    { assigned_by: null }, { assignment_reference: '' }, { decision_reference: '' },
    { application_id: null } ]) {
    const { reader, args } = fixture({ rows: [{ ...evidence, ...mutation }], verifyProvenance: approvalProof });
    await assert.rejects(reader.loadAssignedApprover(args), { statusCode: 403 });
  }
});
test('provenance verifier must replay the same offer, submission, actor and version', async () => {
  for (const override of [ { verified: false }, { offer_id: 44 }, { submission_id: 32 },
    { approver_id: 12 }, { offer_row_version: 3 }, { assignment_reference: 'fake' } ]) {
    const { reader, args } = fixture({ verifyProvenance: input => ({ ...approvalProof(input), ...override }) });
    await assert.rejects(reader.loadAssignedApprover(args), { statusCode: 403 });
  }
});
test('missing table/column maps to safe dependency 503', async () => {
  const conn = { execute: async () => { throw Object.assign(new Error('secret SQL info'), { code: 'ER_BAD_FIELD_ERROR' }); } };
  const reader = createOfferApprovalAssignmentReader({ verifyProvenance: approvalProof });
  await assert.rejects(reader.loadAssignedApprover({ conn, offerId: 17, actorUserId: 11, rowVersion: 4 }),
    error => error.statusCode === 503 && !error.message.includes('secret SQL info'));
});
test('unexpected SQL faults propagate instead of being misreported as schema errors', async () => {
  const boom = new Error('test SQL fault');
  const conn = { execute: async () => { throw boom; } };
  const reader = createOfferApprovalAssignmentReader({ verifyProvenance: approvalProof });
  await assert.rejects(reader.loadAssignedApprover({ conn, offerId: 17, actorUserId: 11, rowVersion: 4 }), e => e === boom);
});
