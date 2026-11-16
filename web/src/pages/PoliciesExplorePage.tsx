import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { PolicyCard } from '../components/PolicyCard';
import { PolicyCompareBar } from '../components/PolicyCompareBar';
import {
  ExplorePreset,
  POLICY_CATEGORIES,
  PolicyCategory,
  PolicyItem,
  RecruitmentStatus,
  RouteId,
  UserProfile,
} from '../types/policy';
import {
  filterAndSortPolicies,
  getComparedPoliciesForTab,
  paginatePolicies,
} from '../utils/policyEngine';

const ITEMS_PER_PAGE = 10;

interface PoliciesExplorePageProps {
  profile: UserProfile;
  policies: PolicyItem[];
  savedIds: string[];
  comparePolicyIds: string[];
  prepPolicyIds: string[];
  /** 홈에서 넘어올 때 미리 채울 검색어·분야 */
  preset?: ExplorePreset | null;
  onNavigate: (route: RouteId, policyId?: string) => void;
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onClearCompare: () => void;
  onStartPreparation: (policyId: string) => void;
  onOpenSherpaWithPrompt: (prompt: string) => void;
}

const QUICK_KEYWORDS = [
  { label: '대학생', query: '재학' },
  { label: '취업 준비', query: '취업' },
  { label: '독립·월세', query: '주거' },
  { label: '교육·자격', query: '교육' },
  { label: '자산형성·문화', query: '금융' },
];

export const PoliciesExplorePage: React.FC<PoliciesExplorePageProps> = ({
  profile,
  policies,
  savedIds,
  comparePolicyIds,
  prepPolicyIds,
  preset,
  onNavigate,
  onToggleSave,
  onToggleCompare,
  onClearCompare,
  onStartPreparation,
  onOpenSherpaWithPrompt,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'전체' | PolicyCategory>(
    preset?.category ?? '전체'
  );
  const [recruitmentStatus, setRecruitmentStatus] = useState<
    '전체' | RecruitmentStatus
  >('전체');
  const [searchInput, setSearchInput] = useState(preset?.query ?? '');
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'openFirst'>(
    'default'
  );
  const [savedOnly, setSavedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const listTopRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, recruitmentStatus, searchInput, sortBy, savedOnly]);

  const filteredPolicies = useMemo(
    () =>
      filterAndSortPolicies(policies, {
        category: selectedCategory,
        recruitmentStatus,
        searchQuery: searchInput,
        sortBy,
        savedOnly,
        savedIds,
      }),
    [policies, selectedCategory, recruitmentStatus, searchInput, sortBy, savedOnly, savedIds]
  );

  const {
    items: paginatedPolicies,
    currentPage: safePage,
    totalPages,
  } = useMemo(
    () => paginatePolicies(filteredPolicies, currentPage, ITEMS_PER_PAGE),
    [filteredPolicies, currentPage]
  );

  const handlePageChange = (nextPage: number) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    setCurrentPage(clamped);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const explorePolicies = policies;
  const comparedPolicies = useMemo(
    () => getComparedPoliciesForTab(explorePolicies, comparePolicyIds),
    [explorePolicies, comparePolicyIds]
  );

  const profileSummary = [
    `만 ${profile.age}세`,
    profile.status,
    `거주 ${profile.residence || '미입력'}`,
    `학교 ${profile.schoolRegion || '해당 없음'}`,
  ].join(' · ');

  return (
    <div className="space-y-8">
      {/* 제목과 저장한 정책 보기 */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="t-page">지금 내게 필요한, 한 장.</h1>
          <p className="t-lead mt-2">
            온통청년 5대 정책 분야별로 분류해 살펴보고, 내 생활권과 모집 상태를 바로 확인해요.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSavedOnly((prev) => !prev)}
          aria-pressed={savedOnly}
          className="chip shrink-0 self-start sm:self-auto"
        >
          <Bookmark className="h-4 w-4" fill={savedOnly ? 'currentColor' : 'none'} />
          <span className="tabular-nums">저장한 정책 {savedIds.length}</span>
        </button>
      </div>

      {/* 검색 */}
      <div className="space-y-3">
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="flex items-center gap-2 rounded-2xl border-[1.5px] border-edge bg-surface py-1.5 pl-4 pr-1.5"
        >
          <Search className="h-5 w-5 shrink-0 text-ink-3" aria-hidden="true" />
          <label htmlFor="policy-search-input" className="sr-only">
            정책명 또는 관심 분야 검색
          </label>
          <input
            id="policy-search-input"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="주거, 취업, 교육·직업훈련, 금융·복지·문화 등 정책을 검색해 보세요"
            className="min-w-0 flex-1 bg-transparent py-2 text-[16px] text-ink placeholder:text-ink-4 focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="검색어 지우기"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-2 hover:bg-surface-3"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="btn-primary-brand shrink-0 cursor-pointer whitespace-nowrap rounded-xl px-4 py-2.5 text-[15px] sm:px-5"
          >
            검색
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[14px] font-semibold text-ink-2">
            이런 다음은 어때요?
          </span>
          {QUICK_KEYWORDS.map((kw) => (
            <button
              key={kw.label}
              type="button"
              aria-pressed={searchInput === kw.query}
              onClick={() =>
                setSearchInput((prev) => (prev === kw.query ? '' : kw.query))
              }
              className="chip chip-sm"
            >
              {kw.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              onOpenSherpaWithPrompt('내 상황과 생활권 기준으로 어떤 정책부터 볼까요?')
            }
            className="inline-flex min-h-8 cursor-pointer items-center gap-1 whitespace-nowrap px-2 text-[14px] font-bold text-ink hover:underline"
          >
            <span>내 상황으로 물어보기</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="group flex max-w-full cursor-pointer items-center gap-2 rounded-xl text-left text-[14px] text-ink-2"
        >
          <span className="shrink-0 font-bold text-ink">내 조건</span>
          <span className="min-w-0 truncate">{profileSummary}</span>
          <span className="inline-flex shrink-0 items-center font-bold text-ink group-hover:underline">
            수정
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      </div>

      {/* 분야 탭과 목록 */}
      <section
        ref={listTopRef}
        className="scroll-mt-24 space-y-5 border-t border-line pt-6"
      >
        <div
          role="group"
          aria-label="정책 분야"
          className="flex flex-wrap items-center gap-2"
        >
          {(['전체', ...POLICY_CATEGORIES] as const).map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
              className="chip"
            >
              {category}
            </button>
          ))}
        </div>

        {/* 목록 머리: 개수, 모집 상태, 정렬 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {/* 제목 순서: h1(페이지) -> h2(목록) -> h3(카드) */}
            <h2 className="t-section tabular-nums">
              찾은 정책 {filteredPolicies.length}개
            </h2>
            <span className="t-meta">
              {selectedCategory} · {recruitmentStatus} 기준
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor="recruitment-status-filter"
                className="text-[14px] font-semibold text-ink-2"
              >
                모집 상태
              </label>
              <select
                id="recruitment-status-filter"
                aria-label="모집 상태 필터"
                value={recruitmentStatus}
                onChange={(e) =>
                  setRecruitmentStatus(
                    e.target.value as '전체' | RecruitmentStatus
                  )
                }
                className="field cursor-pointer text-[14px] font-semibold"
              >
                <option value="전체">전체</option>
                <option value="모집 중">모집 중</option>
                <option value="마감">마감</option>
                <option value="공고 확인 필요">공고 확인 필요</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="policy-sort-select"
                className="text-[14px] font-semibold text-ink-2"
              >
                정렬
              </label>
              <select
                id="policy-sort-select"
                aria-label="정렬 기준"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'default' | 'name' | 'openFirst')
                }
                className="field cursor-pointer text-[14px] font-semibold"
              >
                <option value="default">기본순</option>
                <option value="openFirst">모집 중 우선</option>
                <option value="name">정책명순</option>
              </select>
            </div>
          </div>
        </div>

        {filteredPolicies.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedPolicies.map((policy) => (
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

            <nav
              aria-label="정책 목록 페이지네이션"
              className="flex flex-wrap items-center justify-center gap-2 pt-4"
            >
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => handlePageChange(safePage - 1)}
                className="chip disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>이전</span>
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                (pageNum) => {
                  const isActive = pageNum === safePage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      aria-current={isActive ? 'true' : undefined}
                      aria-label={`${pageNum}페이지`}
                      className="chip min-w-10 justify-center px-3 tabular-nums"
                    >
                      {pageNum}
                    </button>
                  );
                }
              )}

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => handlePageChange(safePage + 1)}
                className="chip disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span>다음</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          </>
        ) : (
          <div className="card-soft rounded-3xl bg-surface p-10 text-center">
            <p className="t-card">선택한 조건에 맞는 정책이 아직 없어요.</p>
            <p className="mt-1.5 text-[15px] text-ink-2">
              분야나 모집 상태 필터를 전체로 돌려서 다른 정책을 살펴보세요.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('전체');
                setRecruitmentStatus('전체');
                setSearchInput('');
                setSavedOnly(false);
                setCurrentPage(1);
              }}
              className="btn-primary-brand mt-5 cursor-pointer rounded-xl px-5 py-2.5 text-[14px]"
            >
              필터 전체로 보기
            </button>
          </div>
        )}
      </section>

      <PolicyCompareBar
        comparedPolicies={comparedPolicies}
        onClearCompare={onClearCompare}
      />
    </div>
  );
};
