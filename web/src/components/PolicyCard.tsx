import React from 'react';
import { ArrowRight, Bookmark, Check, Info } from 'lucide-react';
import { PolicyItem } from '../types/policy';

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

const ACCENT_BG: Record<PolicyItem['accentTheme'], string> = {
  peach: 'bg-peach',
  lime: 'bg-accent',
  lavender: 'bg-lavender',
  sage: 'bg-sage-deep',
};

const STATUS_STYLE: Record<PolicyItem['recruitmentStatus'], string> = {
  '모집 중': 'bg-accent text-ink border-edge',
  마감: 'bg-surface-3 text-ink-2 border-line-dim',
  '공고 확인 필요': 'bg-warn-bg text-ink border-warn',
};

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
    <article className="card-tactile flex flex-col justify-between overflow-hidden rounded-3xl bg-surface break-keep transition-transform duration-150 hover:-translate-y-0.5">
      {/* Pastel Ticket Top Strip */}
      <div
        className={`flex items-center justify-between border-b border-edge px-5 py-3.5 ${ACCENT_BG[policy.accentTheme]}`}
      >
        <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
          <span>{policy.category}</span>
          <span aria-hidden="true" className="text-ink-3">
            /
          </span>
          <span className="font-mono-num text-[13px] font-bold text-ink-2">
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
              ? 'border-edge bg-ink text-white'
              : 'border-edge/30 bg-surface/80 text-ink hover:bg-surface'
          }`}
        >
          <Bookmark className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex flex-1 flex-col gap-3.5 p-5">
        <p className="text-[13px] font-semibold text-ink-3">
          {policy.agencyLabel}
        </p>

        <h3 className="text-[19px] font-extrabold leading-snug text-ink">
          <button
            type="button"
            onClick={() => onOpenDetail(policy.id)}
            className="cursor-pointer text-left hover:underline"
          >
            {policy.title}
          </button>
        </h3>

        <p className="text-[15px] leading-relaxed text-ink-2">
          {policy.shortDescription}
        </p>

        <div className="rounded-xl bg-canvas px-3.5 py-2.5 text-[14px] font-medium text-ink">
          {policy.supportSummary}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span
            className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[13px] font-bold ${STATUS_STYLE[policy.recruitmentStatus]}`}
          >
            {policy.recruitmentStatus}
          </span>
          <span className="text-[13px] font-semibold text-ink-2">
            {policy.deadlineLabel}
          </span>
        </div>

        <div className="flex items-start gap-2 border-t border-line-soft pt-3 text-[13px] font-medium text-ink-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
          <span>{policy.keyCheckHint}</span>
        </div>
      </div>

      {/* Bottom Action Footer with Ticket Notch Divider */}
      <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line-mid bg-surface-2 px-5 py-3.5">
        <label className="flex cursor-pointer items-center gap-2 text-[14px] font-semibold text-ink-2">
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
                ? 'border-ink bg-ink text-white'
                : 'border-ink-4 bg-surface'
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
                  ? 'border-[1.5px] border-edge bg-accent text-ink hover:bg-accent-hover'
                  : 'btn-secondary-outline bg-surface'
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
