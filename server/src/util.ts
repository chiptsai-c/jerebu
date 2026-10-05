export function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time comparison of two hex hashes.
export function sameHash(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  return ab.byteLength === bb.byteLength && crypto.subtle.timingSafeEqual(ab, bb);
}

export function bearer(req: Request, minLength = 32): string | null {
  const m = (req.headers.get('Authorization') ?? '').match(/^Bearer (.+)$/);
  return m && m[1].length >= minLength && m[1].length <= 128 ? m[1] : null;
}
