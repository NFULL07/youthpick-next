import React from 'react';
import { ArrowRight, Bookmark, Check } from 'lucide-react';
import { CATEGORY_TINT } from '../data/categoryStyle';
import { PolicyItem } from '../types/policy';
import { RecruitmentStatusLabel } from './RecruitmentStatusLabel';

interface PolicyCardProps {
  policy: PolicyItem;
  isSaved: boolean;
  isCompared: boolean;
  isPrepping?: boolean;
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onStartPreparation?: (id: string) => void;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({
  policy,
  isSaved,
  isCompared,
  isPrepping = false,
  onToggleSave,
  onToggleCompare,
  onOpenDetail,
  onStartPreparation,
}) => {
  return (
    <article className="flex flex-col rounded-3xl bg-surface p-6">
      {/* 분야와 저장 */}
      <div className="flex items-center justify-between gap-3">
        <span className={`badge text-ink ${CATEGORY_TINT[policy.category]}`}>
          {policy.category}
        </span>
        <button
          type="button"
          onClick={() => onToggleSave(policy.id)}
          aria-label={`${policy.title} 저장`}
          aria-pressed={isSaved}
          className={`-mr-2 -mt-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors hover:bg-surface-2 ${
            isSaved ? 'text-primary' : 'text-ink-4'
          }`}
        >
          <Bookmark className="h-5 w-5" fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* 이름, 기관, 지원 내용 */}
      <h3 className="t-card mt-3">
        <button
          type="button"
          onClick={() => onOpenDetail(policy.id)}
          className="cursor-pointer text-left hover:text-primary"
        >
          {policy.title}
        </button>
      </h3>
      <p className="t-meta mt-1">{policy.agencyLabel}</p>

      <p className="mt-4 text-[16px] font-semibold leading-relaxed text-ink">
        {policy.supportSummary}
      </p>
      <p className="mt-1 text-[15px] leading-relaxed text-ink-3">
        {policy.shortDescription}
      </p>

      {/* 상태와 확인할 점 */}
      <dl className="mt-auto space-y-1.5 pt-5 text-[14px]">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <dt className="sr-only">모집 상태</dt>
          <dd className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <RecruitmentStatusLabel status={policy.recruitmentStatus} />
            <span className="font-medium text-ink-3">{policy.deadlineLabel}</span>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-semibold text-ink-3">확인할 점</dt>
          <dd className="font-medium text-ink-2">{policy.keyCheckHint}</dd>
        </div>
      </dl>

      {/* 행동 */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-4">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px] font-semibold text-ink-2">
          <input
            type="checkbox"
            checked={isCompared}
            onChange={() => onToggleCompare(policy.id)}
            aria-label={`${policy.title} 비교 선택`}
            className="peer sr-only"
          />
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${
              isCompared
                ? 'border-primary bg-primary text-white'
                : 'border-line-dim bg-surface'
            }`}
          >
            {isCompared && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
          <span className="whitespace-nowrap">비교 담기</span>
        </label>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          {onStartPreparation && (
            <button
              type="button"
              onClick={() => onStartPreparation(policy.id)}
              className={`min-h-11 cursor-pointer whitespace-nowrap rounded-xl px-3 text-[14px] font-bold transition-colors ${
                isPrepping
                  ? 'bg-accent text-primary-hover hover:bg-accent-hover'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              }`}
            >
              준비 이어가기
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenDetail(policy.id)}
            className="btn-weak inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-[14px]"
          >
            <span>내 조건 확인</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};
