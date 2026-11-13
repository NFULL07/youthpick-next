import {
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

export function matchesRegion(targetRegions: string[], userRegion: string): boolean {
  if (!userRegion.trim()) return false;
  if (targetRegions.includes('전국')) return true;
  const normalizedUser = userRegion.trim();
  return targetRegions.some(
    (target) =>
      target === normalizedUser ||
      normalizedUser.includes(target) ||
      target.includes(normalizedUser)
  );
}

export function evaluatePolicyCriteria(
  policy: PolicyItem,
  profile: UserProfile
): PolicyCriteriaRow[] {
  const ageFits = profile.age >= policy.minAge && profile.age <= policy.maxAge;
  const residenceFits = matchesRegion(policy.targetRegions, profile.residence);
  const schoolFits = matchesRegion(policy.targetRegions, profile.schoolRegion);
  const workFits = matchesRegion(policy.targetRegions, profile.workRegion);
  const statusFits = policy.targetStatuses.includes(profile.status);

  const livingPassText = [
    profile.residence ? `${profile.residence} 거주` : '거주지 미입력',
    profile.schoolRegion ? `학교 ${profile.schoolRegion}` : null,
    profile.workRegion ? `근무 ${profile.workRegion}` : null,
  ]
    .filter(Boolean)
    .join(' / ');

  return [
    {
      item: '연령',
      officialRule: `만 ${policy.minAge}세 ~ 만 ${policy.maxAge}세 (공고 기준일 확인)`,
      userMatchNote: `만 ${profile.age}세`,
      status: ageFits ? '충족 가능' : '추가 확인',
      basis: '프로필 입력 연령 기준',
    },
    {
      item: '생활권 (거주·재학·근무)',
      officialRule: `인정 범위: ${policy.targetRegions.join(', ')}`,
      userMatchNote: livingPassText,
      status: residenceFits || schoolFits || workFits ? '충족 가능' : '추가 확인',
      basis: '주민등록·재학·근무지 분리 대조',
    },
    {
      item: '학적·취업 상태',
      officialRule: `참여 대상: ${policy.targetStatuses.join(', ')}`,
      userMatchNote: profile.status,
      status: statusFits ? '충족 가능' : '추가 확인',
      basis: '현재 학적·근로 상태 기준',
    },
    {
      item: '소득·제출 서류',
      officialRule: `필수 확인: ${policy.requiredDocs.join(', ')}`,
      userMatchNote: '전자지갑 연동 전 · 별도 확인',
      status: '추가 확인',
      basis: '공식 공고 및 서류 확인 필요',
    },
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
