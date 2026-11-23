import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildPrompt,
  collectCitedUrls,
  collectSearchedUrls,
  keepSearchedOnly,
  sanitizeResult,
  toAgeBand,
  validateRequest,
} from '../../../supabase/functions/_shared/navigatorProtocol.ts';
import { DEFAULT_USER_PROFILE } from '../data/policies';
import { ExternalNoticeFinder, EXTERNAL_NOTICE_BADGE } from '../components/ExternalNoticeFinder';
import {
  EXAMPLE_NOTICES,
  buildNavigatorRequest,
  getNavigatorMode,
  searchExternalNotices,
  toCityLevel,
} from './navigatorClient';

const OK = { region: '충청남도 천안시', schoolRegion: '', status: '대학 재학', ageBand: '20~24세', interests: ['일자리'], query: '' };

test('요청 검사: 정해진 칸만, 시·군까지만, 개인정보 모양은 거부', () => {
  assert.equal(validateRequest(OK).ok, true);
  assert.equal(validateRequest({ ...OK, gpa: 3.5 }).ok, false);
  assert.equal(validateRequest({ ...OK, region: '충청남도 천안시 신부동' }).ok, false);
  assert.equal(validateRequest({ ...OK, ageBand: '23세' }).ok, false);
  assert.equal(validateRequest({ ...OK, query: '내 번호 010-1234-5678' }).ok, false);
  assert.equal(validateRequest({ ...OK, query: '990101-1234567' }).ok, false);
  assert.equal(validateRequest({ ...OK, query: 'a@b.com 으로 알려줘' }).ok, false);
  assert.equal(validateRequest({ ...OK, query: 'x'.repeat(101) }).ok, false);
});

test('나이는 5세 단위 나이대로만, 지역은 시·군까지만 보냄', () => {
  assert.equal(toAgeBand(23), '20~24세');
  assert.equal(toAgeBand(25), '25~29세');
  assert.equal(toAgeBand(41), '40세 이상');
  assert.equal(toAgeBand(12), null);
  assert.equal(toCityLevel('충청남도 천안시 서북구'), '충청남도 천안시');
  const req = buildNavigatorRequest({ ...DEFAULT_USER_PROFILE, age: 23, residence: '충청남도 천안시' }, '');
  assert.ok(req.ok);
  if (req.ok) {
    assert.deepEqual(Object.keys(req.value).sort(), ['ageBand', 'interests', 'query', 'region', 'schoolRegion', 'status']);
    assert.ok(!JSON.stringify(req.value).includes('"23"') && !JSON.stringify(req.value).includes(':23'));
    const { user } = buildPrompt(req.value, '2026-11-21');
    assert.ok(user.includes('20~24세'));
    assert.ok(!/만 23세/.test(user));
  }
});

test('결과 정리: https 출처만, 정부(.go.kr) 제외, 최대 3개, 정해진 칸만', () => {
  const items = sanitizeResult({
    items: [
      { title: 'A', url: 'https://example.org/a', organizer: 'o', summary: 's', whyMatched: ['x'], checkConditions: ['y'], period: '', secret: 'z' },
      { title: 'B', url: 'http://example.org/b' },
      { title: 'C', url: 'https://www.cheonan.go.kr/c' },
      { title: '', url: 'https://example.org/d' },
      { title: 'E', url: 'javascript:alert(1)' },
      ...Array.from({ length: 8 }, (_, i) => ({ title: `F${i}`, url: `https://example.org/f${i}` })),
    ],
  });
  assert.equal(items.length, 3);
  assert.equal(items[0].url, 'https://example.org/a');
  assert.ok(!('secret' in items[0]));
  assert.ok(items.every((i) => i.url.startsWith('https://') && !i.url.includes('.go.kr')));
  assert.deepEqual(sanitizeResult('not json'), []);
});

test('키가 없으면 예시 응답 모드(실제 공고 아님 표시)', async () => {
  assert.equal(getNavigatorMode({}), 'example');
  assert.equal(getNavigatorMode({ VITE_AI_NAVIGATOR: 'live', VITE_SUPABASE_URL: 'https://x.supabase.co' }), 'example');
  const res = await searchExternalNotices(OK as never, { env: {} });
  assert.equal(res.mode, 'example');
  assert.equal(res.items.length, EXAMPLE_NOTICES.length);
  assert.ok(res.items.every((i) => i.title.startsWith('[예시]') && i.url.startsWith('https://example.org/')));
});

test('실제 호출은 Edge Function 주소로, 공개 키는 apikey 헤더로, 정해진 칸만 보냄', async () => {
  let seen: { url: string; init: RequestInit } | null = null;
  const fakeFetch = (async (url: string, init: RequestInit) => {
    seen = { url, init };
    return new Response(JSON.stringify({ items: [{ title: 'A', url: 'https://example.org/a' }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const env = { VITE_AI_NAVIGATOR: 'live', VITE_SUPABASE_URL: 'https://x.supabase.co/', VITE_SUPABASE_ANON_KEY: 'sb_publishable_test' };
  const res = await searchExternalNotices(OK as never, { env, fetchImpl: fakeFetch });
  assert.equal(res.mode, 'live');
  assert.equal(res.items.length, 1);
  assert.ok(seen);
  const call = seen as unknown as { url: string; init: RequestInit };
  assert.equal(call.url, 'https://x.supabase.co/functions/v1/ai-navigator');
  assert.equal((call.init.headers as Record<string, string>).apikey, 'sb_publishable_test');
  assert.ok(!('authorization' in (call.init.headers as Record<string, string>)));
  assert.deepEqual(Object.keys(JSON.parse(String(call.init.body))).sort(), Object.keys(OK).sort());

  const keyMissing = (async () => new Response(JSON.stringify({ error: 'AI 키가 아직 연결되지 않았어요.', items: [] }), { status: 503 })) as unknown as typeof fetch;
  const r2 = await searchExternalNotices(OK as never, { env, fetchImpl: keyMissing });
  assert.equal(r2.error, 'AI 키가 아직 연결되지 않았어요.');
});

test('외부 공고 화면: 보내는 정보를 보여 주고 O/X 판정 표시는 없음', () => {
  const html = renderToStaticMarkup(createElement(ExternalNoticeFinder, { profile: { ...DEFAULT_USER_PROFILE, age: 23 } }));
  // 시험 환경은 예시 모드: 켜면 보낼 정보를 보여 주되, 지금은 아무것도 보내지 않는다고 적는다
  assert.ok(html.includes('AI 검색을 켜면 보내는 정보'));
  assert.ok(html.includes('어떤 정보도 AI로 보내지 않아요'));
  assert.ok(html.includes('키 연결 전'));
  assert.ok(html.includes('20~24세'));
  assert.ok(!html.includes('충족 가능') && !html.includes('조건 불일치'));
  assert.ok(EXTERNAL_NOTICE_BADGE.includes('조건 확인 필요'));
});

test('외부 공고 화면: 바깥 상태로 받은 질문과 결과를 그대로 보여 줌(서랍을 닫았다 열어도 남음)', () => {
  const state = {
    query: 'IT 대외활동',
    loading: false,
    error: null,
    result: {
      mode: 'live' as const,
      items: [{ title: '시험용 공고', organizer: '시험 기관', url: 'https://example.org/a', summary: '', whyMatched: [], checkConditions: [], period: '' }],
    },
  };
  const html = renderToStaticMarkup(
    createElement(ExternalNoticeFinder, { profile: { ...DEFAULT_USER_PROFILE, age: 23 }, state, onStateChange: () => {} })
  );
  assert.ok(html.includes('value="IT 대외활동"'));
  assert.ok(html.includes('시험용 공고'));
  assert.ok(html.includes('https://example.org/a'));
});

test('AI 내비게이터 코드는 저장소에 값을 남기지 않고, 키를 화면 코드에 두지 않음', () => {
  for (const file of ['./navigatorClient.ts', '../components/ExternalNoticeFinder.tsx', '../components/AiSherpaDrawer.tsx', '../../../supabase/functions/_shared/navigatorProtocol.ts', '../../../supabase/functions/ai-navigator/index.ts']) {
    const src = readFileSync(new URL(file, import.meta.url), 'utf-8');
    for (const banned of ['localStorage', 'sessionStorage', 'indexedDB', 'VITE_ANTHROPIC', 'sk-ant-']) {
      assert.ok(!src.includes(banned), `${file}: ${banned}`);
    }
  }
  const fn = readFileSync(new URL('../../../supabase/functions/ai-navigator/index.ts', import.meta.url), 'utf-8');
  assert.ok(!/console\.log\([^)]*(raw|body|checked|user|system)\b/.test(fn), '요청 값을 로그에 쓰지 않음');
});

test('검색 결과에 실제로 나온 주소만 남김 (모델이 기억으로 쓴 주소는 버림)', () => {
  const blocks = [
    { type: 'server_tool_use', name: 'web_search', input: { query: '천안 청년 장학금' } },
    { type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://found.example.org/notice/1', title: 'A' }] },
    { type: 'text', text: '...', citations: [{ type: 'web_search_result_location', url: 'https://cited.example.org/b#top' }] },
    { type: 'text', text: '{"items":[]}' },
  ];
  const searched = collectSearchedUrls(blocks);
  assert.ok(searched.has('https://found.example.org/notice/1'));
  assert.ok(searched.has('https://cited.example.org/b'));
  const base = { organizer: '', summary: '', whyMatched: [], checkConditions: [], period: '' };
  const items = [
    { ...base, title: '검색에 나온 공고', url: 'https://found.example.org/notice/1/' },
    { ...base, title: '인용된 공고', url: 'https://cited.example.org/b' },
    { ...base, title: '지어낸 공고', url: 'https://made-up.example.org/view?id=1' },
  ];
  assert.deepEqual(keepSearchedOnly(items, searched).map((i) => i.title), ['검색에 나온 공고', '인용된 공고']);
  // 검색을 안 했으면(게이트웨이 시험처럼 text 블록만) 아무것도 남지 않음
  assert.equal(keepSearchedOnly(items, collectSearchedUrls([{ type: 'text', text: '{}' }])).length, 0);
});

test('OpenAI 형식 인용(url_citation) 주소만 남기고, 추적용 utm 값은 떼서 비교·표시', () => {
  const annotations = [
    { type: 'url_citation', url_citation: { url: 'https://cayf.example.org/bbs/board.php?bo_table=notice&wr_id=40&utm_source=openai', title: 'A' } },
    { type: 'file_citation', file_id: 'x' },
  ];
  const cited = collectCitedUrls(annotations);
  assert.deepEqual([...cited], ['https://cayf.example.org/bbs/board.php?bo_table=notice&wr_id=40']);
  const items = sanitizeResult({ items: [
    { title: '인용된 공고', url: 'https://cayf.example.org/bbs/board.php?bo_table=notice&wr_id=40&utm_source=openai' },
    { title: '지어낸 공고', url: 'https://cayf.example.org/bbs/board.php?bo_table=notice&wr_id=41' },
  ] });
  assert.equal(items[0].url, 'https://cayf.example.org/bbs/board.php?bo_table=notice&wr_id=40', '표시 주소에서 utm 값을 뗌');
  assert.deepEqual(keepSearchedOnly(items, cited).map((i) => i.title), ['인용된 공고']);
  assert.equal(collectCitedUrls([]).size, 0);
});

test('주소 비교: www·쿼리 순서·끝 / 만 다른 같은 페이지는 같게 보고, 다른 글 번호는 다르게 봄', () => {
  const cited = collectCitedUrls([{ type: 'url_citation', url_citation: { url: 'https://www.cayf.example.org/bbs/board.php?wr_id=40&bo_table=notice' } }]);
  const base = { organizer: '', summary: '', whyMatched: [], checkConditions: [], period: '' };
  const items = [
    { ...base, title: '같은 글', url: 'https://cayf.example.org/bbs/board.php?bo_table=notice&wr_id=40' },
    { ...base, title: '다른 글', url: 'https://cayf.example.org/bbs/board.php?bo_table=notice&wr_id=41' },
  ];
  assert.deepEqual(keepSearchedOnly(items, cited).map((i) => i.title), ['같은 글']);
});
