import {
  NAVIGATOR_INTERESTS,
  NAVIGATOR_STATUSES,
  sanitizeResult,
  toAgeBand,
  validateRequest,
  type ExternalNotice,
  type NavigatorRequest,
} from '../../../supabase/functions/_shared/navigatorProtocol.ts';
import type { UserProfile } from '../types/policy';

/**
 * AI 내비게이터 외부 공고 탐색의 화면 쪽.
 * - 실제 호출: VITE_AI_NAVIGATOR=live 이고 Supabase 주소·공개 키가 있을 때 Edge Function(ai-navigator)을 부른다.
 * - 그 밖에는 예시 응답 모드: 가상의 예시 결과를 돌려준다(실제 공고 아님을 화면에 표시).
 * - 보내는 값은 buildNavigatorRequest가 만든 칸뿐이다. 공고별 일시 입력은 보내지 않는다.
 */

export type NavigatorMode = 'live' | 'example';

export interface NavigatorResult {
  mode: NavigatorMode;
  items: ExternalNotice[];
  error?: string;
}

type Env = Record<string, string | undefined>;

function viteEnv(): Env {
  return ((import.meta as unknown as { env?: Env }).env ?? {}) as Env;
}

export function getNavigatorMode(env: Env = viteEnv()): NavigatorMode {
  return env.VITE_AI_NAVIGATOR === 'live' && Boolean(env.VITE_SUPABASE_URL) && Boolean(env.VITE_SUPABASE_ANON_KEY)
    ? 'live'
    : 'example';
}

/** '충청남도 천안시 서북구' -> '충청남도 천안시' (시·군까지만 보낸다) */
export function toCityLevel(region: string): string {
  const parts = region.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]}`;
}

/** 내 정보에서 보낼 칸만 골라 요청을 만든다. 보낼 수 없으면 이유를 돌려준다 */
export function buildNavigatorRequest(
  profile: UserProfile,
  query: string
): { ok: true; value: NavigatorRequest } | { ok: false; error: string } {
  const ageBand = toAgeBand(profile.age);
  if (!ageBand) return { ok: false, error: '내 정보에 나이를 넣어 주세요.' };
  if (!(NAVIGATOR_STATUSES as readonly string[]).includes(profile.status)) {
    return { ok: false, error: '내 정보의 현재 상태를 골라 주세요.' };
  }
  return validateRequest({
    region: toCityLevel(profile.residence),
    schoolRegion: toCityLevel(profile.schoolRegion),
    status: profile.status,
    ageBand,
    interests: profile.interests.filter((i) => (NAVIGATOR_INTERESTS as readonly string[]).includes(i)),
    query,
  });
}

/** 화면에 '보내는 정보'로 보여 줄 줄 */
export function describeRequest(req: NavigatorRequest): string[] {
  return [
    `주민등록 지역: ${req.region}`,
    `학교 지역: ${req.schoolRegion || '없음'}`,
    `현재 상태: ${req.status}`,
    `나이대: ${req.ageBand}`,
    `관심 분야: ${req.interests.length > 0 ? req.interests.join(', ') : '지정 안 함'}`,
    ...(req.query ? [`질문: ${req.query}`] : []),
  ];
}

/** 키 연결 전 예시 응답. 실제 기관·공고가 아니다 */
export const EXAMPLE_NOTICES: readonly ExternalNotice[] = [
  {
    title: '[예시] 가상 재단 청년 활동 지원금',
    organizer: '가상 재단 (예시)',
    url: 'https://example.org/youthpick/example-1',
    summary: '키를 연결하기 전 화면을 확인하는 예시예요. 실제 공고가 아니에요.',
    whyMatched: ['보낸 지역·관심 분야와 맞아 보이는 예시'],
    checkConditions: ['나이와 거주 조건', '다른 장학금과 중복 수혜 제한'],
    period: '',
  },
  {
    title: '[예시] 가상 기업 대학생 대외활동 모집',
    organizer: '가상 기업 (예시)',
    url: 'https://example.org/youthpick/example-2',
    summary: '키를 연결하면 이 자리에 AI가 웹에서 찾은 외부 공고와 출처가 나와요.',
    whyMatched: ['보낸 상태(재학·구직 등)와 맞아 보이는 예시'],
    checkConditions: ['학적 조건', '활동 기간과 지역'],
    period: '',
  },
];

export async function searchExternalNotices(
  req: NavigatorRequest,
  options: { env?: Env; fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<NavigatorResult> {
  const env = options.env ?? viteEnv();
  if (getNavigatorMode(env) === 'example') {
    return { mode: 'example', items: [...EXAMPLE_NOTICES] };
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `${env.VITE_SUPABASE_URL!.replace(/\/+$/, '')}/functions/v1/ai-navigator`;
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      // 공개(publishable) 키만 쓴다. 새 키는 apikey 헤더로 보낸다(Supabase 안내)
      headers: { 'content-type': 'application/json', apikey: env.VITE_SUPABASE_ANON_KEY! },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(options.timeoutMs ?? 150_000),
    });
    const body = (await res.json().catch(() => null)) as { items?: unknown; error?: unknown } | null;
    if (!res.ok) {
      return {
        mode: 'live',
        items: [],
        error: typeof body?.error === 'string' ? body.error : 'AI 검색에 실패했어요. 잠시 뒤에 다시 시도해 주세요.',
      };
    }
    return { mode: 'live', items: sanitizeResult(body) };
  } catch {
    return { mode: 'live', items: [], error: 'AI 검색에 연결하지 못했어요. 잠시 뒤에 다시 시도해 주세요.' };
  }
}
