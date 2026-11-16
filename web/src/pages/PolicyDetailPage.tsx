import React from 'react';
import { ArrowLeft, ArrowRight, Bookmark, MessageCircle } from 'lucide-react';
import { CriteriaResult, PolicyItem, RouteId, UserProfile } from '../types/policy';
import { evaluatePolicyCriteria } from '../utils/policyEngine';
import { DirectInputSection } from '../components/DirectInputSection';
import { RecruitmentStatusLabel } from '../components/RecruitmentStatusLabel';
import { CATEGORY_TINT } from '../data/categoryStyle';

const CRITERIA_RESULT_BADGE: Record<CriteriaResult, string> = {
  O: 'badge badge-ok',
  X: 'badge badge-bad',
  '?': 'badge badge-warn',
};

interface PolicyDetailPageProps {
  policy: PolicyItem;
  profile: UserProfile;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onNavigate: (route: RouteId, policyId?: string) => void;
  onStartPreparation: (policyId: string) => void;
  onAskSherpaAboutPolicy: (policy: PolicyItem) => void;
}

export const PolicyDetailPage: React.FC<PolicyDetailPageProps> = ({
  policy,
  profile,
  isSaved,
  onToggleSave,
  onNavigate,
  onStartPreparation,
  onAskSherpaAboutPolicy,
}) => {
  const criteriaRows = evaluatePolicyCriteria(policy, profile);

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={() => onNavigate('policies')}
        className="-ml-2 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl px-2 text-[14px] font-bold text-ink-2 hover:bg-surface-3 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>정책 목록으로</span>
      </button>

      {/* 정책 머리: 티켓 한 장. 색은 분야를 뜻한다 */}
      <section
        className={`card-tactile rounded-3xl p-6 sm:p-8 ${CATEGORY_TINT[policy.category]}`}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[14px]">
          <span className="font-bold text-ink">{policy.category}</span>
          <span className="font-medium text-ink-2">{policy.agencyLabel}</span>
        </div>

        <h1 className="t-page mt-3">{policy.title}</h1>
        <p className="t-lead mt-2.5 max-w-3xl">{policy.shortDescription}</p>

        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-dashed border-edge/30 pt-5 sm:grid-cols-3">
          <div>
            <dt className="text-[13px] font-semibold text-ink-3">모집 상태</dt>
            <dd className="mt-1">
              <RecruitmentStatusLabel status={policy.recruitmentStatus} />
            </dd>
          </div>
          <div>
            <dt className="text-[13px] font-semibold text-ink-3">모집 일정</dt>
            <dd className="mt-0.5 text-[16px] font-bold text-ink">
              {policy.deadlineLabel}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] font-semibold text-ink-3">주요 지원 내용</dt>
            <dd className="mt-0.5 text-[16px] font-bold text-ink">
              {policy.supportSummary}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="card-soft rounded-3xl bg-surface p-6 sm:p-8 lg:col-span-8">
          <h2 className="t-section">공고 기준과 나의 조건</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            학교가 타 지역에 있더라도 모든 정책이 재학 지역을 동일하게 인정하는 것은
            아니에요. 주민등록상 거주지, 학교·근무지 기준을 표에서 항목별로 대조해 보세요.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-edge/30 text-[13px] font-bold text-ink-3">
                  <th className="w-[18%] py-3 pr-4 whitespace-nowrap">항목</th>
                  <th className="w-[27%] px-4 py-3">공고 기준</th>
                  <th className="w-[22%] px-4 py-3">내 정보</th>
                  <th className="w-[13%] px-4 py-3 whitespace-nowrap">확인 결과</th>
                  <th className="w-[20%] py-3 pl-4">판단 근거</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft text-[15px] leading-relaxed text-ink-2">
                {criteriaRows.map((row) => (
                  <tr key={row.item}>
                    <th scope="row" className="py-4 pr-4 align-top font-bold text-ink">
                      {row.item}
                    </th>
                    <td className="px-4 py-4 align-top">{row.officialRule}</td>
                    <td className="px-4 py-4 align-top font-semibold text-ink">
                      {row.userMatchNote}
                      {row.result === 'X' && row.reason && (
                        <span className="mt-1.5 block text-[14px] font-bold text-bad">
                          <span aria-hidden="true">! </span>
                          {row.reason}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top whitespace-nowrap">
                      <span className={CRITERIA_RESULT_BADGE[row.result]}>
                        <span aria-hidden="true" className="font-extrabold">
                          {row.result}
                        </span>
                        <span>{row.status}</span>
                      </span>
                    </td>
                    <td className="py-4 pl-4 align-top text-[14px]">{row.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 정책이 바뀌면 key로 입력값을 비운다 */}
          <DirectInputSection key={policy.id} policy={policy} />
        </section>

        {/* 행동 영역: lg 이상에서는 긴 조건표 옆에 따라오도록 sticky (lg 미만 배치는 그대로) */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
          <div className="rounded-3xl bg-sage p-6">
            <h2 className="t-section">
              알아본 정책,
              <br />내 준비로 이어가요.
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
              공고 확인부터 필요 서류 점검까지, 다음 해야 할 일을 신청 준비
              노트에 담아드려요.
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => onStartPreparation(policy.id)}
                className="btn-primary-lime flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px]"
              >
                <span>준비 이어가기</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onToggleSave(policy.id)}
                aria-pressed={isSaved}
                className="btn-secondary-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-surface px-5 py-3 text-[14px]"
              >
                <Bookmark
                  className="h-4 w-4"
                  fill={isSaved ? 'currentColor' : 'none'}
                />
                <span>
                  {isSaved ? '저장 목록에서 빼기' : '나중에 볼 정책으로 저장'}
                </span>
              </button>
            </div>
          </div>

          <div className="card-soft rounded-3xl bg-surface p-6">
            <h2 className="t-card">이 조건이 헷갈린다면?</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
              내비게이터에게 내 생활권과 서류 기준을 쉬운 말로 물어보세요.
            </p>
            <button
              type="button"
              onClick={() => onAskSherpaAboutPolicy(policy)}
              className="btn-primary-brand mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-[14px]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>AI에게 물어보기</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
