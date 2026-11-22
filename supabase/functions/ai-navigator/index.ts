// AI 내비게이터 외부 공고 탐색 (Supabase Edge Function, Deno)
//
// 하는 일: 화면이 보낸 기본 항목 일부(시·군, 상태, 나이대, 관심 분야, 짧은 질문)로
// AI가 웹에서 외부 공고(민간·재단·기업·대학)를 찾아 정리한 목록을 돌려준다.
//
// 지키는 것 (CLAUDE.md 2·3·5장)
// - AI 키는 Edge Function 비밀값에만 둔다(supabase secrets set). 화면 코드에 넣지 않는다.
// - 요청 내용을 저장하거나 로그에 쓰지 않는다. 로그에는 상태 코드와 걸린 시간만.
// - 정해진 칸 말고는 받지 않는다(validateRequest). 결과는 웹 검색 결과에 실제로 나온 주소만(keepSearchedOnly).
// - 결과는 검수 전 정보다. 화면은 O/X 없이 'AI 추천 · 조건 확인 필요'로만 보여 준다.
//
// 비밀값 (이름만. 값은 저장소에 넣지 않는다)
//   AI_PROVIDER         'anthropic'(기본: Anthropic messages + web_search 도구)
//                       'openai'(OpenAI 호환 chat/completions + web_search_options. 예: 모두의 AI 실험실 게이트웨이)
//   AI_API_KEY          AI 키 (없으면 ANTHROPIC_API_KEY를 읽음. 둘 다 없으면 503으로 '키 연결 전' 응답)
//   AI_API_URL          openai일 때 base URL (예: https://.../v1). anthropic이면 쓰지 않음
//   AI_MODEL            모델 이름 (없으면 503)
//   AI_WEB_SEARCH_TOOL  anthropic 웹 검색 도구 버전 (기본 web_search_20250305)
//   AI_API_VERSION      anthropic-version 헤더 (기본 2023-06-01)
//   ALLOWED_ORIGINS     화면 주소 목록, 쉼표로 구분 (기본 http://localhost:3000)

import {
  buildPrompt,
  collectCitedUrls,
  collectSearchedUrls,
  extractJson,
  keepSearchedOnly,
  sanitizeResult,
  validateRequest,
} from '../_shared/navigatorProtocol.ts';

const MAX_BODY_BYTES = 2048;
const MAX_SEARCHES = 5;
const MAX_TURNS = 3;
const TIMEOUT_MS = 90_000;
/** 같은 함수 인스턴스 안에서 주소(IP)별로 1분에 몇 번까지 받을지 (간단한 남용 막기) */
const PER_MINUTE = 5;
const recent = new Map<string, number[]>();

function env(name: string, fallback = ''): string {
  return Deno.env.get(name)?.trim() || fallback;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = env('ALLOWED_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allow = origin && allowed.includes(origin) ? origin : allowed[0] ?? '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });
}

function tooMany(ip: string): boolean {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  recent.set(ip, list);
  return list.length > PER_MINUTE;
}

interface ContentBlock {
  type: string;
  text?: string;
}

/** 모델의 답 글과, 웹 검색으로 실제로 나온 주소 모음 */
interface ModelResult {
  text: string;
  searched: Set<string>;
}

function apiKey(): string {
  return env('AI_API_KEY') || env('ANTHROPIC_API_KEY');
}

/** OpenAI 호환 chat/completions + web_search_options. 인용(url_citation) 주소만 검색 결과로 본다 */
async function callOpenAICompatible(system: string, user: string): Promise<ModelResult> {
  const base = env('AI_API_URL').replace(/\/+$/, '');
  if (!base) throw new Error('AI_API_URL missing');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { authorization: `Bearer ${apiKey()}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env('AI_MODEL'),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      web_search_options: {},
      max_tokens: 4000,
    }),
  });
  if (!res.ok) throw new Error(`model ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: unknown; annotations?: unknown } }[] };
  const message = data.choices?.[0]?.message ?? {};
  return {
    text: typeof message.content === 'string' ? message.content : '',
    searched: collectCitedUrls(Array.isArray(message.annotations) ? message.annotations : []),
  };
}

/** Anthropic messages + web_search 도구. 모든 차례의 블록에서 검색 결과·인용 주소를 모은다 */
async function callAnthropic(system: string, user: string): Promise<ModelResult> {
  const key = apiKey();
  const model = env('AI_MODEL');
  const messages: { role: string; content: unknown }[] = [{ role: 'user', content: user }];
  const tool = { type: env('AI_WEB_SEARCH_TOOL', 'web_search_20250305'), name: 'web_search', max_uses: MAX_SEARCHES };
  let text = '';
  const allBlocks: unknown[] = [];
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'x-api-key': key,
        'anthropic-version': env('AI_API_VERSION', '2023-06-01'),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model, max_tokens: 2000, system, messages, tools: [tool] }),
    });
    if (!res.ok) throw new Error(`model ${res.status}`);
    const data = (await res.json()) as { content?: ContentBlock[]; stop_reason?: string };
    const blocks = data.content ?? [];
    allBlocks.push(...blocks);
    text = blocks
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n');
    // 검색이 길어 중간에 멈추면(pause_turn) 받은 내용을 그대로 다시 보내 이어 간다
    if (data.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: blocks });
  }
  return { text, searched: collectSearchedUrls(allBlocks) };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'POST만 받아요.' }, 405, origin);

  const started = Date.now();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (tooMany(ip)) return json({ error: '잠시 뒤에 다시 시도해 주세요.' }, 429, origin);

  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return json({ error: '요청이 너무 커요.' }, 413, origin);
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: '요청 형식이 아니에요.' }, 400, origin);
  }
  const checked = validateRequest(body);
  if (!checked.ok) return json({ error: checked.error }, 400, origin);

  if (!apiKey() || !env('AI_MODEL')) {
    return json({ error: 'AI 키가 아직 연결되지 않았어요.', items: [] }, 503, origin);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { system, user } = buildPrompt(checked.value, today);
  try {
    const call = env('AI_PROVIDER', 'anthropic') === 'openai' ? callOpenAICompatible : callAnthropic;
    const { text, searched } = await call(system, user);
    const parsed = sanitizeResult(extractJson(text));
    // 웹 검색 결과에 실제로 나온 주소만 남긴다(모델이 기억으로 쓴 주소는 버림)
    const items = keepSearchedOnly(parsed, searched);
    console.log(`ai-navigator ok ${items.length}/${parsed.length} items ${Date.now() - started}ms`);
    return json({ items, searchedAt: new Date().toISOString() }, 200, origin);
  } catch (e) {
    // 오류 내용에 요청 값이 섞이지 않게 종류만 남긴다
    console.log(`ai-navigator fail ${(e as Error).name} ${Date.now() - started}ms`);
    return json({ error: 'AI 검색에 실패했어요. 잠시 뒤에 다시 시도해 주세요.', items: [] }, 502, origin);
  }
});
