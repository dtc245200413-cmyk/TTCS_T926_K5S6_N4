import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { INTERVIEW_DURATIONS, localToIso, toLocalInput, displayTime, scheduleTimeFields, resolveScheduleTime } from './src/utils/interviewSchedules.js';

const form = { interview_date: '2026-10-13', start_time: '10:15:00', duration: '60' };

for (const duration of INTERVIEW_DURATIONS) {
  test(`${duration} minutes computes exact elapsed time`, () => {
    const { start, end, error } = resolveScheduleTime({ ...form, duration: String(duration) });
    assert.equal(error, undefined);
    assert.equal(start, '2026-10-13T03:15:00.000Z');
    assert.equal(new Date(end) - new Date(start), duration * 60000);
  });
}

test('Midnight, month/year rollover and leap day keep Vietnam date', () => {
  for (const [date, next] of [['2026-12-31', '2027-01-01'], ['2028-02-28', '2028-02-29'], ['2026-02-28', '2026-03-01']]) {
    const result = resolveScheduleTime({ ...form, interview_date: date, start_time: '23:45', duration: '30' });
    assert.equal(toLocalInput(result.end), `${next}T00:15:00`);
  }
});

test('Reject missing, malformed, impossible or out-of-range times and durations', () => {
  for (const input of ['', '2026-02-30T10:00', '2026-10-13T24:00', '2026-10-13T12:60', '2026-10-13T12:00:60', '2026-10-13T12:00Z', '0999-01-01T10:00']) {
    assert.equal(localToIso(input), null, input);
  }
  for (const change of [{ interview_date: '' }, { start_time: '' }, { duration: '' }, { duration: '-30' }, { duration: '75' }, { duration: 'custom', end_date: '', end_time: '' }]) {
    assert.ok(resolveScheduleTime({ ...form, ...change }).error);
  }
  assert.ok(resolveScheduleTime({ ...form, interview_date: '9999-12-31', start_time: '23:59', duration: '120' }).error);
});

test('Custom end must be strictly after start, including date', () => {
  for (const [end_date, end_time] of [['2026-10-13', '10:15:00'], ['2026-10-13', '10:14:59'], ['2026-10-12', '23:59:59']]) {
    assert.equal(resolveScheduleTime({ ...form, duration: 'custom', end_date, end_time }).error, 'Thời gian kết thúc phải sau thời gian bắt đầu.');
  }
  assert.equal(resolveScheduleTime({ ...form, duration: 'custom', end_date: '2026-10-13', end_time: '10:15:01' }).end, '2026-10-13T03:15:01.000Z');
});

test('Edit preserves nonstandard duration, seconds and overnight dates without rounding', () => {
  for (const schedule of [
    { start_at: '2026-10-13T03:07:15Z', end_at: '2026-10-13T04:24:49Z' },
    { start_at: '2026-10-13T16:45:00Z', end_at: '2026-10-14T00:03:00Z' },
    { start_at: '2026-10-13T03:07:15Z', end_at: '2026-10-13T04:07:15Z' },
  ]) {
    const fields = scheduleTimeFields(schedule);
    assert.equal(fields.duration, 'custom');
    const result = resolveScheduleTime(fields);
    assert.equal(result.start, new Date(schedule.start_at).toISOString());
    assert.equal(result.end, new Date(schedule.end_at).toISOString());
  }
});

test('Standard edit chooses matching preset; new form defaults to 60 minutes', () => {
  assert.equal(scheduleTimeFields().duration, '60');
  assert.equal(scheduleTimeFields({ start_at: '2026-10-13T03:07:00Z', end_at: '2026-10-13T03:52:00Z' }).duration, '45');
});

test('Display uses 24-hour Vietnam clock and safe invalid-value fallback', () => {
  assert.equal(displayTime('2026-10-13T17:00:00Z'), '00:00:00 14/10/2026');
  assert.equal(toLocalInput('2026-10-13T23:30:00-04:00'), '2026-10-14T10:30:00');
  assert.equal(displayTime(null), 'Không rõ thời gian');
  assert.equal(displayTime('invalid'), 'Không rõ thời gian');
});

for (const zone of ['UTC', 'America/New_York', 'Asia/Ho_Chi_Minh']) {
  test(`Conversion is independent of host timezone ${zone}, including foreign DST gap`, () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { localToIso, toLocalInput, displayTime } from './src/utils/interviewSchedules.js';
      assert.equal(localToIso('2026-03-08T02:30:00'), '2026-03-07T19:30:00.000Z');
      assert.equal(toLocalInput('2026-03-07T19:30:00Z'), '2026-03-08T02:30:00');
      assert.equal(displayTime('2026-10-13T17:00:00Z'), '00:00:00 14/10/2026');
    `], { cwd: new URL('.', import.meta.url), env: { ...process.env, TZ: zone }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  });
}
