export interface LLMResult {
  content: string;
  tokens_input: number;
  tokens_output: number;
  cost_krw: number; // 원화 추정 비용
}

/** @deprecated Use LLMResult instead */
export type GeminiResult = LLMResult;

// 필라별 서비스 컨텍스트
const PILLAR_CONTEXT: Record<string, string> = {
  ai_automation: 'AppPro AI 자동화 서비스 — 중소기업 반복 업무를 AI로 자동화. 실용적이고 도입 장벽 낮은 솔루션 강조.',
  mvp_dev: 'AppPro MVP 개발 서비스 — 4주 내 빠른 MVP 출시. 린 스타트업, 빠른 검증, 최소 비용 강조.',
  gov_support: 'AppPro 정부지원사업 — IT 보조금/지원사업 컨설팅. 신청 절차 단순화, 성공률 제고.',
  maintenance: 'AppPro 유지보수 — 월정액 IT 시스템 관리. 안정성, 비용 예측 가능성 강조.',
  general: 'AppPro — AI 기반 중소기업 IT 솔루션 종합 컨설팅.',
};

const CONTENT_TYPE_INSTRUCTIONS: Record<string, string> = {
  blog: `한국어 블로그 포스트를 작성하라. 형식:
- H1 제목 (SEO 키워드 포함)
- 도입부 (2-3문장, 독자 공감)
- 본문 H2 섹션 3-4개 (각 150-250자)
- 실용적 팁 또는 사례
- CTA 마무리 (AppPro 서비스 자연스럽게 연결)
총 700-1000자. 마크다운 형식.`,
  newsletter: `한국어 뉴스레터 본문을 작성하라. 형식:
- 핵심 인사이트 1-2개 (짧고 임팩트 있게)
- 실행 가능한 팁 3개 (번호 목록)
- 이번 주 추천 도구/자료 1개
- 마무리 메시지
총 400-600자.`,
  social: `한국어 SNS 포스트를 작성하라 (LinkedIn/Instagram용):
- 훅 첫 줄 (스크롤을 멈추게 할 만큼 강렬)
- 핵심 메시지 3-4줄
- 해시태그 5개 (#AI #중소기업 #자동화 등)
총 150-250자.`,
  youtube: `한국어 YouTube 영상 스크립트 개요를 작성하라:
- 영상 제목 (CTR 최적화)
- 훅 (첫 15초 스크립트)
- 섹션 구성 3-4개 (각 요점 + 예상 소요 시간)
- CTA (구독/댓글/서비스)
총 300-500자.`,
};

export async function generateContent(params: {
  pillar: string;
  title: string;
  content_type: string;
  description?: string;
  prompt_hint?: string;
}): Promise<LLMResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const pillarCtx = PILLAR_CONTEXT[params.pillar] || PILLAR_CONTEXT.general;
  const typeInstructions = CONTENT_TYPE_INSTRUCTIONS[params.content_type] || CONTENT_TYPE_INSTRUCTIONS.blog;

  const systemPrompt = `당신은 AppPro 콘텐츠 마케터다. 서비스 컨텍스트: ${pillarCtx}`;

  const userPrompt = `주제: "${params.title}"
${params.description ? `설명: ${params.description}` : ''}
${params.prompt_hint ? `추가 지시: ${params.prompt_hint}` : ''}

${typeInstructions}`;

  const payload = {
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://content-orchestration.vercel.app',
      'X-Title': 'Content Orchestration',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('OpenRouter returned empty content (possible content filter)');

  const usage = data.usage ?? {};
  const tokensIn = Number(usage.prompt_tokens) || 0;
  const tokensOut = Number(usage.completion_tokens) || 0;

  // OpenRouter gpt-4o-mini 가격: input $0.15/1M, output $0.60/1M (1USD=1350KRW 기준)
  const costUsd = (tokensIn * 0.15 + tokensOut * 0.60) / 1_000_000;
  const cost_krw = Math.round(costUsd * 1350 * 10) / 10;

  return { content, tokens_input: tokensIn, tokens_output: tokensOut, cost_krw };
}
