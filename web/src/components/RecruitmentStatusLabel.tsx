import React from 'react';
import { RecruitmentStatus } from '../types/policy';

const STATUS_CLASS: Record<RecruitmentStatus, string> = {
  '모집 중': 'status status-ok',
  '공고 확인 필요': 'status status-warn',
  마감: 'status status-idle',
};

/** 모집 상태를 색 점과 글자로 표시한다. 색만으로 구분하지 않도록 글자를 항상 함께 쓴다. */
export const RecruitmentStatusLabel: React.FC<{ status: RecruitmentStatus }> = ({
  status,
}) => <span className={STATUS_CLASS[status]}>{status}</span>;
