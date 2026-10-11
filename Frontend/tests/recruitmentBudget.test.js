import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateCost, budgetExcess, money, requestYear } from '../src/utils/recruitmentBudget.js';

const availability = { remaining_headcount: 2, remaining_salary_budget: '480000000.00' };
test('annual cost uses max monthly salary and exact decimal arithmetic', () => {
  assert.equal(estimateCost(2, '20000000.01'), '480000000.24');
  assert.equal(estimateCost('', 20000000), null);
  assert.equal(estimateCost(1.5, 20000000), null);
  assert.equal(estimateCost(1, -1), null);
});
test('exact limit and each kind of excess are distinguished', () => {
  assert.equal(budgetExcess(availability, 2, '480000000.00').exceeded, false);
  assert.deepEqual(budgetExcess(availability, 3, '480000000.01'), { headcount: 1, salary: '0.01', exceeded: true });
  assert.equal(budgetExcess(availability, 3, '1.00').headcount, 1);
  assert.equal(budgetExcess(availability, 1, '480000001.00').salary, '1.00');
});
test('an approved request is not counted twice', () => {
  assert.equal(budgetExcess({ remaining_headcount: 0, remaining_salary_budget: '0.00' }, 2, '480000000.00', 'APPROVED').exceeded, false);
});
test('unknown budget/cost is not presented as within limits', () => {
  assert.equal(budgetExcess(null, 2, '100.00'), null);
  assert.equal(budgetExcess(availability, 2, null), null);
});
test('negative availability remains visible and large amounts retain precision', () => {
  assert.deepEqual(budgetExcess({ remaining_headcount: -1, remaining_salary_budget: '-0.01' }, 2, '0.00', 'APPROVED'), { headcount: 1, salary: '0.01', exceeded: true });
  assert.equal(money('999999999999999999.99'), '999.999.999.999.999.999,99 ₫');
  assert.equal(money(null), '—');
});
test('budget year is derived from date needed', () => {
  assert.equal(requestYear({ date_needed: '2099-01-01', budget_year: 2098 }), '2099');
});
