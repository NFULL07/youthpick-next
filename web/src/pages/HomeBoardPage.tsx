import React, { useState } from 'react';
import { ArrowRight, Search, Wallet } from 'lucide-react';
import { PolicyCard } from '../components/PolicyCard';
import { PolicyCompareBar } from '../components/PolicyCompareBar';
import { CATEGORY_ICON, CATEGORY_TINT } from '../data/categoryStyle';
import {
  ExplorePreset,
  POLICY_CATEGORIES,
  PolicyItem,
  RouteId,
  UserProfile,
} from '../types/policy';
import {
  getComparedPoliciesForTab,
  getRecommendedPoliciesForProfile,
} from '../utils/policyEngine';

interface HomeBoardPageProps {
  profile: UserProfile;
  policies: PolicyItem[];
  savedIds: string[];
  comparePolicyIds: string[];
  prepPolicyIds: string[];
  completedChecklistIds: string[];
  activePrepPolicy?: PolicyItem;
  onNavigate: (route: RouteId, policyId?: string) => void;
  onExplore: (preset: ExplorePreset) => void;
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onClearCompare: () => void;
  onStartPreparation: (policyId: string) => void;
}

export const HomeBoardPage: React.FC<HomeBoardPageProps> = ({
  profile,
  policies,
  savedIds,
  comparePolicyIds,
  prepPolicyIds,
  completedChecklistIds,
  activePrepPolicy,
  onNavigate,
  onExplore,
  onToggleSave,
  onToggleCompare,
  onClearCompare,
  onStartPreparation,
}) => {
  const [query, setQuery] = useState('');
  const boardPolicies = getRecommendedPoliciesForProfile(policies, profile, 3);
  const comparedPolicies = getComparedPoliciesForTab(
    boardPolicies,
    comparePolicyIds
  );
  const doneCount = activePrepPolicy
    ? activePrepPolicy.checklist.filter((c) =>
        completedChecklistIds.includes(c.id)
      ).length
    : 0;
  const totalCount = activePrepPolicy ? activePrepPolicy.checklist.length : 0;

  return (
    <div className="space-y-12">
      {/* 시작: 대표 문구, 검색, 분야 바로가기 | 나의 생활권 */}
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8 lg:pt-3">
          <h1 className="t-display">
            내 다음을,
            <br />
            <span className="text-primary">가볍게 픽.</span>
          </h1>
          <p className="t-lead mt-4 max-w-[34rem]">
            사는 곳과 학교, 지금의 나를 함께 살펴보고 정책 발견부터 신청
            준비까지 한 칸씩 이어가요.
          </p>

          <form
            role="search"
            aria-label="정책 검색"
            onSubmit={(e) => {
              e.preventDefault();
              onExplore({ query: query.trim() });
            }}
            className="mt-8 flex min-h-16 items-center gap-2 rounded-[1.125rem] bg-surface py-2 pl-5 pr-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary"
          >
            <Search className="h-5 w-5 shrink-0 text-ink-4" aria-hidden="true" />
            <input
              type="search"
              aria-label="찾을 정책"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="주거, 취업, 교육 등 정책 검색"
              className="min-w-0 flex-1 bg-transparent py-2 text-[17px] text-ink placeholder:text-ink-4 focus:outline-none"
            />
            <button
              type="submit"
              className="btn-primary-brand inline-flex min-h-12 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[0.8125rem] px-5 text-[16px] sm:px-6"
            >
              <span>정책 찾기</span>
              <ArrowRight className="hidden h-4 w-4 sm:block" aria-hidden="true" />
            </button>
          </form>

          <ul
            aria-label="분야별로 보기"
            className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 [&>li:last-child]:col-span-2 sm:[&>li:last-child]:col-span-1"
          >
            {POLICY_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICON[category];
              const count = policies.filter((p) => p.category === category).length;
              return (
                <li key={category} className="flex">
                  <button
                    type="button"
                    onClick={() => onExplore({ category })}
                    className={`flex min-h-[4.75rem] w-full cursor-pointer items-start justify-between gap-2 rounded-2xl p-4 text-left transition-transform duration-150 hover:-translate-y-0.5 ${CATEGORY_TINT[category]}`}
                  >
                    <span>
                      <span className="block text-[15px] font-bold leading-snug text-ink">
                        {category}
                      </span>
                      <span className="mt-0.5 block text-[13px] font-medium tabular-nums text-ink-2">
                        정책 {count}개
                      </span>
                    </span>
                    <Icon className="h-5 w-5 shrink-0 text-ink-2" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 나의 생활권 */}
        <section
          aria-labelledby="home-living-title"
          className="rounded-3xl bg-surface p-6 sm:p-7 lg:col-span-4"
        >
          <h2 id="home-living-title" className="t-card">
            나의 생활권
          </h2>

          <dl className="mt-3 divide-y divide-line-soft text-[15px]">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="font-medium text-ink-3">나이·상태</dt>
              <dd className="text-right font-bold tabular-nums text-ink">
                만 {profile.age}세 · {profile.status}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="font-medium text-ink-3">주민등록지</dt>
              <dd className="text-right font-bold text-ink">
                {profile.residence || '미입력'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="font-medium text-ink-3">학교 소재지</dt>
              <dd className="text-right font-bold text-ink">
                {profile.schoolRegion || '해당 없음'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="font-medium text-ink-3">근무지</dt>
              <dd className="text-right font-bold text-ink">
                {profile.workRegion || '미입력'}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="btn-secondary-outline mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl text-[15px]"
          >
            내 조건 수정
          </button>
          <p className="mt-3 text-center text-[13px] font-medium text-ink-3">
            정책 추천에 쓰는 정보예요.
          </p>
        </section>
      </section>

      {/* 추천 정책 */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="t-section">나를 위한 정책 픽</h2>
          <button
            type="button"
            onClick={() => onNavigate('policies')}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg py-1 text-[14px] font-bold text-ink-2 hover:text-ink"
          >
            <span>정책 모두 보기</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {boardPolicies.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              isSaved={savedIds.includes(policy.id)}
              isCompared={comparePolicyIds.includes(policy.id)}
              isPrepping={prepPolicyIds.includes(policy.id)}
              onToggleSave={onToggleSave}
              onToggleCompare={onToggleCompare}
              onOpenDetail={(id) => onNavigate('detail', id)}
              onStartPreparation={onStartPreparation}
            />
          ))}
        </div>
      </section>

      {/* 오늘의 다음 한 칸 + 전자지갑 */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-3xl bg-surface p-6 sm:p-7 lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="t-section">오늘의 다음 한 칸</h2>
            <span className="badge tabular-nums">
              {activePrepPolicy
                ? `${Math.max(totalCount - doneCount, 0)}개 남음`
                : '준비 시작 전'}
            </span>
          </div>

          <ol className="mt-3 divide-y divide-line-soft">
            <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 w-6 shrink-0 text-[14px] font-bold tabular-nums text-primary"
                >
                  01
                </span>
                <div>
                  <strong className="block text-[16px] font-bold text-ink">
                    주거 지원, 내 생활권도 인정될까?
                  </strong>
                  <p className="mt-0.5 text-[14px] text-ink-2">
                    주민등록지({profile.residence || '미입력'})와 학교 소재지(
                    {profile.schoolRegion || '없음'}) 기준을 확인해요.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('detail', '1')}
                className="btn-secondary-outline ml-9 inline-flex w-fit shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-[14px] sm:ml-0"
              >
                <span>조건 확인</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </li>

            <li className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 w-6 shrink-0 text-[14px] font-bold tabular-nums text-primary"
                >
                  02
                </span>
                <div>
                  <strong className="block text-[16px] font-bold text-ink">
                    서류 준비, 이어서 한 칸
                  </strong>
                  <p className="mt-0.5 text-[14px] text-ink-2 tabular-nums">
                    {activePrepPolicy
                      ? `${activePrepPolicy.title} · ${doneCount}/${totalCount} 점검`
                      : '아직 준비 중인 정책이 없어요 · 정책 찾기에서 담아보세요'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(activePrepPolicy ? 'apply' : 'policies')}
                className="btn-primary-brand ml-9 inline-flex w-fit shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-[14px] sm:ml-0"
              >
                <span>{activePrepPolicy ? '이어가기' : '정책 찾기'}</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </li>
          </ol>
        </div>

        <div className="flex flex-col justify-between gap-6 rounded-3xl bg-surface p-6 sm:p-7 lg:col-span-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="t-section">
                내 문서가 모이면,
                <br />
                다음 준비는 더 가볍게.
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                필요한 서류와 연결된 정책을 전자지갑에서 함께 확인해요.
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent">
              <Wallet className="h-6 w-6 text-primary" aria-hidden="true" />
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('wallet')}
            className="btn-weak inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-[14px]"
          >
            <span>전자지갑 열기</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* 생활변화 비교 */}
      <section className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-accent p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <h2 className="t-section">
            졸업하거나, 이사하면 내 정책은 어떻게 달라질까?
          </h2>
          <p className="mt-1.5 text-[15px] text-ink-2">
            내 정보는 그대로 두고, 변화 후 조건과 영향을 받는 정책을 미리 비교해 봐요.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('switch')}
          className="btn-primary-brand inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 text-[15px]"
        >
          <span>변화 비교하기</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>

      <PolicyCompareBar
        comparedPolicies={comparedPolicies}
        onClearCompare={onClearCompare}
      />
    </div>
  );
};
