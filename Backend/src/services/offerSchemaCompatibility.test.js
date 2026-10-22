const { normalizeOfferSchemaError, withOfferSchemaGuard } = require('./offerSchemaCompatibility');

describe('SCRUM-103: compatibility with an unmigrated teammate database', () => {
  it.each(['ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE'])(
    'maps MySQL %s to a safe 503 without exposing SQL', async code => {
      const raw = Object.assign(new Error('private SQL: SELECT o.created_by'), { code });
      await expect(withOfferSchemaGuard(async () => { throw raw; })).rejects.toMatchObject({
        statusCode: 503, code: 'OFFER_SCHEMA_NOT_READY',
        message: expect.not.stringContaining('private SQL'),
      });
    }
  );

  it('leaves permissions and unrelated database faults unchanged', async () => {
    const denied = Object.assign(new Error('Not authorized'), { statusCode: 403 });
    const serverError = Object.assign(new Error('database failure'), { code: 'ER_PARSE_ERROR' });
    expect(normalizeOfferSchemaError(denied)).toBe(denied);
    expect(normalizeOfferSchemaError(serverError)).toBe(serverError);
    await expect(withOfferSchemaGuard(() => Promise.reject(serverError))).rejects.toBe(serverError);
  });

  it('does not pre-query the database or change successful Offer results', async () => {
    const result = [[{ id: 21, status: 'DRAFT' }]];
    const query = jest.fn().mockResolvedValue(result);
    await expect(withOfferSchemaGuard(query)).resolves.toBe(result);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
