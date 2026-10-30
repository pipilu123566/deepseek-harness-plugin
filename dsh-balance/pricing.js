/** Validate user prices at the Host boundary. Empty cache prices mean unpriced. */
export function validatePrice(key, value) {
  if (typeof key !== 'string' || key.length > 300 || !/^[a-z][a-z0-9-]*\/[^\s]+$/.test(key)) throw new TypeError('invalid-model');
  if (value === null) return null;
  if (!value || !['CNY', 'USD'].includes(value.currency)) throw new TypeError('invalid-price');
  const result = { currency: value.currency };
  for (const field of ['input', 'output', 'cacheRead', 'cacheWrite']) {
    const raw = value[field];
    if (raw === undefined || raw === '') {
      if (field === 'input' || field === 'output') throw new TypeError('invalid-price');
      continue;
    }
    if ((typeof raw !== 'string' && typeof raw !== 'number') || !/^\d+(?:\.\d{1,8})?$/.test(String(raw)) || !Number.isFinite(Number(raw)) || Number(raw) > 1000000) throw new TypeError('invalid-price');
    result[field] = Number(raw);
  }
  return result;
}
