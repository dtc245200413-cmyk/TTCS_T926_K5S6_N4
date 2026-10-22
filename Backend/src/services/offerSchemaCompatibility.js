'use strict';

// A rollout can contain the legacy 11-column candidate_offers table while the
// new Offer UI is already deployed. Translate ONLY known schema errors from an
// Offer query into a safe, actionable 503. An unrelated SQL/server failure is
// not evidence that the schema needs migrating and must remain a real 500.
const SCHEMA_ERROR_CODES = new Set(['ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE']);

function normalizeOfferSchemaError(error) {
  if (!SCHEMA_ERROR_CODES.has(error?.code)) return error;
  return Object.assign(new Error('Offer schema is not ready'), {
    code: 'OFFER_SCHEMA_NOT_READY',
    statusCode: 503,
  });
}

async function withOfferSchemaGuard(query) {
  try {
    return await query();
  } catch (error) {
    throw normalizeOfferSchemaError(error);
  }
}

module.exports = { normalizeOfferSchemaError, withOfferSchemaGuard };
