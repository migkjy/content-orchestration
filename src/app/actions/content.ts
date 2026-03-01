'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  updateContentStatus,
  createContent as createContentFn,
  updateContent as updateContentFn,
} from '@/lib/content-db';

export async function approveContent(id: string, projectId: string) {
  await updateContentStatus(id, 'approved', { approved_by: 'VP/CEO' });
  revalidatePath(`/${projectId}/content`);
}

export async function rejectContent(id: string, projectId: string, reason: string) {
  await updateContentStatus(id, 'rejected', { rejected_reason: reason });
  revalidatePath(`/${projectId}/content`);
}

export async function moveToReview(id: string, projectId: string) {
  await updateContentStatus(id, 'review');
  revalidatePath(`/${projectId}/content`);
}

export async function scheduleContent(id: string, projectId: string, scheduledAt: number) {
  await updateContentStatus(id, 'scheduled', { scheduled_at: scheduledAt });
  revalidatePath(`/${projectId}/content`);
}

export async function moveToDraft(id: string, projectId: string) {
  await updateContentStatus(id, 'draft');
  revalidatePath(`/${projectId}/content`);
  revalidatePath(`/${projectId}/content/${id}`);
}

export async function createContent(projectId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const type = (formData.get('type') as string) || 'blog';
  const pillar = (formData.get('pillar') as string) || undefined;
  const channel = (formData.get('channel') as string) || undefined;
  const content_body = (formData.get('content_body') as string) || undefined;

  const id = await createContentFn({
    title,
    type,
    pillar,
    channel,
    content_body,
    project: projectId,
  });

  revalidatePath(`/${projectId}/content`);
  redirect(`/${projectId}/content/${id}`);
}

export async function updateContentAction(id: string, projectId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const content_body = formData.get('content_body') as string;
  const pillar = (formData.get('pillar') as string) || undefined;
  const channel = (formData.get('channel') as string) || undefined;
  const seo_title = (formData.get('seo_title') as string) || null;
  const description = (formData.get('description') as string) || null;

  const metadata = JSON.stringify({ seo_title, description });

  await updateContentFn(id, { title, content_body, pillar, channel, metadata });

  revalidatePath(`/${projectId}/content`);
  revalidatePath(`/${projectId}/content/${id}`);
}
