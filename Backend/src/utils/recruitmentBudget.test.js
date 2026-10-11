const { calculateRequestBudget, formatMoney, moneyToCents } = require('./recruitmentBudget');

test('uses needed date year, twelve months and max salary with exact decimals', () => {
  expect(calculateRequestBudget({ date_needed: '2028-12-31', headcount: 3, proposed_max_salary: '100.01' }, true))
    .toEqual({ budget_year: 2028, estimated_salary_cost: '3600.36' });
});

test('retains exact values beyond JavaScript safe integer range', () => {
  expect(formatMoney(moneyToCents('999999999999999999.99'))).toBe('999999999999999999.99');
});

test('permits incomplete drafts without inventing zero cost', () => {
  expect(calculateRequestBudget({})).toEqual({ budget_year: null, estimated_salary_cost: null });
});

test('rejects multiplication overflow', () => {
  expect(() => calculateRequestBudget({ date_needed: '2099-01-01', headcount: 2147483647, proposed_max_salary: '999999999999999999.99' }, true)).toThrow('giới hạn');
});
