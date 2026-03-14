# Content Orchestration — PL 세션 규칙

## 프로젝트 개요
콘텐츠 통합 관리 대시보드. 여러 프로젝트의 콘텐츠 수집(RSS) → 가공 → 배포 파이프라인 모니터링.
content-pipeline(blog.apppro.kr)에서 분리된 독립 플랫폼 (2026-02-24).

## 내부 전용 도구
**SEO/마케팅/Lighthouse 최적화 금지** — 내부 운영 대시보드 전용.

## 기술 스택
- Next.js 16 (App Router), TypeScript, React 19
- Tailwind CSS v4, react-markdown + remark-gfm
- Turso (LibSQL) — content-os DB
- Vercel 배포 (main push → 자동 배포)

## 빌드/실행
```bash
npm install && npm run dev    # 개발
npm run build                 # 프로덕션 빌드
npm run sync-docs             # 문서 동기화
```

## 배포
- GitHub: migkjy/content-orchestration (main 브랜치)
- Vercel: junyoung-kims-projects/content-orchestration
- main push → Vercel 자동 배포

## 관리 대상 프로젝트
- **apppro** (활성): AppPro.kr 블로그/뉴스레터
- **richbukae** (Coming Soon)
- **ai-architect** (Coming Soon)

## 라우트 구조
```
/                        → 전체 프로젝트 요약
/[project]/              → 프로젝트별 대시보드
/[project]/calendar      → 콘텐츠 캘린더
/[project]/content       → 콘텐츠 관리
/[project]/rss           → RSS 모니터
/newsletter/[id]         → 뉴스레터 상세
```

## DB 보호 규칙
- `drizzle-kit push` 절대 금지 → `drizzle-kit generate` → SQL 확인 → 승인 후 실행
- DROP TABLE / TRUNCATE 포함 마이그레이션 발견 시 즉시 중단

## 세션 간 소통
```bash
scripts/project-reply.sh "메시지" "content-orchestration"
```

## Knowledge
- `.claude/knowledge/architecture.md` — 기술 스택/디렉터리 상세
- `.claude/knowledge/constraints.md` — 제약사항
- `.claude/knowledge/api-keys.md` — API 키 정보 (.gitignore 포함)
- `.claude/knowledge/history.md` — 프로젝트 히스토리
- `.claude/knowledge/learnings.md` — 학습/교훈 기록
