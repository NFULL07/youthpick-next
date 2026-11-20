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

export const EXTERNAL_NOTICE_BADGE = 'AI 추천 · 조건 확인 필요';

/**
 * 외부 공고 찾기 (AI). 온통청년 밖의 민간·재단·기업·대학 공고를 AI가 웹에서 찾는다.
 * 결과는 검수 전 정보라 O/X로 판정하지 않고 '?'로만 보여 준다. 결과와 질문은 저장하지 않는다.
 */
export const ExternalNoticeFinder: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NavigatorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mode = getNavigatorMode();
  const preview = buildNavigatorRequest(profile, query);

  const handleSearch = async () => {
    const req = buildNavigatorRequest(profile, query);
    if (!req.ok) {
      setError(req.error);
      return;
    }
    setError(null);
    setLoading(true);
    const next = await searchExternalNotices(req.value);
    setResult(next);
    setError(next.error ?? null);
    setLoading(false);
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
        <p className="text-[12px] font-bold text-[#1F2421]">AI에 보내는 정보 (이것만 보내요)</p>
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
          정확한 나이, 학교 이름, 성적·소득 같은 직접 입력 값은 보내지 않아요. 결과와 질문은 저장하지 않아요.
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
            placeholder="예: 생활비 장학금, IT 대외활동"
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

      {error && (
        <p role="alert" className="rounded-xl bg-[#FBE1D6] px-3 py-2 text-[12px] font-semibold text-[#1F2421]">
          {error}
        </p>
      )}

      {result && !error && result.items.length === 0 && (
        <p className="rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-[#333333]">
          맞는 외부 공고를 찾지 못했어요. 질문을 바꿔 다시 찾아보세요.
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
