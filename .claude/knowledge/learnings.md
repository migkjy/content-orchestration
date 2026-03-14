# Learnings — Content Orchestration

## 교훈 기록
세션에서 발견한 버그, 해결 방법, 주의사항을 여기에 기록.

---

### @libsql/client Vercel 호환성 (2026-03)
- `@libsql/client/web`이 Vercel에서 동작하지 않음
- 해결: `fetch()` 기반 직접 호출로 교체 (커밋 4b1bcf1)

### LLM 프로바이더 교체 시 주의
- CEO 지시로 LLM 프로바이더가 3번 변경됨
- 환경 변수명과 API 호출 형식이 프로바이더마다 다르므로 추상화 레이어 권장
