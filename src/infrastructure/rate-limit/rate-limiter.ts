export interface RateLimiter {
  allow(key: string): Promise<boolean>;
}

/** Best-effort local/isolate limiter; replace with a Cloudflare Rate Limiting binding in production. */
export class MemoryRateLimiter implements RateLimiter {
  private readonly attempts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly maximum = 10,
    private readonly windowMilliseconds = 60_000,
  ) {}

  allow(key: string): Promise<boolean> {
    const now = Date.now();
    const current = this.attempts.get(key);
    if (!current || current.resetAt <= now) {
      this.attempts.set(key, {
        count: 1,
        resetAt: now + this.windowMilliseconds,
      });
      return Promise.resolve(true);
    }
    if (current.count >= this.maximum) return Promise.resolve(false);
    current.count += 1;
    return Promise.resolve(true);
  }
}

export async function anonymousRateLimitKey(
  request: Request,
  scope: string,
): Promise<string> {
  const forwarded = request.headers.get('cf-connecting-ip') ?? 'local';
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${scope}:${forwarded}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
