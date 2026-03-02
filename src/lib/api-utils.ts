import { NextResponse } from 'next/server';

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function checkAuth(request: Request): boolean {
  const apiKey = process.env.CONTENT_OS_API_KEY;
  // 환경변수 미설정 = 개발 모드 (인증 스킵)
  if (!apiKey) return true;

  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7) === apiKey;
}

export function requireAuth(request: Request): NextResponse | null {
  if (!checkAuth(request)) {
    return apiError('Unauthorized — Bearer token required', 401);
  }
  return null;
}
