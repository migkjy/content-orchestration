# 콘텐츠 오케스트레이션 플랫폼

멀티 프로젝트 콘텐츠 발행 계획 및 관리 플랫폼. 여러 캠페인의 콘텐츠를 채널별/일정별로 계획하고 발행까지 관리.

**첫 번째 실제 사용 케이스**: Richbukae 채널 x AI 설계자 세일즈 PLF

---

## 빠른 시작

### 1. 환경 설정

```bash
cp .env.example .env.local
# .env.local에 DB 정보 입력
```

필수 환경변수:
```
CONTENT_OS_DB_URL=libsql://...
CONTENT_OS_DB_TOKEN=...
CONTENT_OS_API_KEY=your-api-key   # 선택: 미설정 시 API 인증 스킵
```

### 2. 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

### 3. 샘플 데이터 삽입

```bash
curl -X POST http://localhost:3000/api/seed
```

Richbukae x AI 설계자 PLF 샘플 데이터가 자동으로 삽입됩니다:
- 캠페인 1개 (AI 설계자 세일즈 PLF)
- 채널 4개 (인스타그램, 유튜브, 뉴스레터, 블로그)
- 콘텐츠 슬롯 20개 (다양한 상태)

---

## 화면 구성

### `/` — 홈 (캠페인 목록)

활성 캠페인 카드 목록. 채널 수 및 콘텐츠 상태(Draft/예약/완료) 요약 표시.
- `[+ 새 프로젝트]` -> 신규 캠페인 생성
- 빠른 탐색: 채널별 뷰 / 캘린더

### `/projects/[id]` — 프로젝트 상세

채널별 콘텐츠 슬롯 목록. 상태별 필터링 가능.
- **빈 슬롯 `[작성하기]`** -> 즉시 에디터 진입 (계획 -> 실행 단절 없음)
- 뷰 전환: 리스트 / 칸반

### `/channels` — 채널 관리

등록된 채널 목록 + 연동 상태 (자동발행 / 미연결 / 오류).
채널 클릭 -> 프로젝트별 그룹핑된 콘텐츠 목록.

### `/calendar` — 캘린더

월간 캘린더. 채널 아이콘으로 예약 콘텐츠 시각화.
날짜 클릭 -> 해당 날짜 콘텐츠 팝업.

### `/api-docs` — API 문서

AI 에이전트 및 개발자용 REST API 전체 문서.

---

## 콘텐츠 상태 워크플로우

```
미작성(unwritten)
    | [작성 시작]
초안(draft) <-----------------+
    | [검토 요청]              |
검토요청(review)               | (반려)
    |-> 반려(draft) -----------+
    +-> 승인완료(approved)
         | [발행 예약]
      예약(scheduled)
         | [발행]
      발행완료(published)

어느 단계에서든 -> 취소(cancelled)
```

---

## REST API v1

Base URL: `https://content-orchestration.vercel.app`

인증: `Authorization: Bearer {CONTENT_OS_API_KEY}` (환경변수 미설정 시 스킵)

전체 API 문서: `/api-docs` 페이지 참조

### 주요 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/v1/health | 헬스체크 (인증 불필요) |
| GET | /api/v1/stats | 전체 통계 |
| GET | /api/v1/campaigns | 캠페인 목록 |
| POST | /api/v1/campaigns | 캠페인 생성 |
| GET | /api/v1/campaigns/:id/contents | 캠페인 콘텐츠 목록 |
| GET | /api/v1/channels | 채널 목록 |
| GET | /api/v1/contents | 콘텐츠 목록 (필터: campaign_id, channel_id, status) |
| POST | /api/v1/contents | 콘텐츠 슬롯 생성 |
| PUT | /api/v1/contents/:id | 콘텐츠 본문 수정 |
| POST | /api/v1/contents/:id/transition | 상태 전환 |
| POST | /api/seed | 샘플 데이터 삽입 |

---

## AI 에이전트 사용 가이드

이 플랫폼은 AI 에이전트가 콘텐츠 생성부터 발행 예약까지 전체 워크플로우를 자동화할 수 있도록 설계됨.

### 전형적인 AI 에이전트 워크플로우

```python
import httpx

BASE = "https://content-orchestration.vercel.app"
HEADERS = {"Authorization": "Bearer YOUR_KEY", "Content-Type": "application/json"}

# 1. 헬스체크
r = httpx.get(f"{BASE}/api/v1/health")

# 2. 캠페인 목록 확인
campaigns = httpx.get(f"{BASE}/api/v1/campaigns", headers=HEADERS).json()["data"]

# 3. 미작성 슬롯 조회
contents = httpx.get(
    f"{BASE}/api/v1/contents",
    params={"campaign_id": CAMPAIGN_ID, "status": "unwritten"},
    headers=HEADERS
).json()["data"]["contents"]

# 4. 각 슬롯에 콘텐츠 작성
for slot in contents:
    body = generate_content(slot["title"])  # AI 생성 함수

    # 4-1. 본문 업데이트
    httpx.put(
        f"{BASE}/api/v1/contents/{slot['id']}",
        json={"content_body": body},
        headers=HEADERS
    )

    # 4-2. 검토 요청
    httpx.post(
        f"{BASE}/api/v1/contents/{slot['id']}/transition",
        json={"to": "review"},
        headers=HEADERS
    )
```

### 상태 전환 가이드 (AI 에이전트용)

```json
// 검토 요청 (본문 작성 후)
POST /api/v1/contents/{id}/transition
{"to": "review"}

// 반려 (수정 지시)
POST /api/v1/contents/{id}/transition
{"to": "draft", "rejected_reason": "수정 사항: 해시태그 5개 추가 필요"}

// 승인
POST /api/v1/contents/{id}/transition
{"to": "approved", "approved_by": "VP/Musk"}

// 발행 예약 (Unix timestamp ms)
POST /api/v1/contents/{id}/transition
{"to": "scheduled", "scheduled_at": 1741132800000}
```

---

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Database**: Turso (LibSQL) — `@libsql/client/web`
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## 관련 프로젝트

- `content-pipeline` — RSS 수집, 콘텐츠 아이디어 파이프라인 (별도 프로젝트)
- `richbukae-store` — 실제 발행 대상 채널 운영

---

**배포 URL**: https://content-orchestration.vercel.app
