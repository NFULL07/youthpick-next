import React from 'react';
import { CircleAlert } from 'lucide-react';
import { RecruitmentStatus } from '../types/policy';
import { recruitmentBadge } from '../utils/recruitmentBadge';

interface RecruitmentStatusBadgeProps {
  status: RecruitmentStatus;
  /** 모집 중인데 내 조건에 X가 있으면 true -> 빨간 상자 */
  hasUnmet?: boolean;
}

/** 모집 상태 상자. 초록 모집 중 / 빨강 모집 중·조건 미충족 / 검정 마감 / 노랑 공고 확인 필요 */
export const RecruitmentStatusBadge: React.FC<RecruitmentStatusBadgeProps> = ({
  status,
  hasUnmet = false,
}) => {
  const badge = recruitmentBadge(status, hasUnmet);
  return (
    <span
      data-tone={badge.tone}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[13px] font-bold ${badge.colorClass}`}
    >
      {badge.tone === 'open-unmet' && (
        <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      {badge.label}
    </span>
  );
};
