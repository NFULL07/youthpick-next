export type PolicyCategory =
  | '일자리'
  | '주거'
  | '교육·직업훈련'
  | '금융·복지·문화'
  | '참여·기반';

export const POLICY_CATEGORIES: readonly PolicyCategory[] = [
  '일자리',
  '주거',
  '교육·직업훈련',
  '금융·복지·문화',
  '참여·기반',
] as const;

export type RecruitmentStatus = '모집 중' | '마감' | '공고 확인 필요';

export type AcademicWorkStatus =
  | '대학 재학'
  | '휴학'
  | '졸업'
  | '구직 중'
  | '재직 중'
  | '창업';

export type RouteId =
  | 'home'
  | 'policies'
  | 'switch'
  | 'apply'
  | 'profile'
  | 'wallet'
  | 'detail';

export interface UserProfile {
  age: number;
  status: AcademicWorkStatus;
  residence: string;
  schoolRegion: string;
  workRegion: string;
  interests: PolicyCategory[];
}

export interface PolicyCriteriaRow {
  item: string;
  officialRule: string;
  userMatchNote: string;
  status: '충족 가능' | '추가 확인' | '조건 불일치';
  basis: string;
}

export interface PolicyItem {
  id: string;
  pickNumber: string;
  title: string;
  agencyLabel: string;
  category: PolicyCategory;
  accentTheme: 'peach' | 'lime' | 'lavender' | 'sage';
  recruitmentStatus: RecruitmentStatus;
  deadlineLabel: string;
  shortDescription: string;
  supportSummary: string;
  keyCheckHint: string;
  badgeText: string;
  targetRegions: string[];
  targetStatuses: AcademicWorkStatus[];
  minAge: number;
  maxAge: number;
  requiredDocs: string[];
  checklist: {
    id: string;
    title: string;
    detail: string;
    tag: string;
  }[];
}

export interface WalletDocument {
  id: string;
  name: string;
  category: '학적' | '거주' | '소득' | '기타';
  issuer: string;
  linkedPolicyId: string;
  linkedPolicyTitle: string;
  status: '확인 필요' | '보관 완료';
  previewNote: string;
  uploadedFileName?: string;
  uploadedAt?: string;
}

export interface LifeChangeScenario {
  residence: string;
  schoolRegion: string;
  academicStatus: AcademicWorkStatus;
  employmentStatus: '확인 전' | '구직 중' | '재직 중' | '프리랜서·창업';
}

export interface PolicyChangeImpact {
  policy: PolicyItem;
  changedTags: string[];
  impactSummary: string;
  impactTone: 'positive' | 'caution' | 'neutral';
}
