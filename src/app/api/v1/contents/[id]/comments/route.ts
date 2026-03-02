import { getComments, addComment } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth) return auth;
  const { id } = await params;
  const comments = await getComments(id);
  return apiOk(comments);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth) return auth;
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return apiError('Invalid JSON'); }
  const text = body.body as string | undefined;
  const author = (body.author as string | undefined) ?? '자비스';
  if (!text || typeof text !== 'string') return apiError('body is required');
  const comment = await addComment(id, text, author);
  return apiOk(comment, 201);
}
