type Entry = { count: number; reset: number };
const local = new Map<string, Entry>();
export async function rateLimited(key: string, limit = 5, windowMs = 60_000) {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const limiter = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`), prefix: "sv-catalogue" });
    return !(await limiter.limit(key)).success;
  }
  const now = Date.now(), found = local.get(key);
  if (!found || found.reset < now) { local.set(key, { count: 1, reset: now + windowMs }); return false; }
  found.count += 1;
  return found.count > limit;
}
