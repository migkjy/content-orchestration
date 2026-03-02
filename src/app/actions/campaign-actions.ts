'use server';

import { revalidatePath } from 'next/cache';
import { createCampaign, updateCampaign, createChannel, updateChannel } from '@/lib/content-db';

export async function createCampaignAction(data: { name: string; description?: string; goal?: string }) {
  const id = await createCampaign(data);
  revalidatePath('/');
  revalidatePath('/projects');
  return { id };
}

export async function updateCampaignAction(id: string, data: { name?: string; description?: string; goal?: string; status?: string }) {
  await updateCampaign(id, data);
  revalidatePath('/');
  revalidatePath('/projects');
  revalidatePath(`/projects/${id}`);
}

export async function createChannelAction(data: { name: string; platform: string; account_name?: string; connection_type?: string; connection_status?: string; connection_detail?: string }) {
  const id = await createChannel(data);
  revalidatePath('/channels');
  return { id };
}

export async function updateChannelAction(id: string, data: Partial<{ name: string; platform: string; account_name: string; connection_type: string; connection_status: string; connection_detail: string }>) {
  await updateChannel(id, data);
  revalidatePath('/channels');
  revalidatePath(`/channels/${id}`);
}
