import React, { useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import type { UserProfile } from '../types/policy';
import {
  buildNavigatorRequest,
  describeRequest,
  getNavigatorMode,
  searchExternalNotices,
  type NavigatorResult,
} from '../ai/navigatorClient';
import { MAX_QUERY_LENGTH } from '../../../supabase/functions/_shared/navigatorProtocol.ts';
import { AI_COMPANY } from './PrivacyNotice';

export const EXTERNAL_NOTICE_BADGE = 'AI 추천 · 조건 확인 필요';

/** 질문·결과 상태. 화면 메모리에만 둔다(브라우저 저장소에 쓰지 않음, 새로고침하면 지워짐) */
export interface ExternalSearchState {
  query: string;
  loading: boolean;
  result: NavigatorResult | null;
  error: string | null;
}

export const EMPTY_EXTERNAL_SEARCH: ExternalSearchState = { query: '', loading: false, result: null, error: null };

interface ExternalNoticeFinderProps {
  profile: UserProfile;
  /**
   * 바깥(AI 내비게이터 서랍)이 상태를 들고 있으면 넘긴다. 서랍을 닫거나 다른 화면에 다녀오거나 탭을 바꿔
   * 이 화면이 사라져도 질문과 결과가 남는다. 없으면 이 화면 안에서만 들고 있는다.
   */
  state?: ExternalSearchState;
  onStateChange?: React.Dispatch<React.SetStateAction<ExternalSearchState>>;
}

/**
 * 외부 공고 찾기 (AI). 온통청년 밖의 민간·재단·기업·대학 공고를 AI가 웹에서 찾는다.
 * 결과는 검수 전 정보라 O/X로 판정하지 않고 '?'로만 보여 준다. 결과와 질문은 저장하지 않는다.
 */
export const ExternalNoticeFinder: React.FC<ExternalNoticeFinderProps> = ({ profile, state, onStateChange }) => {
  const [ownState, setOwnState] = useState<ExternalSearchState>(EMPTY_EXTERNAL_SEARCH);
  const current = state ?? ownState;
  const update = onStateChange ?? setOwnState;
  const { query, loading, result, error } = current;
  const setQuery = (next: string) => update((s) => ({ ...s, query: next }));
  const mode = getNavigatorMode();
  const preview = buildNavigatorRequest(profile, query);

  const handleSearch = async () => {
    const req = buildNavigatorRequest(profile, query);
    if (!req.ok) {
      update((s) => ({ ...s, error: req.error }));
      return;
    }
    update((s) => ({ ...s, error: null, loading: true }));
    // 기다리는 동안 서랍을 닫아도 결과는 바깥 상태에 들어간다
    const next = await searchExternalNotices(req.value);
    update((s) => ({ ...s, result: next, error: next.error ?? null, loading: false }));
  };

  return (
    <div className="space-y-3" data-testid="external-notice-finder">
      <div className="rounded-xl border border-[#DCD7C9] bg-white p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-extrabold text-[#1F2421]">외부 공고 찾기 (AI)</h3>
          <span
            className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${
              mode === 'live' ? 'border-[#262A27] bg-[#D8F279]' : 'border-[#B8860B] bg-[#FFF0CC]'
            } text-[#1F2421]`}
          >
            {mode === 'live' ? 'AI 검색 연결됨' : '키 연결 전 · 예시 응답'}
          </span>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#333333]">
          온통청년에 없는 민간·재단·기업·대학 공고를 AI가 웹에서 찾아요. 검수 전 정보라 O/X로 판정하지 않고,
          공고에서 확인할 조건을 함께 알려 드려요.
        </p>
      </div>

      <div className="rounded-xl border border-[#262A27]/20 bg-[#F7F5EE] p-3">
        <p className="text-[12px] font-bold text-[#1F2421]">
          {mode === 'live' ? 'AI에 보내는 정보 (이것만 보내요)' : 'AI 검색을 켜면 보내는 정보'}
        </p>
        {preview.ok ? (
          <ul className="mt-1 space-y-0.5 text-[12px] font-semibold text-[#333333]">
            {describeRequest(preview.value).map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[12px] font-semibold text-[#A33A1E]">{preview.error}</p>
        )}
        <p className="mt-1.5 text-[11px] font-medium text-[#4A4D49]">
          {mode === 'live'
            ? `위 정보만 Supabase(서버 함수)를 거쳐 ${AI_COMPANY}(AI)으로 보내 공고를 찾아요. 정확한 나이, 학교 이름, 성적·소득 같은 직접 입력 값은 보내지 않고, 결과와 질문은 저장하지 않아요. 자세한 내용은 맨 아래 '개인정보 처리 안내'에 있어요.`
            : '지금은 예시 응답만 보여 줘요. 어떤 정보도 AI로 보내지 않아요.'}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSearch();
        }}
        className="space-y-1.5"
      >
        <label htmlFor="external-notice-query" className="text-[12px] font-bold text-[#333333]">
          찾고 싶은 것 (선택, {MAX_QUERY_LENGTH}자 이내, 이름·연락처는 쓰지 마세요)
        </label>
        <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-[#262A27] bg-white px-3 py-1.5">
          <input
            id="external-notice-query"
            type="text"
            maxLength={MAX_QUERY_LENGTH}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 생활비 장학금, IT 공모전, 여름방학 인턴"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1F2421] placeholder:text-[#5C5F5B] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !preview.ok}
            className="btn-primary-brand inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{loading ? '찾는 중' : '찾기'}</span>
          </button>
        </div>
      </form>

      {loading && (
        <p role="status" className="rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-[#333333]">
          웹에서 공고를 찾는 중이에요. 30초쯤 걸릴 수 있어요.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-[#FBE1D6] px-3 py-2 text-[12px] font-semibold text-[#1F2421]">
          {error}
        </p>
      )}

      {result && !error && result.items.length === 0 && (
        <p className="rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-[#333333]">
          맞는 외부 공고를 찾지 못했어요. 청년이 신청·참여할 수 있는 기회(장학금·교육·대외활동·공모전·인턴 등)를 찾아요. 질문을 바꿔 다시 찾아보세요.
        </p>
      )}

      {result && result.items.length > 0 && (
        <ul className="space-y-2.5" aria-label="AI가 찾은 외부 공고">
          {result.items.map((item) => (
            <li key={item.url} className="rounded-xl border border-[#DCD7C9] bg-white p-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-[#B8860B] bg-[#FFF0CC] px-2 py-0.5 text-[11px] font-bold text-[#1F2421]">
                  <span aria-hidden="true" className="font-mono-num">?</span>
                  {EXTERNAL_NOTICE_BADGE}
                </span>
                {result.mode === 'example' && (
                  <span className="rounded-md border border-[#262A27]/30 px-2 py-0.5 text-[11px] font-bold text-[#4A4D49]">
                    예시 · 실제 공고 아님
                  </span>
                )}
              </div>
              <h4 className="mt-1.5 text-[14px] font-extrabold leading-snug text-[#1F2421]">{item.title}</h4>
              <p className="text-[12px] font-semibold text-[#4A4D49]">
                {item.organizer || '운영 기관은 공고에서 확인'}
                {item.period ? ` · ${item.period}` : ''}
              </p>
              {item.summary && <p className="mt-1 text-[12px] leading-relaxed text-[#333333]">{item.summary}</p>}
              {item.whyMatched.length > 0 && (
                <p className="mt-1.5 text-[12px] text-[#333333]">
                  <strong className="font-bold text-[#1F2421]">고른 이유: </strong>
                  {item.whyMatched.join(' / ')}
                </p>
              )}
              {item.checkConditions.length > 0 && (
                <p className="mt-0.5 text-[12px] text-[#333333]">
                  <strong className="font-bold text-[#1F2421]">공고에서 확인할 조건: </strong>
                  {item.checkConditions.join(' / ')}
                </p>
              )}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#1F2421] underline"
              >
                출처 열기
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
