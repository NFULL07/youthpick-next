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

/** 조건별 판정: O 충족 / X 불일치 / ? 확인 필요(미입력·모름·근거 부족) */
export type CriteriaResult = 'O' | 'X' | '?';

export type CriteriaStatusLabel = '충족 가능' | '추가 확인' | '조건 불일치';

export const CRITERIA_STATUS_LABEL: Record<CriteriaResult, CriteriaStatusLabel> = {
  O: '충족 가능',
  X: '조건 불일치',
  '?': '추가 확인',
};

export interface PolicyCriteriaRow {
  item: string;
  officialRule: string;
  userMatchNote: string;
  result: CriteriaResult;
  status: CriteriaStatusLabel;
  /** X일 때 불일치 이유 */
  reason?: string;
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
  /** '파일명 기록': 선택한 파일의 이름만 브라우저에 기록한 상태. 파일 내용은 저장하지 않는다 */
  status: '확인 필요' | '파일명 기록';
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
