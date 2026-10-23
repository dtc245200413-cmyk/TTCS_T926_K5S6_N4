const validation = require('./offerValidation');

it.each([
  { basic_salary: -1 }, { basic_salary: 0 }, { basic_salary: true }, { basic_salary: '1e6' },
  { basic_salary: '1.001' }, { basic_salary: '10000000000000' }, { basic_salary: Infinity },
  { currency: null }, { currency: 'vnd' }, { currency: 'VNDD' },
  { position_id: 0 }, { position_id: false }, { position_id: '1 OR 1=1' },
  { expected_start_date: '2026-02-29' }, { expected_start_date: '2026-02-30' },
  { response_deadline: '20/10/2026' }, { response_deadline: '2026-10-20T00:00:00Z' },
  { job_title: 123 }, { job_title: 'a'.repeat(151) }, { work_location: 'a'.repeat(256) },
  { message: 'あ'.repeat(22000) }, { benefits: [] }, { special_terms: {} }
])('rejects malformed draft content: %j', input => {
  expect(() => validation.normalizeDraft(input)).toThrow();
});

it('keeps money exact, trims text, accepts real leap dates and nullable draft fields', () => {
  expect(validation.normalizeDraft({
    basic_salary: '9999999999999.99', job_title: '  Developer  ', position_id: '41',
    expected_start_date: '2028-02-29', response_deadline: null, message: '  '
  })).toEqual({ basic_salary: '9999999999999.99', job_title: 'Developer', position_id: 41,
    expected_start_date: '2028-02-29', response_deadline: null, message: null });
});

it.each([{}, null, [], 'not-an-object'])('rejects an empty or non-object patch', input => {
  expect(() => validation.normalizeDraft(input)).toThrow();
});

it.each([undefined, null, false, 0, -1, '0', '1.5', '9007199254740992'])('requires a real application ID: %s', application_id => {
  expect(() => validation.normalizeDraft({ application_id }, { create: true })).toThrow();
});
