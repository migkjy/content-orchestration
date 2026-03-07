import Link from 'next/link';
import { getDocuments, getCategories, ensureDocumentsSchema } from '@/lib/kanban-db';

export const revalidate = 300;

const CATEGORY_LABELS: Record<string, string> = {
  plans: '플랜',
  reports: '보고서',
  strategy: '전략',
  docs: '문서',
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await ensureDocumentsSchema().catch(() => {});
  const { category } = await searchParams;

  const [documents, categories] = await Promise.all([
    getDocuments(category).catch(() => []),
    getCategories().catch(() => []),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 필터 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">문서 허브</h1>
              <p className="text-sm text-gray-500 mt-0.5">플랜·보고서·전략 문서 전체 {documents.length}건</p>
            </div>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/documents"
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                !category ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/documents?category=${cat}`}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  category === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {documents.length === 0 ? (
          <div className="text-center py-20 text-gray-400">문서가 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate group-hover:text-blue-600">
                    {doc.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.file_path}</p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {doc.doc_date && (
                    <span className="text-xs text-gray-400">{doc.doc_date}</span>
                  )}
                  {doc.category && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {CATEGORY_LABELS[doc.category] ?? doc.category}
                    </span>
                  )}
                  <span className="text-gray-300">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
