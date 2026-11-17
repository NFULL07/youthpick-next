import type { PolicyItem, RecruitmentStatus, UserProfile } from '../types/policy';
import { evaluatePolicyCriteria } from './policyEngine';

/**
 * 정책 카드의 모집 상태 상자 (주완 결정, 2026-11-17)
 * - 모집 중: 초록(라임) 상자
 * - 모집 중인데 내 조건에 X가 있음: 빨간 상자 + 이유
 * - 마감: 검정 상자
 * - 공고 확인 필요: 노란 상자 (기존 그대로)
 *
 * 빨강은 판정 결과가 X일 때만 쓴다. 미입력·모름(?)은 빨강으로 바꾸지 않는다(CLAUDE.md 4장).
 * X는 '입력한 값이 조건에 맞지 않음'이지 선정·신청 불가 확정이 아니므로 문구는 '조건 미충족'으로 둔다.
 */
export type RecruitmentTone = 'open' | 'open-unmet' | 'closed' | 'check';

export interface RecruitmentBadge {
  tone: RecruitmentTone;
  label: string;
  /** 상자 색(테두리·배경·글자). 모양(rounded-lg, border, 글자 크기)은 화면 쪽에서 붙인다 */
  colorClass: string;
}

const COLOR: Record<RecruitmentTone, string> = {
  open: 'border-[#262A27] bg-[#D8F279] text-[#1F2421]',
  'open-unmet': 'border-[#262A27] bg-alert text-white',
  closed: 'border-[#1F2421] bg-[#1F2421] text-white',
  check: 'border-[#B8860B] bg-[#FFF0CC] text-[#1F2421]',
};

export function recruitmentTone(status: RecruitmentStatus, hasUnmet = false): RecruitmentTone {
  if (status === '마감') return 'closed';
  if (status === '모집 중') return hasUnmet ? 'open-unmet' : 'open';
  return 'check';
}

export function recruitmentBadge(status: RecruitmentStatus, hasUnmet = false): RecruitmentBadge {
  const tone = recruitmentTone(status, hasUnmet);
  return {
    tone,
    label: tone === 'open-unmet' ? '모집 중 · 조건 미충족' : status,
    colorClass: COLOR[tone],
  };
}

/** 내 정보로 판정했을 때 X인 조건의 이유. X가 없으면 빈 배열(?는 넣지 않는다) */
export function unmetCriteriaReasons(policy: PolicyItem, profile: UserProfile): string[] {
  return evaluatePolicyCriteria(policy, profile)
    .filter((row) => row.result === 'X')
    .map((row) => row.reason ?? `${row.item} 조건을 충족하지 않아요.`);
}
