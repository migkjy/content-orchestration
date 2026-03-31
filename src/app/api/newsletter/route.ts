import { NextResponse } from 'next/server';
import { getNewsletters } from '@/lib/content-db';

export const revalidate = 0;

export async function GET() {
  try {
    const newsletters = await getNewsletters();

    // Brevo subscriber count
    let brevo: { total: number; listName: string } | null = null;
    const apiKey = process.env.BREVO_API_KEY;
    const listId = process.env.BREVO_LIST_ID || '3';

    if (apiKey) {
      try {
        const res = await fetch(`https://api.brevo.com/v3/contacts/lists/${listId}`, {
          headers: {
            accept: 'application/json',
            'api-key': apiKey,
          },
        });
        if (res.ok) {
          const data = await res.json();
          brevo = {
            total: data.totalSubscribers ?? data.uniqueSubscribers ?? 0,
            listName: data.name ?? `List #${listId}`,
          };
        }
      } catch {
        // Brevo API failure is non-critical
      }
    }

    // Status summary
    const statusCounts = newsletters.reduce<Record<string, number>>((acc, nl) => {
      acc[nl.status] = (acc[nl.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      newsletters,
      brevo,
      summary: {
        total: newsletters.length,
        statusCounts,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
