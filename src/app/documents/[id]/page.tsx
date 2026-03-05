import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDocument } from '@/lib/kanban-db';

type Props = { params: Promise<{ id: string }> };

export default async function DocumentDetailPage({ params }: Props) {
  const { id } = await params;
  const doc = await getDocument(id).catch(() => null);

  if (!doc) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/documents" className="text-sm text-blue-600 hover:underline">
            ← 목록으로
          </Link>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {doc.doc_date && <span>{doc.doc_date}</span>}
            {doc.category && (
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                {doc.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <article className="bg-white rounded-xl border border-gray-200 px-8 py-10 prose prose-gray max-w-none
          prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl
          prose-a:text-blue-600 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1
          prose-pre:bg-gray-900 prose-pre:text-gray-100">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {doc.content}
          </ReactMarkdown>
        </article>

        <div className="mt-6 text-xs text-gray-400 text-center">
          {doc.file_path}
        </div>
      </div>
    </div>
  );
}
