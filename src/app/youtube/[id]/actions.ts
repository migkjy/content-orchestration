'use server';

import { redirect } from 'next/navigation';
import {
  updateYoutubeVideo,
  deleteYoutubeVideo,
  type YoutubeVideoStatus,
} from '@/lib/youtube-db';

export async function advanceVideoStatus(id: string, nextStatus: YoutubeVideoStatus | null) {
  if (!nextStatus) return;
  const publishedAt = nextStatus === 'published' ? Date.now() : undefined;
  await updateYoutubeVideo(id, { status: nextStatus, published_at: publishedAt });
  redirect(`/youtube/${id}`);
}

export async function revertVideoStatus(id: string, prevStatus: YoutubeVideoStatus | null) {
  if (!prevStatus) return;
  await updateYoutubeVideo(id, { status: prevStatus });
  redirect(`/youtube/${id}`);
}

export async function updateVideoDetails(id: string, formData: FormData) {
  const title = formData.get('title') as string;
  if (!title || !title.trim()) {
    throw new Error('제목은 필수입니다.');
  }

  const tagsRaw = (formData.get('tags') as string)?.trim();
  let tagsJson: string;
  if (tagsRaw) {
    const tagArray = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
    tagsJson = JSON.stringify(tagArray);
  } else {
    tagsJson = '[]';
  }

  await updateYoutubeVideo(id, {
    title: title.trim(),
    topic: (formData.get('topic') as string)?.trim() || undefined,
    target_keyword: (formData.get('target_keyword') as string)?.trim() || undefined,
    script_outline: (formData.get('script_outline') as string)?.trim() || undefined,
    description: (formData.get('description') as string)?.trim() || undefined,
    tags: tagsJson,
    thumbnail_text: (formData.get('thumbnail_text') as string)?.trim() || undefined,
    scheduled_date: (formData.get('scheduled_date') as string)?.trim() || undefined,
    youtube_url: (formData.get('youtube_url') as string)?.trim() || undefined,
  });

  redirect(`/youtube/${id}`);
}

export async function removeVideo(id: string) {
  await deleteYoutubeVideo(id);
  redirect('/youtube');
}
