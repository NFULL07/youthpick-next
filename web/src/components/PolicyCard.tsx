import React from 'react';
import { ArrowRight, Bookmark, Check, Info } from 'lucide-react';
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
    <article className="card-tactile flex flex-col overflow-hidden rounded-3xl bg-surface transition-transform duration-150 hover:-translate-y-0.5">
      {/* 티켓 띠: 색은 분야를 뜻한다 */}
      <div
        className={`flex items-center justify-between gap-3 border-b border-edge py-1.5 pl-5 pr-2 ${CATEGORY_TINT[policy.category]}`}
      >
        <div className="flex min-w-0 items-baseline gap-2 text-[14px] font-bold text-ink">
          <span className="truncate">{policy.category}</span>
          <span className="font-mono-num shrink-0 text-[12px] font-bold text-ink-3">
            {policy.pickNumber}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleSave(policy.id)}
          aria-label={`${policy.title} 저장`}
          aria-pressed={isSaved}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface/70"
        >
          <Bookmark className="h-5 w-5" fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* 본문: 기관, 이름, 지원 내용, 상태 */}
      <div className="flex flex-1 flex-col p-5">
        <p className="t-meta">{policy.agencyLabel}</p>

        <h3 className="t-card mt-1">
          <button
            type="button"
            onClick={() => onOpenDetail(policy.id)}
            className="cursor-pointer text-left hover:underline"
          >
            {policy.title}
          </button>
        </h3>

        <p className="mt-3 text-[15px] font-semibold leading-relaxed text-ink">
          {policy.supportSummary}
        </p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-3">
          {policy.shortDescription}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-4">
          <RecruitmentStatusLabel status={policy.recruitmentStatus} />
          <span className="text-[13px] font-medium text-ink-3">
            {policy.deadlineLabel}
          </span>
        </div>
      </div>

      {/* 절취선 아래: 확인할 점과 행동 */}
      <div className="border-t border-dashed border-line-mid bg-surface-2 px-5 py-3.5">
        <p className="flex items-start gap-2 text-[13px] font-medium text-ink-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{policy.keyCheckHint}</span>
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[14px] font-semibold text-ink-2">
            <input
              type="checkbox"
              checked={isCompared}
              onChange={() => onToggleCompare(policy.id)}
              aria-label={`${policy.title} 비교 선택`}
              className="peer sr-only"
            />
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
                isCompared ? 'border-ink bg-ink text-white' : 'border-ink-4 bg-surface'
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
                className={`cursor-pointer whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-bold transition-colors ${
                  isPrepping
                    ? 'bg-accent text-ink hover:bg-accent-hover'
                    : 'text-ink-2 hover:bg-surface-3 hover:text-ink'
                }`}
              >
                준비 이어가기
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenDetail(policy.id)}
              className="btn-primary-brand inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px]"
            >
              <span>내 조건 확인</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
