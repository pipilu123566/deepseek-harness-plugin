import test from 'node:test';
import assert from 'node:assert/strict';
import { usageProjection, UsageReader, publicUsage, priceFor, beijingDay, USAGE_KEY } from './usage.js';
const at = value => Date.parse(value);
const event = (seq, turn = 0, extra = {}) => ({ type: 'assistant/message', surfaceOp: 'append', seq, time: at('2026-10-30T10:00:00+08:00'), data: { turn, message: { source: { provider: 'deepseek-account', model: 'deepseek-flash' }, content: [{ type: 'text', text: 'PRIVATE TRANSCRIPT' }] }, usage: { inputTokens: 1000, cacheReadTokens: 2000, outputTokens: 500, reasoningTokens: 200 } }, ...extra });
const fold = (events, prices = {}, cut = 0) => { const p = usageProjection(prices); return events.reduce(p.apply, p.init({}, cut)); };

test('multi-step turns use disjoint buckets, reasoning is not charged twice, and no transcript is retained', () => {
  const state = fold([event(1), event(2), event(3, 1)]);
  const value = publicUsage(state.turns[0]);
  assert.equal(value.tokens, 7000);
  assert.equal(value.output, 1000);
  assert.deepEqual(value.costs, [{ currency: 'CNY', amount: '0.01216' }]);
  assert.equal(value.calls, 2);
  assert.equal(state.days['2026-10-30'].calls, 3);
  assert.ok(!JSON.stringify(state).includes('PRIVATE TRANSCRIPT'));
});

test('fork inheritance, replacement copies, and repeated event delivery cannot double-bill', () => {
  const state = fold([event(0), event(1), event(2), event(2), event(3, 0, { surfaceOp: { op: 'replace', startSeq: 0, endSeq: 1 } })], {}, 2);
  assert.equal(state.days['2026-10-30'].calls, 1);
  assert.equal(state.days['2026-10-30'].tokens, 3500);
});

test('Beijing midnight splits daily usage while one cross-midnight turn retains both steps', () => {
  const state = fold([event(0, 0, { time: at('2026-10-29T23:59:59+08:00') }), event(1, 0, { time: at('2026-10-30T00:00:00+08:00') })]);
  assert.equal(state.turns[0].calls, 2);
  assert.equal(state.days['2026-10-29'].calls, 1);
  assert.equal(state.days['2026-10-30'].calls, 1);
  assert.equal(beijingDay(at('2026-10-29T16:00:00Z')), '2026-10-30');
});

test('official peak, off-peak, weekends, holidays and verified tariff dates are distinguished', () => {
  const price = date => priceFor('deepseek-account', 'deepseek-flash', at(date));
  assert.equal(price('2026-10-30T09:00:00+08:00').input, 2);
  assert.equal(price('2026-10-30T12:00:00+08:00').input, 1);
  assert.equal(price('2026-10-30T14:00:00+08:00').output, 8);
  assert.equal(price('2026-10-30T18:00:00+08:00').output, 4);
  assert.equal(price('2026-10-31T10:00:00+08:00').input, 1);
  assert.equal(price('2026-10-01T10:00:00+08:00').input, 1);
  assert.equal(price('2026-08-01T10:00:00+08:00'), null);
  assert.equal(price('2027-01-01T10:00:00+08:00'), null);
  assert.equal(priceFor('generic-provider', 'deepseek-flash', at('2026-10-30')), null);
});

test('unknown prices and missing/invalid usage are not reported as free; cache writes need their own rate', () => {
  const unknown = event(0); unknown.data.message.source.provider = 'generic-provider';
  const missing = event(1); delete missing.data.usage;
  const invalid = event(2); invalid.data.usage.reasoningTokens = 501;
  const write = event(3); write.data.usage.cacheWriteTokens = 100;
  const value = fold([unknown, missing, invalid, write]).turns[0];
  assert.equal(value.unpriced, 2);
  assert.equal(value.missing, 2);
  assert.deepEqual(value.costs, {});
});

test('exact provider/model custom prices and currencies stay separate, and tariff edits invalidate checkpoints', () => {
  const prices = { 'generic-provider/deepseek-flash': { currency: 'USD', input: 1, cacheRead: 0.1, cacheWrite: 2, output: 3 } };
  const custom = event(1); custom.data.message.source.provider = 'generic-provider'; custom.data.usage.cacheWriteTokens = 100;
  const value = publicUsage(fold([event(0), custom], prices).turns[0]);
  assert.deepEqual(value.costs, [{ currency: 'CNY', amount: '0.00608' }, { currency: 'USD', amount: '0.0029' }]);
  assert.notEqual(usageProjection().stateVersion, usageProjection(prices).stateVersion);
});

test('daily reader merges sessions, reports partial reads, releases leases and invalidates its cache', async () => {
  let released = 0, reads = 0, changed, title = 'Original name';
  const state = fold([event(1)]);
  const ctx = { effect: () => {}, sessionProjections: { register: () => {}, onChanged: fn => { changed = fn; } }, sessionQuery: {
    listSessions: async () => ['a', 'b', 'bad'].map(id => ({ header: { id } })),
    observeSession: async id => { reads++; if (id === 'bad') throw new Error('private backend error'); return { projections: { values: { [USAGE_KEY]: state, title } }, [Symbol.dispose]: () => { released++; } }; },
  } };
  const reader = new UsageReader(ctx), now = at('2026-10-30T12:00:00+08:00');
  const value = await reader.today(now);
  assert.equal(value.status, 'partial'); assert.equal(value.failedSessions, 1);
  assert.equal(value.tokens, 7000); assert.equal(value.groups.length, 1);
  assert.deepEqual(value.sessions.map(x => [x.id, x.title]), [['a', 'Original name'], ['b', 'Original name']]);
  assert.equal(released, 2); assert.equal(reads, 3);
  await reader.today(now + 1); assert.equal(reads, 3);
  changed({}, USAGE_KEY);
  await reader.today(now + 2); assert.equal(reads, 6);
  title = 'Renamed session'; changed({}, 'title');
  assert.equal((await reader.today(now + 3)).sessions[0].title, title);
  assert.equal(reads, 9); assert.equal(released, 6);
  assert.ok(!JSON.stringify(value).includes('private backend error'));
});

test('daily session amounts reconcile by currency, exclude inherited and other-day calls, and preserve unknown costs', async () => {
  const custom = event(1); custom.data.message.source.provider = 'generic-provider'; custom.data.usage.cacheWriteTokens = 100;
  const unknown = event(0); unknown.data.message.source = { provider: 'unpriced-provider', model: 'unpriced-model' };
  const missing = event(1); delete missing.data.usage;
  const prices = { 'generic-provider/deepseek-flash': { currency: 'USD', input: 1, cacheRead: 0.1, cacheWrite: 2, output: 3 } };
  const values = {
    a: { [USAGE_KEY]: fold([event(0), custom], prices), title: 'Two currencies' },
    b: { [USAGE_KEY]: fold([event(0), custom, event(2)], prices, 2), title: 'Fork' },
    c: { [USAGE_KEY]: fold([unknown, missing]), title: null },
    yesterday: { [USAGE_KEY]: fold([event(0, 0, { time: at('2026-10-29T12:00:00+08:00') })]), title: 'Yesterday' },
    empty: { [USAGE_KEY]: fold([]), title: 'No calls' },
    unavailable: { title: 'Projection unavailable' },
  };
  let released = 0;
  const ctx = { effect: () => {}, sessionProjections: { register: () => {}, onChanged: () => {} }, sessionQuery: {
    listSessions: async () => Object.keys(values).map(id => ({ header: { id, title: 'WRONG HEADER TITLE' } })),
    observeSession: async id => ({ projections: { values: values[id] }, [Symbol.dispose]: () => { released++; } }),
  } };
  const result = await new UsageReader(ctx, prices).today(at('2026-10-30T12:00:00+08:00'));
  assert.deepEqual(result.sessions.map(x => [x.id, x.title]), [['a', 'Two currencies'], ['b', 'Fork'], ['c', null]]);
  assert.equal(result.status, 'partial'); assert.equal(result.failedSessions, 1); assert.equal(released, 6);
  assert.equal(result.calls, 5); assert.equal(result.sessions[1].calls, 1);
  assert.deepEqual(result.costs, [{ currency: 'CNY', amount: '0.01216' }, { currency: 'USD', amount: '0.0029' }]);
  assert.deepEqual(result.sessions[0].costs, [{ currency: 'CNY', amount: '0.00608' }, { currency: 'USD', amount: '0.0029' }]);
  assert.deepEqual(result.sessions[2].costs, []);
  assert.equal(result.sessions[2].unpriced, 1); assert.equal(result.sessions[2].missing, 1);
  for (const field of ['calls', 'tokens', 'missing', 'unpriced']) assert.equal(result[field], result.sessions.reduce((sum, row) => sum + row[field], 0));
  const sumCurrency = rows => rows.reduce((total, row) => {
    for (const { currency, amount } of row.costs) {
      const [whole, fraction = ''] = amount.split('.');
      total[currency] = (total[currency] || 0n) + BigInt(whole + fraction.padEnd(8, '0'));
    }
    return total;
  }, {});
  assert.deepEqual(sumCurrency(result.sessions), sumCurrency([result]));
  assert.deepEqual(sumCurrency(result.groups), sumCurrency([result]));
  for (const row of result.sessions) assert.deepEqual(sumCurrency(row.groups), sumCurrency([row]));
  assert.ok(!JSON.stringify(result).includes('PRIVATE TRANSCRIPT'));
  assert.ok(!JSON.stringify(result).includes('WRONG HEADER TITLE'));
});
