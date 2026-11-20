import type { PolicyRuleSet } from '../utils/ruleTypes';

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

/** O/X/? 표시 색 (조건표·직접 입력 결과에 같이 쓴다) */
export const CRITERIA_RESULT_STYLE: Record<CriteriaResult, string> = {
  O: 'border-[#262A27] bg-[#D8F279] text-[#1F2421]',
  X: 'border-[#A33A1E] bg-[#FBE1D6] text-[#1F2421]',
  '?': 'border-[#B8860B] bg-[#FFF0CC] text-[#1F2421]',
};

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
  /** 지갑 밖 서류로 직접 입력해야 하는 항목의 영문 ID (docs/data/doc_requirements_items_v1.csv) */
  directInputFieldIds?: string[];
  /** 'supabase'면 Supabase에서 받은 정책. 없으면 시연용 예시 */
  dataSource?: 'demo' | 'supabase';
  /** Supabase 정책의 검수 완료 규칙·관계. 있으면 판정은 utils/ruleEngine.ts가 한다 */
  ruleSet?: PolicyRuleSet;
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
