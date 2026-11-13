import { KOREA_REGIONS } from '../data/regions';
import {
  CriteriaResult,
  CRITERIA_STATUS_LABEL,
  LifeChangeScenario,
  PolicyCategory,
  PolicyChangeImpact,
  PolicyCriteriaRow,
  PolicyItem,
  RecruitmentStatus,
  UserProfile,
} from '../types/policy';

export interface PolicyFilterParams {
  category: '전체' | PolicyCategory;
  recruitmentStatus: '전체' | RecruitmentStatus;
  searchQuery: string;
  sortBy: 'default' | 'name' | 'openFirst';
  savedOnly?: boolean;
  savedIds?: string[];
}

export function filterAndSortPolicies(
  policies: PolicyItem[],
  params: PolicyFilterParams
): PolicyItem[] {
  const query = params.searchQuery.trim().toLowerCase();

  const filtered = policies.filter((policy) => {
    if (params.category !== '전체' && policy.category !== params.category) {
      return false;
    }
    if (
      params.recruitmentStatus !== '전체' &&
      policy.recruitmentStatus !== params.recruitmentStatus
    ) {
      return false;
    }
    if (params.savedOnly && params.savedIds && !params.savedIds.includes(policy.id)) {
      return false;
    }
    if (query) {
      const haystack = [
        policy.title,
        policy.agencyLabel,
        policy.category,
        policy.shortDescription,
        policy.supportSummary,
        policy.keyCheckHint,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });

  if (params.sortBy === 'name') {
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  }

  if (params.sortBy === 'openFirst') {
    const rank: Record<RecruitmentStatus, number> = {
      '모집 중': 0,
      '공고 확인 필요': 1,
      마감: 2,
    };
    return [...filtered].sort(
      (a, b) => rank[a.recruitmentStatus] - rank[b.recruitmentStatus]
    );
  }

  return filtered;
}

/** 지역 비교 결과. unknown은 미입력·시군 미선택·해석할 수 없는 값이라 판단하지 않은 경우 */
export type RegionMatch = 'match' | 'mismatch' | 'unknown';

export interface ParsedRegion {
  sido: string;
  /** null이면 시·도 단위 (시·군·구 미선택) */
  sigungu: string | null;
}

/**
 * '충청남도' 또는 '충청남도 천안시' 형식만 해석한다. 지역 목록(KOREA_REGIONS)과
 * 정확히 같은 이름일 때만 인정하고, 부분 문자열이나 시·군·구 이름만으로는 추측하지 않는다.
 */
export function parseRegion(value: string): ParsedRegion | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  for (const group of KOREA_REGIONS) {
    if (trimmed === group.sido) {
      return { sido: group.sido, sigungu: null };
    }
    if (trimmed.startsWith(`${group.sido} `)) {
      const rest = trimmed.slice(group.sido.length + 1).trim();
      if (!rest.endsWith('전체') && group.sigunguList.includes(rest)) {
        return { sido: group.sido, sigungu: rest };
      }
      return null;
    }
  }
  return null;
}

export function compareRegion(targetRegions: string[], userRegion: string): RegionMatch {
  const user = parseRegion(userRegion);
  if (!user) return 'unknown';

  let result: RegionMatch = 'mismatch';
  for (const raw of targetRegions) {
    if (raw.trim() === '전국') return 'match';
    const target = parseRegion(raw);
    if (!target) {
      result = 'unknown';
      continue;
    }
    if (target.sido !== user.sido) continue;
    if (target.sigungu === null) return 'match';
    if (user.sigungu === null) {
      result = 'unknown';
      continue;
    }
    if (target.sigungu === user.sigungu) return 'match';
  }
  return result;
}

export function matchesRegion(targetRegions: string[], userRegion: string): boolean {
  return compareRegion(targetRegions, userRegion) === 'match';
}

function criteriaRow(
  row: Omit<PolicyCriteriaRow, 'status'> & { result: CriteriaResult }
): PolicyCriteriaRow {
  return { ...row, status: CRITERIA_STATUS_LABEL[row.result] };
}

const REGION_NOTE: Record<RegionMatch, string> = {
  match: '일치',
  mismatch: '불일치',
  unknown: '확인 필요',
};

export function evaluatePolicyCriteria(
  policy: PolicyItem,
  profile: UserProfile
): PolicyCriteriaRow[] {
  // 연령: 값이 없으면 ?, 범위 안이면 O, 범위 밖이면 X
  const ageKnown = Number.isFinite(profile.age) && profile.age > 0;
  const ageResult: CriteriaResult = !ageKnown
    ? '?'
    : profile.age >= policy.minAge && profile.age <= policy.maxAge
      ? 'O'
      : 'X';

  // 생활권: 하나라도 일치하면 O. 세 기준을 모두 대조했고 모두 불일치일 때만 X.
  // 미입력·시군 미선택이 하나라도 남아 있으면 X로 단정하지 않고 ?로 둔다.
  const regionChecks = [
    { label: '거주', value: profile.residence },
    { label: '학교', value: profile.schoolRegion },
    { label: '근무', value: profile.workRegion },
  ].map((c) => ({ ...c, match: compareRegion(policy.targetRegions, c.value) }));
  const regionResult: CriteriaResult = regionChecks.some((c) => c.match === 'match')
    ? 'O'
    : regionChecks.every((c) => c.match === 'mismatch')
      ? 'X'
      : '?';
  const regionNote = regionChecks
    .map((c) =>
      c.value.trim()
        ? `${c.label} ${c.value.trim()} (${REGION_NOTE[c.match]})`
        : `${c.label} 미입력`
    )
    .join(' / ');

  const statusResult: CriteriaResult = !profile.status
    ? '?'
    : policy.targetStatuses.includes(profile.status)
      ? 'O'
      : 'X';

  return [
    criteriaRow({
      item: '연령',
      officialRule: `만 ${policy.minAge}세 ~ 만 ${policy.maxAge}세 (공고 기준일 확인)`,
      userMatchNote: ageKnown ? `만 ${profile.age}세` : '연령 미입력',
      result: ageResult,
      reason:
        ageResult === 'X'
          ? `입력한 만 ${profile.age}세가 공고 연령 범위 밖이에요.`
          : undefined,
      basis: '프로필 입력 연령 기준',
    }),
    criteriaRow({
      item: '생활권 (거주·재학·근무)',
      officialRule: `인정 범위: ${policy.targetRegions.join(', ')}`,
      userMatchNote: regionNote,
      result: regionResult,
      reason:
        regionResult === 'X'
          ? '거주·학교·근무 지역이 모두 인정 범위 밖이에요.'
          : undefined,
      basis: '주민등록·재학·근무지를 지역 목록 이름으로 정확히 대조',
    }),
    criteriaRow({
      item: '학적·취업 상태',
      officialRule: `참여 대상: ${policy.targetStatuses.join(', ')}`,
      userMatchNote: profile.status || '상태 미입력',
      result: statusResult,
      reason:
        statusResult === 'X'
          ? `'${profile.status}'은(는) 참여 대상 상태에 없어요.`
          : undefined,
      basis: '현재 학적·근로 상태 기준',
    }),
    criteriaRow({
      item: '소득·제출 서류',
      officialRule: `필수 확인: ${policy.requiredDocs.join(', ')}`,
      userMatchNote: '전자지갑 연동 전 · 별도 확인',
      result: '?',
      basis: '공식 공고 및 서류 확인 필요',
    }),
  ];
}

export interface ComparisonDiffRow {
  fieldLabel: string;
  beforeValue: string;
  afterValue: string;
  changed: boolean;
}

export function buildComparisonRows(
  before: UserProfile,
  after: LifeChangeScenario
): ComparisonDiffRow[] {
  const beforeEmployment =
    before.status === '구직 중' || before.status === '재직 중'
      ? before.status
      : '확인 전';

  return [
    {
      fieldLabel: '주민등록지',
      beforeValue: before.residence || '미입력',
      afterValue: after.residence || '미입력',
      changed: (before.residence || '미입력') !== (after.residence || '미입력'),
    },
    {
      fieldLabel: '학교 소재지',
      beforeValue: before.schoolRegion || '해당 없음',
      afterValue: after.schoolRegion || '해당 없음',
      changed:
        (before.schoolRegion || '해당 없음') !== (after.schoolRegion || '해당 없음'),
    },
    {
      fieldLabel: '학적·현재 상태',
      beforeValue: before.status,
      afterValue: after.academicStatus,
      changed: before.status !== after.academicStatus,
    },
    {
      fieldLabel: '취업 상태',
      beforeValue: beforeEmployment,
      afterValue: after.employmentStatus,
      changed: beforeEmployment !== after.employmentStatus,
    },
  ];
}

export function analyzeLifeChangeImpacts(
  before: UserProfile,
  after: LifeChangeScenario,
  policies: PolicyItem[]
): PolicyChangeImpact[] {
  const residenceChanged = (before.residence || '') !== (after.residence || '');
  const schoolChanged = (before.schoolRegion || '') !== (after.schoolRegion || '');
  const academicChanged = before.status !== after.academicStatus;
  const employmentChanged = after.employmentStatus !== '확인 전';

  return policies
    .map((policy) => {
      const changedTags: string[] = [];
      let impactTone: PolicyChangeImpact['impactTone'] = 'neutral';
      const summaryParts: string[] = [];

      if (residenceChanged) {
        const beforeMatch = matchesRegion(policy.targetRegions, before.residence);
        const afterMatch = matchesRegion(policy.targetRegions, after.residence);
        changedTags.push(
          `거주지 변경: ${before.residence || '미입력'} → ${after.residence}`
        );
        if (!beforeMatch && afterMatch) {
          impactTone = 'positive';
          summaryParts.push(`${after.residence} 기준 지역 요건 충족 가능`);
        } else if (beforeMatch && !afterMatch) {
          impactTone = 'caution';
          summaryParts.push('전출 시 기존 주민등록지 요건 해제 주의');
        } else {
          summaryParts.push('전입일·거주기간 기준 재확인 필요');
        }
      }

      if (schoolChanged) {
        changedTags.push(
          `학교 소재지: ${before.schoolRegion || '없음'} → ${after.schoolRegion || '없음'}`
        );
      }

      if (academicChanged) {
        changedTags.push(`학적 변동: ${before.status} → ${after.academicStatus}`);
        const beforeStatusOk = policy.targetStatuses.includes(before.status);
        const afterStatusOk = policy.targetStatuses.includes(after.academicStatus);
        if (!beforeStatusOk && afterStatusOk) {
          impactTone = 'positive';
          summaryParts.push(`${after.academicStatus} 전환으로 지원 대상 편입`);
        } else if (beforeStatusOk && !afterStatusOk) {
          impactTone = 'caution';
          summaryParts.push(`${after.academicStatus} 시 재학생 특례 제외 여부 확인`);
        } else {
          summaryParts.push('학적 변동에 따른 증빙 서류 변경');
        }
      }

      if (employmentChanged) {
        changedTags.push(`취업 상태: ${after.employmentStatus}`);
        if (
          after.employmentStatus === '구직 중' &&
          policy.category === '일자리'
        ) {
          impactTone = 'positive';
          summaryParts.push('구직자 트랙 우선 지원 대상 확인');
        } else if (
          after.employmentStatus === '재직 중' &&
          policy.category === '금융·복지·문화'
        ) {
          impactTone = 'positive';
          summaryParts.push('근로소득 기반 자산형성 트랙 연계 가능');
        }
      }

      if (changedTags.length === 0) {
        changedTags.push('현행 조건 유지 · 공고 기준 재점검');
        summaryParts.push(policy.keyCheckHint);
      }

      return {
        policy,
        changedTags,
        impactSummary: summaryParts.join(' · ') || policy.keyCheckHint,
        impactTone,
      };
    })
    .filter((_, idx) => idx < 5);
}

export function getRecommendedPoliciesForProfile(
  policies: PolicyItem[],
  profile: UserProfile,
  limit = 3
): PolicyItem[] {
  const scored = policies.map((policy) => {
    let score = 0;
    if (profile.interests.includes(policy.category)) score += 3;
    if (policy.recruitmentStatus === '모집 중') score += 2;
    if (
      matchesRegion(policy.targetRegions, profile.residence) ||
      matchesRegion(policy.targetRegions, profile.schoolRegion) ||
      matchesRegion(policy.targetRegions, profile.workRegion)
    ) {
      score += 2;
    }
    if (policy.targetStatuses.includes(profile.status)) score += 1;
    return { policy, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.policy);
}
