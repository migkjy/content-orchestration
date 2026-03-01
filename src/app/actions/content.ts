'use server';

import { revalidatePath } from 'next/cache';
import { updateContentStatus } from '@/lib/content-db';

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
