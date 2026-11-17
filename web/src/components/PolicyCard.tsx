import React from 'react';
import { ArrowRight, Bookmark, Check, Info } from 'lucide-react';
import { PolicyItem } from '../types/policy';
import { RecruitmentStatusBadge } from './RecruitmentStatusBadge';

interface PolicyCardProps {
  policy: PolicyItem;
  isSaved: boolean;
  isCompared: boolean;
  isPrepping?: boolean;
  /** 내 정보로 판정했을 때 X인 조건의 이유. 모집 중이면서 이 값이 있으면 상자가 빨강이 된다 */
  unmetReasons?: string[];
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onStartPreparation?: (id: string) => void;
}

const ACCENT_BG: Record<PolicyItem['accentTheme'], string> = {
  peach: 'bg-[#FBE1D6]',
  lime: 'bg-[#D8F279]',
  lavender: 'bg-[#E8E0FC]',
  sage: 'bg-[#E5ECD4]',
};

export const PolicyCard: React.FC<PolicyCardProps> = ({
  policy,
  isSaved,
  isCompared,
  isPrepping = false,
  unmetReasons = [],
  onToggleSave,
  onToggleCompare,
  onOpenDetail,
  onStartPreparation,
}) => {
  const showUnmet = policy.recruitmentStatus === '모집 중' && unmetReasons.length > 0;
  return (
    <article className="card-tactile flex flex-col justify-between overflow-hidden rounded-3xl bg-white break-keep transition-transform duration-150 hover:-translate-y-0.5">
      {/* Pastel Ticket Top Strip */}
      <div
        className={`flex items-center justify-between border-b border-[#262A27] px-5 py-3.5 ${ACCENT_BG[policy.accentTheme]}`}
      >
        <div className="flex items-center gap-2 text-[14px] font-bold text-[#1F2421]">
          <span>{policy.category}</span>
          <span aria-hidden="true" className="text-[#4A4D49]">
            /
          </span>
          <span className="font-mono-num text-[13px] font-bold text-[#333333]">
            {policy.pickNumber}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleSave(policy.id)}
          aria-label={`${policy.title} 저장`}
          aria-pressed={isSaved}
          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
            isSaved
              ? 'border-[#262A27] bg-[#1F2421] text-white'
              : 'border-[#262A27]/30 bg-white/80 text-[#1F2421] hover:bg-white'
          }`}
        >
          <Bookmark className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex flex-1 flex-col gap-3.5 p-5">
        <p className="text-[13px] font-semibold text-[#4A4D49]">
          {policy.agencyLabel}
        </p>

        <h3 className="text-[19px] font-extrabold leading-snug text-[#1F2421]">
          <button
            type="button"
            onClick={() => onOpenDetail(policy.id)}
            className="cursor-pointer text-left hover:underline"
          >
            {policy.title}
          </button>
        </h3>

        <p className="text-[15px] leading-relaxed text-[#333333]">
          {policy.shortDescription}
        </p>

        <div className="rounded-xl bg-[#F7F5EE] px-3.5 py-2.5 text-[14px] font-medium text-[#222623]">
          {policy.supportSummary}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <RecruitmentStatusBadge
            status={policy.recruitmentStatus}
            hasUnmet={showUnmet}
          />
          <span className="text-[13px] font-semibold text-[#333333]">
            {policy.deadlineLabel}
          </span>
        </div>

        {/* 빨간 상자일 때는 왜 그런지(X 이유)를 바로 아래에 적는다 */}
        {showUnmet && (
          <p className="-mt-1 text-[13px] font-semibold leading-snug text-[#A33A1E]">
            {unmetReasons[0]}
            {unmetReasons.length > 1 && ` 외 ${unmetReasons.length - 1}건`}
          </p>
        )}

        <div className="flex items-start gap-2 border-t border-[#ECE8DC] pt-3 text-[13px] font-medium text-[#333333]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4A4D49]" aria-hidden="true" />
          <span>{policy.keyCheckHint}</span>
        </div>
      </div>

      {/* Bottom Action Footer with Ticket Notch Divider */}
      <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[#C7C2B4] bg-[#FAF8F2] px-5 py-3.5">
        <label className="flex cursor-pointer items-center gap-2 text-[14px] font-semibold text-[#333333]">
          <input
            type="checkbox"
            checked={isCompared}
            onChange={() => onToggleCompare(policy.id)}
            aria-label={`${policy.title} 비교 선택`}
            className="sr-only"
          />
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] transition-colors ${
              isCompared
                ? 'border-[#1F2421] bg-[#1F2421] text-white'
                : 'border-[#7D796E] bg-white'
            }`}
          >
            {isCompared && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
          <span className="whitespace-nowrap">비교 담기</span>
        </label>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {onStartPreparation && (
            <button
              type="button"
              onClick={() => onStartPreparation(policy.id)}
              className={`cursor-pointer whitespace-nowrap break-keep rounded-xl px-3 py-2 text-[13px] font-bold transition-colors ${
                isPrepping
                  ? 'border-[1.5px] border-[#262A27] bg-[#D8F279] text-[#1F2421] hover:bg-[#CEF058]'
                  : 'btn-secondary-outline bg-white'
              }`}
            >
              준비 이어가기
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenDetail(policy.id)}
            className="btn-primary-brand inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap break-keep rounded-xl px-3.5 py-2 text-[13px]"
          >
            <span>내 조건 확인</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};
