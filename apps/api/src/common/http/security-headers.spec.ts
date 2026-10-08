import type { Request, Response } from 'express';
import { securityHeaders } from './security-headers.js';

function run(path: string) {
  const headers = new Map<string, string>();
  const next = vi.fn();
  securityHeaders(
    { path } as Request,
    {
      setHeader: (name: string, value: string) => void headers.set(name, value),
    } as unknown as Response,
    next,
  );
  return { headers, next };
}

describe('securityHeaders', () => {
  it('locks down every API response', () => {
    const { headers, next } = run('/api/v1/health');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(headers.get('Content-Security-Policy')).toBe(
      "default-src 'none'; frame-ancestors 'none'",
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it('leaves the Swagger interface alone', () => {
    const { headers, next } = run('/api/docs');
    expect(headers.size).toBe(0);
    expect(next).toHaveBeenCalledOnce();
  });
});
