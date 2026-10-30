import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Test the real turn presenter with a small element recorder, not DOM behavior.
// React effects, form submission, positioning, and focus need browser evidence.
function presenter() {
  let module, View, messages;
  const React = {
    Fragment: 'fragment',
    createElement: (type, props, ...children) => typeof type === 'function'
      ? type({ ...props, children })
      : { type, props: props || {}, children },
  };
  runInNewContext(readFileSync(new URL('./client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: value => { module = value; } } },
  });
  module.factory(name => { assert.equal(name, 'react'); return React; }).apply({
    locale: { register: (_namespace, values) => { messages = values.zh; } },
    slots: {
      inject: (_name, callback) => callback(),
      register: (options, component) => { if (options.name === 'conversation.chat.turnTail') View = component; },
    },
  });
  return value => View({ turn: { turn: 0 }, useProjection: () => ({ turns: value ? { 0: value } : {} }), t: key => messages[key] });
}

const textOf = value => Array.isArray(value) ? value.map(textOf).join('') : value && typeof value === 'object'
  ? value.type === 'style' ? '' : textOf(value.children)
  : value === false || value == null ? '' : String(value);
const elements = (value, className) => {
  if (Array.isArray(value)) return value.flatMap(item => elements(item, className));
  if (!value || typeof value !== 'object') return [];
  return [...(value.props.className === className ? [value] : []), ...elements(value.children, className)];
};
const usage = overrides => ({ tokens: 3500, input: 1000, cacheRead: 2000, cacheWrite: 0,
  output: 500, calls: 1, missing: 0, unpriced: 0, costs: {}, groups: {}, ...overrides });

test('turn costs retain exact decimals and separate currencies instead of adding them', () => {
  const view = presenter()(usage({ costs: { CNY: '900719925474099301000000', USD: '20000000' } }));
  const summary = textOf(view.children.find(child => child?.type === 'summary'));
  assert.ok(summary.includes('CNY 9,007,199,254,740,993.01'));
  assert.ok(summary.includes('USD 0.20'));
  assert.ok(!summary.includes('+'));
  assert.ok(!summary.includes('Token'));
  assert.ok(!textOf(view).includes('3,500'));
  assert.equal(elements(view, 'pb-money').length, 2);
});

test('collapsed amounts round to two decimal places while expanded details retain exact values', () => {
  const render = presenter();
  for (const [units, overview, exact] of [
    ['0', '0.00', '0'], ['10000000', '0.10', '0.1'],
    ['100500000', '1.01', '1.005'], ['999900000', '10.00', '9.999'],
    ['499999', '0.00', '0.00499999'], ['-500000', '-0.01', '-0.005'],
    ['-1', '0.00', '-0.00000001'], ['900719925474099399500000', '9,007,199,254,740,994.00', '9,007,199,254,740,993.995'],
  ]) {
    const value = usage({ costs: { CNY: units } });
    const view = render(value);
    const summary = textOf(view.children.find(child => child?.type === 'summary'));
    assert.ok(summary.includes('CNY ' + overview), summary);
    assert.equal(textOf(elements(view, 'pb-money')[0]), 'CNY ' + exact);
    assert.equal(value.costs.CNY, units);
  }
});

test('same-named models keep their providers and show both partial pricing and missing usage', () => {
  const first = usage({ provider: 'channel-a', model: 'same-model', costs: { CNY: '12345678' }, calls: 3, unpriced: 1, missing: 1 });
  const second = usage({ provider: 'channel-b', model: 'same-model', unpriced: 1 });
  const view = presenter()(usage({ calls: 4, unpriced: 2, missing: 1, costs: first.costs, groups: { first, second } }));
  const rows = elements(view, 'pb-model');
  assert.equal(rows.length, 2);
  const firstText = textOf(rows[0]), secondText = textOf(rows[1]);
  assert.ok(firstText.includes('channel-a'));
  assert.ok(secondText.includes('channel-b'));
  assert.ok(firstText.includes('部分费用估算'));
  assert.ok(firstText.includes('部分调用未上报用量'));
  assert.ok(firstText.includes('部分调用未定价'));
  assert.ok(secondText.includes('费用未定价'));
  assert.ok(!textOf(view).includes('Token'));
  assert.ok(!textOf(view).includes('未命中输入'));
});

test('a turn with no reported usage is not presented as known zero tokens', () => {
  const render = presenter();
  assert.equal(render(null), null);
  const view = render(usage({ tokens: 0, input: 0, cacheRead: 0, output: 0, missing: 1 }));
  const summary = textOf(view.children.find(child => child?.type === 'summary'));
  assert.ok(summary.includes('用量未上报'));
  assert.ok(!summary.includes('0 Token'));
});
