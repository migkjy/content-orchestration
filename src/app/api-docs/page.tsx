import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Docs — Content Orchestration',
  description: 'REST API v1 documentation for AI agents',
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://content-orchestration.vercel.app';

interface Endpoint {
  method: string;
  path: string;
  auth: boolean;
  desc: string;
  body?: string;
  bodyExamples?: string[];
  response: string;
}

interface EndpointGroup {
  group: string;
  items: Endpoint[];
}

const endpoints: EndpointGroup[] = [
  {
    group: 'System',
    items: [
      {
        method: 'GET', path: '/api/v1/health',
        auth: false,
        desc: 'DB 연결 상태 및 응답 지연 확인. 인증 불필요.',
        response: `{ "success": true, "data": { "status": "ok", "db": "connected", "latency_ms": 12 } }`,
      },
      {
        method: 'GET', path: '/api/v1/stats',
        auth: true,
        desc: '전체 캠페인/채널/콘텐츠 통계 요약.',
        response: `{ "success": true, "data": { "campaigns": { "total": 1, "active": 1 }, "channels": { "total": 4, "connected": 1 }, "contents": { "total": 20, "published": 4, "draft": 4, "unwritten": 4 } } }`,
      },
      {
        method: 'POST', path: '/api/seed',
        auth: false,
        desc: '샘플 데이터 삽입 (멱등성 보장 — 이미 존재하면 스킵).',
        response: `{ "success": true, "message": "시드 완료: 캠페인 1개, 채널 4개, 콘텐츠 20개", "seeded": true }`,
      },
    ],
  },
  {
    group: 'Campaigns',
    items: [
      {
        method: 'GET', path: '/api/v1/campaigns',
        auth: true,
        desc: '캠페인 목록 (콘텐츠 통계 포함).',
        response: `{ "success": true, "data": [{ "id": "...", "name": "AI 설계자 세일즈 PLF", "status": "active", "stats": { "total": 20, "published": 4 } }] }`,
      },
      {
        method: 'POST', path: '/api/v1/campaigns',
        auth: true,
        desc: '새 캠페인 생성.',
        body: `{ "name": "캠페인 이름", "description": "설명", "goal": "목표", "type": "campaign", "start_date": 1740787200000, "end_date": 1743206400000 }`,
        response: `{ "success": true, "data": { "id": "uuid" } }`,
      },
      {
        method: 'GET', path: '/api/v1/campaigns/:id',
        auth: true,
        desc: '캠페인 단건 조회 (통계 포함).',
        response: `{ "success": true, "data": { "id": "...", "name": "...", "stats": { ... } } }`,
      },
      {
        method: 'PUT', path: '/api/v1/campaigns/:id',
        auth: true,
        desc: '캠페인 수정. status 값: active | paused | completed | archived',
        body: `{ "name": "새 이름", "status": "completed" }`,
        response: `{ "success": true, "data": { ... } }`,
      },
      {
        method: 'GET', path: '/api/v1/campaigns/:id/contents',
        auth: true,
        desc: '캠페인 콘텐츠 목록. Query: status, channel_id',
        response: `{ "success": true, "data": { "campaign": {...}, "contents": [...], "grouped_by_channel": {...} } }`,
      },
    ],
  },
  {
    group: 'Channels',
    items: [
      {
        method: 'GET', path: '/api/v1/channels',
        auth: true,
        desc: '채널 목록.',
        response: `{ "success": true, "data": [{ "id": "...", "name": "리치부캐 인스타그램", "platform": "instagram" }] }`,
      },
      {
        method: 'POST', path: '/api/v1/channels',
        auth: true,
        desc: '채널 추가. platform: instagram | youtube | newsletter | blog | facebook | x',
        body: `{ "name": "채널명", "platform": "instagram", "account_name": "@account", "connection_type": "getlate", "connection_status": "disconnected" }`,
        response: `{ "success": true, "data": { "id": "uuid" } }`,
      },
      {
        method: 'GET', path: '/api/v1/channels/:id',
        auth: true,
        desc: '채널 단건 조회.',
        response: `{ "success": true, "data": { ... } }`,
      },
      {
        method: 'PUT', path: '/api/v1/channels/:id',
        auth: true,
        desc: '채널 수정. connection_status: connected | disconnected | error',
        body: `{ "connection_status": "connected" }`,
        response: `{ "success": true, "data": { ... } }`,
      },
      {
        method: 'GET', path: '/api/v1/channels/:id/contents',
        auth: true,
        desc: '채널 콘텐츠 목록. Query: status, campaign_id',
        response: `{ "success": true, "data": { "channel": {...}, "contents": [...], "grouped_by_campaign": {...} } }`,
      },
    ],
  },
  {
    group: 'Contents',
    items: [
      {
        method: 'GET', path: '/api/v1/contents',
        auth: true,
        desc: '콘텐츠 목록. Query: campaign_id, channel_id, status, q(검색어)',
        response: `{ "success": true, "data": { "contents": [...], "total": 20 } }`,
      },
      {
        method: 'POST', path: '/api/v1/contents',
        auth: true,
        desc: '콘텐츠 슬롯 생성. status 기본값: unwritten',
        body: `{ "title": "콘텐츠 제목", "campaign_id": "uuid", "channel_id": "uuid", "content_body": "본문 (선택)", "scheduled_at": 1741132800000, "status": "unwritten" }`,
        response: `{ "success": true, "data": { "id": "uuid" } }`,
      },
      {
        method: 'GET', path: '/api/v1/contents/:id',
        auth: true,
        desc: '콘텐츠 단건 조회.',
        response: `{ "success": true, "data": { ... } }`,
      },
      {
        method: 'PUT', path: '/api/v1/contents/:id',
        auth: true,
        desc: '콘텐츠 본문/제목 수정. 상태 변경은 /transition 사용.',
        body: `{ "title": "수정 제목", "content_body": "작성된 본문 내용" }`,
        response: `{ "success": true, "data": { ... } }`,
      },
      {
        method: 'POST', path: '/api/v1/contents/:id/transition',
        auth: true,
        desc: '상태 전환 (워크플로우 핵심). 허용 전환: unwritten->draft, draft->review, review->approved|draft, approved->scheduled, scheduled->published',
        body: `{ "to": "review" }`,
        bodyExamples: [
          '검토요청: { "to": "review" }',
          '반려: { "to": "draft", "rejected_reason": "수정 필요 사항" }',
          '승인: { "to": "approved", "approved_by": "VP/CEO" }',
          '예약: { "to": "scheduled", "scheduled_at": 1741132800000 }',
          '발행완료: { "to": "published" }',
        ],
        response: `{ "success": true, "data": { "content": {...}, "transition": { "from": "draft", "to": "review" } } }`,
      },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-800',
  POST: 'bg-green-100 text-green-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
};

export default function ApiDocsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 font-mono text-sm">
      <div className="mb-8">
        <h1 className="mb-1 text-2xl font-bold">Content Orchestration API</h1>
        <p className="text-gray-500">v1 &middot; Base URL: <code className="rounded bg-gray-100 px-1">{BASE_URL}</code></p>
        <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-3 text-xs">
          <strong>Authentication:</strong> <code>Authorization: Bearer {'{CONTENT_OS_API_KEY}'}</code>
          &nbsp;(환경변수 미설정 시 인증 스킵)
        </div>
      </div>

      {endpoints.map((group) => (
        <section key={group.group} className="mb-10">
          <h2 className="mb-4 border-b pb-1 text-lg font-semibold">{group.group}</h2>
          <div className="space-y-4">
            {group.items.map((ep) => (
              <div key={ep.path + ep.method} className="rounded border bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${methodColors[ep.method]}`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-semibold">{ep.path}</code>
                  {!ep.auth && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">No Auth</span>
                  )}
                </div>
                <p className="mb-2 text-xs text-gray-600">{ep.desc}</p>
                {ep.body && (
                  <div className="mb-2">
                    <div className="mb-0.5 text-xs text-gray-400">Request Body</div>
                    <pre className="overflow-auto rounded bg-gray-900 p-2 text-xs text-green-400">{ep.body}</pre>
                  </div>
                )}
                {ep.bodyExamples && (
                  <div className="mb-2">
                    <div className="mb-0.5 text-xs text-gray-400">Body Examples</div>
                    <ul className="space-y-1">
                      {ep.bodyExamples.map((ex) => (
                        <li key={ex}>
                          <pre className="overflow-auto rounded bg-gray-900 p-1.5 text-xs text-green-400">{ex}</pre>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <div className="mb-0.5 text-xs text-gray-400">Response</div>
                  <pre className="overflow-auto rounded bg-gray-800 p-2 text-xs text-blue-300">{ep.response}</pre>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-10 rounded border bg-gray-50 p-4 text-xs">
        <h2 className="mb-2 font-semibold">AI 에이전트 통합 예시 (curl)</h2>
        <pre className="overflow-auto text-xs text-gray-700">{`# 1. 헬스체크
curl ${BASE_URL}/api/v1/health

# 2. 샘플 데이터 시드 (최초 1회)
curl -X POST ${BASE_URL}/api/seed

# 3. 캠페인 목록 조회
curl -H "Authorization: Bearer YOUR_KEY" ${BASE_URL}/api/v1/campaigns

# 4. 콘텐츠 슬롯 생성 (AI가 작성할 슬롯)
curl -X POST ${BASE_URL}/api/v1/contents \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"새 인스타그램 포스트","campaign_id":"CAMPAIGN_ID","channel_id":"CHANNEL_ID","status":"unwritten"}'

# 5. 콘텐츠 본문 작성 (AI가 생성한 본문 업데이트)
curl -X PUT ${BASE_URL}/api/v1/contents/CONTENT_ID \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content_body":"AI가 작성한 본문 내용..."}'

# 6. 검토 요청
curl -X POST ${BASE_URL}/api/v1/contents/CONTENT_ID/transition \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"review"}'

# 7. 발행 예약
curl -X POST ${BASE_URL}/api/v1/contents/CONTENT_ID/transition \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"scheduled","scheduled_at":1741132800000}'`}</pre>
      </section>
    </main>
  );
}
