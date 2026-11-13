import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { PolicyCard } from '../components/PolicyCard';
import {
  POLICY_CATEGORIES,
  PolicyCategory,
  PolicyItem,
  RecruitmentStatus,
  RouteId,
  UserProfile,
} from '../types/policy';
import { filterAndSortPolicies } from '../utils/policyEngine';

interface PoliciesExplorePageProps {
  profile: UserProfile;
  policies: PolicyItem[];
  savedIds: string[];
  comparedIds: string[];
  onNavigate: (route: RouteId, policyId?: string) => void;
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onClearCompare: () => void;
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
  comparedIds,
  onNavigate,
  onToggleSave,
  onToggleCompare,
  onClearCompare,
  onOpenSherpaWithPrompt,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'전체' | PolicyCategory>(
    '전체'
  );
  const [recruitmentStatus, setRecruitmentStatus] = useState<
    '전체' | RecruitmentStatus
  >('전체');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'openFirst'>(
    'default'
  );
  const [savedOnly, setSavedOnly] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

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

  const comparedPolicies = useMemo(
    () => policies.filter((p) => comparedIds.includes(p.id)),
    [policies, comparedIds]
  );

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-[#333333]">
        <div>
          <span>나의 다음</span>
          <span className="mx-2 text-[#6B6E68]">/</span>
          <strong className="font-bold text-[#1F2421]">정책 찾기</strong>
        </div>
        <span className="font-mono-num tracking-wider text-[#4A4D49]">
          YOUR NEXT, ONE PICK AT A TIME.
        </span>
      </div>

      {/* Page Heading & Saved Toggle */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="font-mono-num text-xs font-bold tracking-wider text-[#333333]">
            FIND YOUR NEXT
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1F2421] sm:text-4xl">
            지금 내게 필요한, 한 장.
          </h1>
          <p className="text-[16px] text-[#333333]">
            온통청년 5대 정책 분야별로 분류해 살펴보고, 내 생활권과 모집 상태를 바로 확인해요.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSavedOnly((prev) => !prev)}
          aria-pressed={savedOnly}
          className={`inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-[14px] font-bold transition-colors ${
            savedOnly
              ? 'border-[1.5px] border-[#262A27] bg-[#D8F279] text-[#1F2421]'
              : 'border-[1.5px] border-[#B5B0A2] bg-white text-[#1F2421] hover:bg-[#EFECE3]'
          }`}
        >
          <Bookmark className="h-4 w-4" fill={savedOnly ? 'currentColor' : 'none'} />
          <span className="tabular-nums">저장한 정책 {savedIds.length}</span>
        </button>
      </div>

      {/* Unified Search Bar */}
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[#262A27] bg-white px-4 py-2.5 shadow-sm"
      >
        <Search className="h-5 w-5 shrink-0 text-[#333333]" aria-hidden="true" />
        <label htmlFor="policy-search-input" className="sr-only">
          정책명 또는 관심 분야 검색
        </label>
        <input
          id="policy-search-input"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="주거, 취업, 교육·직업훈련, 금융·복지·문화 등 정책을 검색해 보세요"
          className="flex-1 bg-transparent text-[15px] text-[#1F2421] placeholder:text-[#5C5F5B] focus:outline-none"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput('')}
            aria-label="검색어 지우기"
            className="cursor-pointer rounded-lg p-1.5 text-[#333333] hover:bg-[#EFECE3]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="btn-primary-brand cursor-pointer whitespace-nowrap rounded-xl px-5 py-2.5 text-[14px]"
        >
          검색
        </button>
      </form>

      {/* Quick Intent & Active Profile Summary */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[14px] font-semibold text-[#333333]">
            이런 다음은 어때요?
          </span>
          {QUICK_KEYWORDS.map((kw) => (
            <button
              key={kw.label}
              type="button"
              onClick={() =>
                setSearchInput((prev) => (prev === kw.query ? '' : kw.query))
              }
              className={`cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                searchInput === kw.query
                  ? 'border-[#262A27] bg-[#1F2421] text-white'
                  : 'border-[#C9C4B6] bg-white text-[#333333] hover:border-[#262A27]'
              }`}
            >
              {kw.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              onOpenSherpaWithPrompt('내 상황과 생활권 기준으로 어떤 정책부터 볼까요?')
            }
            className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap px-2 py-1.5 text-[14px] font-bold text-[#1F2421] hover:underline"
          >
            <span>내 상황으로 물어보기</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="font-bold text-[#333333]">내 조건</span>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#E8E0FC] px-3 py-1 font-bold text-[#1F2421] hover:bg-[#DDD1FA]"
          >
            <span>만 {profile.age}세</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#E8E0FC] px-3 py-1 font-bold text-[#1F2421] hover:bg-[#DDD1FA]"
          >
            <span>{profile.status}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#E8E0FC] px-3 py-1 font-bold text-[#1F2421] hover:bg-[#DDD1FA]"
          >
            <span>거주 {profile.residence || '미입력'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#E8E0FC] px-3 py-1 font-bold text-[#1F2421] hover:bg-[#DDD1FA]"
          >
            <span>학교 {profile.schoolRegion || '해당 없음'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Category Tabs (5 Ontong-Youth Categories) & Top-Right Recruitment Status + Sort Controls (NO "조금 더 나에게 맞게" sidebar!) */}
      <section className="space-y-5 border-t border-[#DCD7C9] pt-6">
        <div
          role="group"
          aria-label="정책 분야"
          className="flex flex-wrap items-center gap-2"
        >
          {(['전체', ...POLICY_CATEGORIES] as const).map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedCategory(category)}
                className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-bold transition-colors ${
                  active
                    ? 'border-[1.5px] border-[#1F2421] bg-[#1F2421] text-white'
                    : 'border border-[#C9C4B6] bg-white text-[#333333] hover:border-[#262A27] hover:text-[#1F2421]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Policy List Toolbar: Left Count, Right Recruitment Status Filter + Sort */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#DCD7C9] bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[15px] text-[#333333]">
            <strong className="font-extrabold text-[#1F2421] tabular-nums">
              찾은 정책 {filteredPolicies.length}개
            </strong>
            <span className="text-[#6B6E68]">·</span>
            <span className="text-[14px] font-medium text-[#333333]">
              {selectedCategory} · {recruitmentStatus} 기준
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Recruitment Status Filter relocated cleanly to list top-right */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                className="h-4 w-4 text-[#333333]"
                aria-hidden="true"
              />
              <label
                htmlFor="recruitment-status-filter"
                className="text-[14px] font-bold text-[#1F2421]"
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
                className="cursor-pointer rounded-xl border border-[#B5B0A2] bg-[#FAF8F2] px-3 py-2 text-[14px] font-semibold text-[#1F2421]"
              >
                <option value="전체">전체</option>
                <option value="모집 중">모집 중</option>
                <option value="마감">마감</option>
                <option value="공고 연결 후 확인">공고 연결 후 확인</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="policy-sort-select"
                className="text-[14px] font-bold text-[#1F2421]"
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
                className="cursor-pointer rounded-xl border border-[#B5B0A2] bg-[#FAF8F2] px-3 py-2 text-[14px] font-semibold text-[#1F2421]"
              >
                <option value="default">기본순</option>
                <option value="openFirst">모집 중 우선</option>
                <option value="name">정책명순</option>
              </select>
            </div>
          </div>
        </div>

        {/* Policy Card Grid (Full Width without Left Filter Panel) */}
        {filteredPolicies.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPolicies.map((policy) => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                isSaved={savedIds.includes(policy.id)}
                isCompared={comparedIds.includes(policy.id)}
                onToggleSave={onToggleSave}
                onToggleCompare={onToggleCompare}
                onOpenDetail={(id) => onNavigate('detail', id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-[#DCD7C9] bg-white p-10 text-center">
            <p className="text-lg font-bold text-[#1F2421]">
              선택한 조건에 맞는 정책이 아직 없어요.
            </p>
            <p className="mt-1.5 text-[15px] text-[#333333]">
              분야나 모집 상태 필터를 전체로 돌려서 다른 정책을 살펴보세요.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('전체');
                setRecruitmentStatus('전체');
                setSearchInput('');
                setSavedOnly(false);
              }}
              className="btn-primary-brand mt-5 cursor-pointer rounded-xl px-5 py-2.5 text-[14px]"
            >
              필터 전체로 보기
            </button>
          </div>
        )}
      </section>

      {/* Floating Comparison Bar when policies are selected */}
      {comparedPolicies.length > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border-[1.5px] border-[#262A27] bg-[#1F2421] px-5 py-3.5 text-white shadow-xl">
          <div className="text-[14px] font-semibold">
            비교 선택한 정책{' '}
            <strong className="text-[#D8F279] tabular-nums">
              {comparedPolicies.length}개
            </strong>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClearCompare}
              className="cursor-pointer rounded-xl border border-white/30 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-white/10"
            >
              선택 비우기
            </button>
            <button
              type="button"
              onClick={() => setShowCompareModal(true)}
              className="btn-primary-lime cursor-pointer rounded-xl px-4 py-2 text-[13px]"
            >
              한눈에 표로 비교하기
            </button>
          </div>
        </div>
      )}

      {/* Side-by-side Policy Comparison Modal with Generous Table Padding */}
      {showCompareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2421]/50 p-4 backdrop-blur-[2px]"
          onClick={() => setShowCompareModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="선택한 정책 비교표"
            className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-3xl border-[1.5px] border-[#262A27] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#1F2421]">
                선택한 정책 조건 한눈에 비교하기
              </h2>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="btn-secondary-outline cursor-pointer rounded-xl px-3.5 py-1.5 text-sm"
              >
                닫기
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#DCD7C9]">
              <table className="w-full border-collapse text-left text-[15px]">
                <thead>
                  <tr className="border-b border-[#262A27]/20 bg-[#F7F5EE] text-[#1F2421]">
                    <th className="px-6 py-4 font-bold">비교 항목</th>
                    {comparedPolicies.map((p) => (
                      <th key={p.id} className="px-6 py-4 font-extrabold">
                        {p.title}
                        {p.isDemo && (
                          <span className="ml-2 inline-flex rounded-md border border-[#B8860B] bg-[#FFF0CC] px-1.5 py-0.5 align-middle text-[11px] font-bold text-[#1F2421]">
                            시연 예시
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE8DC] text-[#333333]">
                  <tr>
                    <td className="px-6 py-4 font-bold text-[#1F2421]">분류</td>
                    {comparedPolicies.map((p) => (
                      <td key={p.id} className="px-6 py-4">
                        {p.category}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-bold text-[#1F2421]">모집 상태</td>
                    {comparedPolicies.map((p) => (
                      <td key={p.id} className="px-6 py-4 font-semibold">
                        {p.recruitmentStatus}
                        {p.deadlineLabel !== p.recruitmentStatus &&
                          ` (${p.deadlineLabel})`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-bold text-[#1F2421]">지원 내용</td>
                    {comparedPolicies.map((p) => (
                      <td key={p.id} className="px-6 py-4 leading-relaxed">
                        {p.supportSummary}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-bold text-[#1F2421]">필수 확인 서류</td>
                    {comparedPolicies.map((p) => (
                      <td key={p.id} className="px-6 py-4 leading-relaxed">
                        {p.requiredDocs.join(', ')}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
