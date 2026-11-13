import React from 'react';
import { ArrowRight, ArrowUpRight, Sparkles, Wallet } from 'lucide-react';
import { PolicyCard } from '../components/PolicyCard';
import { PolicyItem, RouteId, UserProfile } from '../types/policy';
import { getRecommendedPoliciesForProfile } from '../utils/policyEngine';

interface HomeBoardPageProps {
  profile: UserProfile;
  policies: PolicyItem[];
  savedIds: string[];
  comparedIds: string[];
  completedChecklistIds: string[];
  activePrepPolicy: PolicyItem;
  onNavigate: (route: RouteId, policyId?: string) => void;
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
}

export const HomeBoardPage: React.FC<HomeBoardPageProps> = ({
  profile,
  policies,
  savedIds,
  comparedIds,
  completedChecklistIds,
  activePrepPolicy,
  onNavigate,
  onToggleSave,
  onToggleCompare,
}) => {
  const recommended = getRecommendedPoliciesForProfile(policies, profile, 3);
  const doneCount = activePrepPolicy.checklist.filter((c) =>
    completedChecklistIds.includes(c.id)
  ).length;
  const totalCount = activePrepPolicy.checklist.length;

  return (
    <div className="space-y-12">
      {/* Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-[#333333]">
        <div>
          <span>나의 다음</span>
          <span className="mx-2 text-[#6B6E68]">/</span>
          <strong className="font-bold text-[#1F2421]">나의 보드</strong>
        </div>
        <span className="font-mono-num tracking-wider text-[#4A4D49]">
          YOUR NEXT, ONE PICK AT A TIME.
        </span>
      </div>

      {/* Hero Split: Left Copy + Primary CTA, Right Living Pass Ticket */}
      <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-6 lg:col-span-6">
          <p className="text-[13px] font-bold tracking-wider text-[#333333]">
            MY NEXT / 내 정책 보드
          </p>

          <div className="relative inline-block">
            <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-[#1F2421] sm:text-5xl">
              내 다음을,
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">가볍게 픽.</span>
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 left-0 right-0 -z-0 h-4 bg-[#D8F279]"
                />
              </span>
            </h1>
            <span className="ml-3 inline-block -rotate-3 rounded-lg border border-[#262A27] bg-[#FBE1D6] px-2.5 py-1 text-xs font-bold text-[#1F2421] align-top">
              나에게 맞는 가능성 ↗
            </span>
          </div>

          <p className="max-w-lg text-[16px] leading-relaxed text-[#333333]">
            사는 곳과 학교, 지금의 나를 함께 살펴보고 정책 발견부터 신청
            준비까지 한 칸씩 이어가요.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('policies')}
              className="btn-primary-lime inline-flex cursor-pointer items-center gap-2.5 rounded-2xl px-6 py-3.5 text-[16px]"
            >
              <span>내게 맞는 정책 찾기</span>
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="text-[14px] font-medium leading-snug text-[#333333]">
              조건 확인부터 신청 준비까지,
              <br />한 번에 이어가요.
            </span>
          </div>
        </div>

        {/* MY LIVING PASS Ticket Card */}
        <div className="lg:col-span-6">
          <section
            aria-label="내 생활권 패스"
            className="card-tactile relative overflow-hidden rounded-3xl bg-[#E8E0FC] p-6 sm:p-7 lg:rotate-[0.6deg]"
          >
            <div className="mb-5 flex items-center justify-between border-b border-[#262A27]/20 pb-3">
              <strong className="font-mono-num text-xs font-bold tracking-widest text-[#1F2421]">
                MY LIVING PASS
              </strong>
              <span className="text-[13px] font-bold text-[#333333]">
                나의 생활권
              </span>
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-extrabold text-[#1F2421]">
                  나의 출발점
                </h2>
                <span className="text-[14px] font-bold text-[#333333] tabular-nums">
                  만 {profile.age}세 · {profile.status}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#262A27]/20 bg-white/75 p-4 sm:grid-cols-2">
                <div>
                  <span className="block text-[13px] font-semibold text-[#4A4D49]">
                    주민등록지
                  </span>
                  <strong className="mt-0.5 block text-xl font-extrabold text-[#1F2421]">
                    {profile.residence || '미입력'}
                  </strong>
                </div>
                <div>
                  <span className="block text-[13px] font-semibold text-[#4A4D49]">
                    학교 소재지
                  </span>
                  <strong className="mt-0.5 block text-xl font-extrabold text-[#1F2421]">
                    {profile.schoolRegion || '해당 없음'}
                  </strong>
                </div>
              </div>

              <p className="text-[13px] font-medium text-[#333333]">
                추천에 사용하는 정보 · 모달 선택으로 정확하게 관리해요
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-dashed border-[#262A27]/35 pt-4">
              <span className="font-mono-num text-xs font-bold tracking-widest text-[#333333]">
                ||| |||| ||| MY NEXT
              </span>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="btn-primary-brand inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-[14px]"
              >
                <span>내 조건 수정</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
      </section>

      {/* Today's Next Steps & My Pocket (Note: The 3 old summary cards 검토할 정책 / 추가 확인 필요 / 신청 준비 중 are completely removed per requirement #2) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="card-soft rounded-3xl bg-white p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-[#1F2421]">
              오늘의 다음 한 칸
            </h2>
            <span className="rounded-lg border border-[#DCD7C9] bg-[#F7F5EE] px-3 py-1 text-[13px] font-bold text-[#333333] tabular-nums">
              {Math.max(totalCount - doneCount, 0)}개 남음
            </span>
          </div>

          <div className="divide-y divide-[#ECE8DC]">
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <span className="font-mono-num flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#C9C4B6] bg-[#F7F5EE] text-xs font-bold text-[#1F2421]">
                  01
                </span>
                <div>
                  <strong className="block text-[16px] font-bold text-[#1F2421]">
                    주거 지원, 내 생활권도 인정될까?
                  </strong>
                  <p className="mt-0.5 text-[14px] text-[#333333]">
                    주민등록지({profile.residence || '미입력'})와 학교 소재지(
                    {profile.schoolRegion || '없음'}) 기준을 확인해요.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('detail', '1')}
                className="btn-secondary-outline inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-[14px]"
              >
                <span>조건 확인</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <span className="font-mono-num flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#C9C4B6] bg-[#F7F5EE] text-xs font-bold text-[#1F2421]">
                  02
                </span>
                <div>
                  <strong className="block text-[16px] font-bold text-[#1F2421]">
                    서류 준비, 이어서 한 칸
                  </strong>
                  <p className="mt-0.5 text-[14px] text-[#333333] tabular-nums">
                    {activePrepPolicy.title} · {doneCount}/{totalCount} 점검
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('apply')}
                className="btn-primary-brand inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-[14px]"
              >
                <span>이어가기</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* MY POCKET Card */}
        <div className="card-soft flex flex-col justify-between rounded-3xl bg-[#EEF1E3] p-6 lg:col-span-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="font-mono-num text-xs font-bold tracking-wider text-[#333333]">
                MY POCKET
              </span>
              <h3 className="text-2xl font-extrabold leading-snug text-[#1F2421]">
                내 문서가 모이면,
                <br />
                다음 준비는 더 가볍게.
              </h3>
              <p className="text-[15px] leading-relaxed text-[#333333]">
                필요한 서류와 연결된 정책을 전자지갑에서 함께 확인해요.
              </p>
            </div>

            <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-[#262A27] bg-[#D8F279] shadow-sm">
              <Wallet className="h-7 w-7 text-[#1F2421]" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => onNavigate('wallet')}
              className="btn-primary-brand inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-[14px]"
            >
              <span>전자지갑 열기</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* Recommended Policies Section */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono-num rounded-lg border border-[#262A27] bg-[#D8F279] px-2.5 py-1 text-xs font-bold text-[#1F2421]">
              01
            </span>
            <h2 className="text-2xl font-extrabold text-[#1F2421]">
              나를 위한 정책 픽
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('policies')}
            className="btn-secondary-outline inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-[14px]"
          >
            <span>정책 모두 보기</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recommended.map((policy) => (
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
      </section>

      {/* Bottom Life Change Comparison Banner */}
      <section className="card-tactile flex flex-col items-start justify-between gap-5 rounded-3xl bg-[#E8E0FC] p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#333333]">
            <Sparkles className="h-4 w-4 text-[#1F2421]" aria-hidden="true" />
            <span>생활변화 시뮬레이션</span>
          </div>
          <h3 className="text-xl font-extrabold text-[#1F2421] sm:text-2xl">
            졸업하거나, 이사하면 내 정책은 어떻게 달라질까?
          </h3>
          <p className="text-[15px] text-[#333333]">
            내 정보는 그대로 두고, 변화 후 조건과 영향을 받는 정책을 미리 비교해 봐요.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('switch')}
          className="btn-primary-brand inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl px-6 py-3.5 text-[15px]"
        >
          <span>변화 비교하기</span>
          <ArrowUpRight className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
};
