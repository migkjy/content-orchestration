'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@libsql/client/web';
import { updateContentStatus } from '@/lib/content-db';

function getDb() {
  return createClient({
    url: process.env.CONTENT_OS_DB_URL!,
    authToken: process.env.CONTENT_OS_DB_TOKEN!,
  });
}

export async function approveContent(id: string, projectId: string) {
  const db = getDb();
  await updateContentStatus(db, id, 'approved', { approved_by: 'VP/CEO' });
  revalidatePath(`/${projectId}/content`);
}

export async function rejectContent(id: string, projectId: string, reason: string) {
  const db = getDb();
  await updateContentStatus(db, id, 'rejected', { rejected_reason: reason });
  revalidatePath(`/${projectId}/content`);
}

export async function moveToReview(id: string, projectId: string) {
  const db = getDb();
  await updateContentStatus(db, id, 'review');
  revalidatePath(`/${projectId}/content`);
}

export async function scheduleContent(id: string, projectId: string, scheduledAt: number) {
  const db = getDb();
  await updateContentStatus(db, id, 'scheduled', { scheduled_at: scheduledAt });
  revalidatePath(`/${projectId}/content`);
}
