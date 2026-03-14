# Architecture — Content Orchestration

## 기술 스택
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.1.6 | App Router 기반 풀스택 |
| React | 19.2.3 | UI |
| TypeScript | ^5 | 타입 안전성 |
| Tailwind CSS | v4 | 스타일링 |
| @tailwindcss/typography | ^0.5.19 | 마크다운 렌더링 스타일 |
| react-markdown | ^10.1.0 | 마크다운 렌더링 |
| remark-gfm | ^4.0.1 | GFM 확장 |
| @libsql/client | ^0.17.0 | Turso DB 클라이언트 |
| fast-xml-parser | ^5.4.2 | RSS XML 파싱 |

## 디렉터리 구조
```
src/
├── app/
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 홈 (전체 프로젝트 요약)
│   ├── [project]/              # 프로젝트별 동적 라우트
│   │   ├── page.tsx            # 프로젝트 대시보드
│   │   ├── calendar/           # 콘텐츠 캘린더
│   │   ├── content/            # 콘텐츠 CRUD
│   │   │   ├── [id]/           # 콘텐츠 상세
│   │   │   └── new/            # 새 콘텐츠
│   │   └── rss/                # RSS 모니터
│   ├── actions/                # Server Actions
│   ├── api/                    # API Routes
│   ├── api-docs/               # API 문서
│   ├── calendar/               # 전역 캘린더
│   ├── channels/               # 채널 관리
│   ├── documents/              # 문서 관리
│   ├── emails/                 # 이메일 관리
│   ├── newsletter/             # 뉴스레터
│   └── projects/               # 프로젝트 관리
├── components/                 # 공통 컴포넌트
└── lib/                        # 유틸리티/DB 클라이언트
```

## 배포 구조
- **GitHub**: migkjy/content-orchestration (main 브랜치)
- **Vercel**: junyoung-kims-projects/content-orchestration
- main push → Vercel 자동 배포 (Preview 비활성화됨)
- GitHub Actions CI: PR 빌드 자동 체크

## DB 연결
- **Turso (content-os)**: 콘텐츠/뉴스레터/RSS 데이터
- **Turso (kanban)**: 칸반 태스크 연동
- 마이그레이션: `migrations/` 디렉터리

## 주요 기능
1. RSS 수집 파이프라인 (cron)
2. 콘텐츠 상태 워크플로우 (ideation → draft → review → published)
3. 뉴스레터 프리뷰/편집/승인 UI
4. 멀티사이트 블로그 자동 파이프라인
5. 콘텐츠 캘린더
6. Welcome 이메일 시퀀스 관리
