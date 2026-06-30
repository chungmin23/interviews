type Bucket = { day: string; count: number };
const store = new Map<string, Bucket>();
const today = (now: number) => new Date(now).toISOString().slice(0, 10);

export function checkAndCount(ip: string, now = Date.now()) {
  const limit = Number(process.env.DAILY_LIMIT ?? "30");
  const day = today(now);
  const b = store.get(ip);
  const cur = b && b.day === day ? b.count : 0;
  if (cur >= limit) return { ok: false, remaining: 0 };
  store.set(ip, { day, count: cur + 1 });
  return { ok: true, remaining: limit - (cur + 1) };
}
export function __reset() { store.clear(); }
