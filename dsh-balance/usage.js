import { createHash } from 'node:crypto';
import { z } from 'zod';

export const USAGE_KEY = 'pipiluTokenUsage';
export const PRICING_DATE = '2026-10-30';
const HOLIDAYS = new Set(['2026-09-25', '2026-09-26', '2026-09-27', ...Array.from({ length: 7 }, (_, i) => `2026-10-0${i + 1}`)]);
export const beijingDay = time => new Date(time + 28800000).toISOString().slice(0, 10);
const empty = () => ({ input: 0, cacheRead: 0, cacheWrite: 0, output: 0, tokens: 0, calls: 0, missing: 0, unpriced: 0, costs: {} });
const count = value => Number.isSafeInteger(value) && value >= 0;

/** Fixed eight-decimal currency precision, no binary-float money accumulation. */
function costUnits(usage, price) {
  const fields = ['input', 'cacheRead', 'cacheWrite', 'output'];
  const numerator = fields.reduce((sum, field) => sum + BigInt(usage[field]) * BigInt(Math.round((price[field] ?? 0) * 1e8)), 0n);
  return (numerator + 500000n) / 1000000n;
}
export function money(units) {
  const value = BigInt(units).toString().padStart(9, '0');
  return (value.slice(0, -8) + '.' + value.slice(-8)).replace(/0+$/, '').replace(/\.$/, '');
}
export function priceFor(provider, model, time, prices = {}) {
  const custom = prices[provider + '/' + model];
  if (custom) return custom;
  // Provider identity matters: a relay offering a DeepSeek-named model has its own tariff.
  if (!['deepseek-account', 'deepseek-official'].includes(provider)) return null;
  const day = beijingDay(time);
  // Verified price snapshot + holiday coverage. Older/unknown years are deliberately unpriced.
  if (day < '2026-09-19' || day > '2026-12-31') return null;
  const date = new Date(time + 28800000), hour = date.getUTCHours();
  const peak = date.getUTCDay() >= 1 && date.getUTCDay() <= 5 && !HOLIDAYS.has(day) && ((hour >= 9 && hour < 12) || (hour >= 14 && hour < 18));
  let rates;
  if (['deepseek-flash', 'deepseek-v4-flash', 'deepseek-v4-flash-vision-exp'].includes(model)) rates = [0.02, 1, 4];
  else if (model === 'deepseek-v4-pro') rates = [0.15, 4.5, 13.5];
  else return null;
  const multiplier = peak ? 2 : 1;
  return { currency: 'CNY', cacheRead: rates[0] * multiplier, input: rates[1] * multiplier, output: rates[2] * multiplier };
}
function add(left, right) {
  const result = { ...left, costs: { ...left.costs } };
  for (const key of ['input', 'cacheRead', 'cacheWrite', 'output', 'tokens', 'calls', 'missing', 'unpriced']) result[key] += right[key];
  for (const [currency, units] of Object.entries(right.costs)) result.costs[currency] = (BigInt(result.costs[currency] || '0') + BigInt(units)).toString();
  return result;
}
export function publicUsage(value) {
  return { ...value, costs: Object.entries(value.costs).map(([currency, units]) => ({ currency, amount: money(units) })) };
}
/** Pure incremental fold. Fork-inherited events are visible history, not a second bill. */
export function usageProjection(prices = {}) {
  return {
    key: USAGE_KEY, stateVersion: parseInt(createHash('sha256').update(JSON.stringify(['usage-v2', PRICING_DATE, Object.entries(prices).sort()])).digest('hex').slice(0, 12), 16), stateSchema: z.json(),
    init: (_header, inheritedEventCount) => ({ cut: inheritedEventCount, lastSeq: inheritedEventCount - 1, turns: {}, days: {} }),
    apply(state, event) {
      if (event.seq < state.cut || event.seq <= state.lastSeq || event.type !== 'assistant/message' || event.surfaceOp !== 'append') return state;
      const d = event.data, source = d.message?.source;
      if (!Number.isSafeInteger(d.turn) || d.turn < 0 || !Number.isFinite(event.time)) return state;
      const provider = source?.provider || 'unknown', model = source?.model || 'unknown';
      const usage = d.usage, value = empty(); value.calls = 1;
      if (!usage || !count(usage.inputTokens) || !count(usage.outputTokens) || !count(usage.cacheReadTokens ?? 0) || !count(usage.cacheWriteTokens ?? 0) || (usage.reasoningTokens !== undefined && (!count(usage.reasoningTokens) || usage.reasoningTokens > usage.outputTokens))) value.missing = 1;
      else {
        Object.assign(value, { input: usage.inputTokens, output: usage.outputTokens, cacheRead: usage.cacheReadTokens ?? 0, cacheWrite: usage.cacheWriteTokens ?? 0 });
        value.tokens = value.input + value.output + value.cacheRead + value.cacheWrite;
        const price = priceFor(provider, model, event.time, prices);
        // Cache writes require an explicit rate; never price them as free by omission.
        if (!price || (value.cacheRead > 0 && price.cacheRead === undefined) || (value.cacheWrite > 0 && price.cacheWrite === undefined)) value.unpriced = 1;
        else value.costs[price.currency] = costUnits(value, price).toString();
      }
      const day = beijingDay(event.time), key = JSON.stringify([provider, model]);
      const turn = state.turns[d.turn] || { ...empty(), groups: {} };
      const daily = state.days[day] || { ...empty(), groups: {} };
      const grouped = previous => ({ ...add(previous || empty(), value), provider, model });
      return { ...state, lastSeq: event.seq,
        turns: { ...state.turns, [d.turn]: { ...add(turn, value), groups: { ...turn.groups, [key]: grouped(turn.groups[key]) } } },
        days: { ...state.days, [day]: { ...add(daily, value), groups: { ...daily.groups, [key]: grouped(daily.groups[key]) } } },
      };
    },
    wire: { viewSchema: z.json(), view: state => state },
  };
}

/** Uses Harness's revision-aware observations/projection checkpoints, never rescans log files. */
export class UsageReader {
  constructor(ctx, prices = {}) {
    this.ctx = ctx; this.closed = false; this.abort = new AbortController();
    ctx.effect(() => () => { this.closed = true; this.abort.abort(); });
    ctx.sessionProjections.register(usageProjection(prices));
    this.cached = null; this.pending = null; this.revision = 0;
    ctx.sessionProjections.onChanged((_session, key) => { if (key === USAGE_KEY || key === 'title') this.revision++; });
  }
  async today(now = Date.now()) {
    const day = beijingDay(now), revision = this.revision;
    if (this.cached?.day === day && this.cached.revision === revision && now - this.cached.at < 15000) return this.cached.value;
    if (this.pending?.day === day) return this.pending.promise;
    const promise = this.read(day).then(value => { this.cached = { day, revision, at: now, value }; return value; });
    this.pending = { day, promise };
    try { return await promise; } finally { if (this.pending?.promise === promise) this.pending = null; }
  }
  async read(day) {
    const records = await this.ctx.sessionQuery.listSessions(this.abort.signal);
    let total = { ...empty(), groups: {} }, failedSessions = 0;
    const sessions = [];
    // Sequential leases bound memory and retain the backend's ownership/cold-read semantics.
    for (const record of records) {
      if (this.closed) throw new Error('disposed');
      let lease;
      try {
        lease = await this.ctx.sessionQuery.observeSession(record.header.id, { signal: this.abort.signal });
        const state = lease.projections?.values?.[USAGE_KEY];
        if (!state) { failedSessions++; continue; }
        const usage = state.days[day];
        if (!usage || usage.calls === 0) continue;
        // rc.5 titles are log-backed projection values, not Session header fields.
        const title = lease.projections.values.title;
        const session = {
          id: record.header.id,
          title: typeof title === 'string' && title.trim() ? title : null,
          ...publicUsage(usage),
          groups: Object.values(usage.groups).map(publicUsage),
        };
        const groups = { ...total.groups };
        for (const [key, group] of Object.entries(usage.groups)) groups[key] = { ...add(groups[key] || empty(), group), provider: group.provider, model: group.model };
        total = { ...add(total, usage), groups };
        sessions.push(session);
      } catch { failedSessions++; }
      finally { lease?.[Symbol.dispose](); }
    }
    return { status: failedSessions ? 'partial' : 'ready', day, ...publicUsage(total), groups: Object.values(total.groups).map(publicUsage), sessions, failedSessions, pricingDate: PRICING_DATE };
  }
}
