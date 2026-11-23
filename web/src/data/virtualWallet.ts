import type { UserProfile } from '../types/policy';

/**
 * 가상 지갑 (시연용).
 *
 * 지갑에는 '질문의 답'이 아니라 서류에서 읽었다고 가정한 '사실'을 둔다.
 * 같은 항목이라도 공고마다 질문이 달라서(예: "천안시에 계속 주민등록한 기간" / "충청남도에 ...")
 * 답은 utils/walletAnswers.ts가 규칙 질문마다 계산한다.
 *
 * 개인정보 규칙: 실제 사람이 아닌 가상 인물이다. 화면 메모리에서만 쓰고 저장·전송하지 않는다.
 * 값이 없는 사실(undefined)은 '모름'과 같다. 판정은 ?로 남는다.
 */
export interface WalletFacts {
  id: string;
  /** 화면 표시 이름 (가상 인물이라는 것이 드러나게) */
  name: string;
  summary: string;
  /** 판정에 쓰는 '내 정보' (지갑을 켠 동안 실제 내 정보 대신 쓴다. 저장하지 않음) */
  profile: UserProfile;

  /** 지역 이름(시·군 또는 시·도) -> 계속 주민등록 연수 (주민등록초본) */
  selfYears: Record<string, number>;
  /** 부모(직계존속) 기준 같은 값 (부모 초본·가족관계증명서) */
  parentYears: Record<string, number>;
  /** 이사 계획이 있는 지역 (선발 후 전입 조건용) */
  canMoveTo?: string[];

  // 학적 (재학·졸업 증명서, 성적증명서)
  enrollment?: '재학' | '휴학' | '졸업예정' | '졸업' | '수료·졸업유예' | '대학원';
  campusCity?: string;
  /** 다니는(또는 졸업한) 고등학교 소재 시·군 */
  highSchoolCity?: string;
  highSchoolEnrolled?: boolean;
  yearsToGraduation?: number;
  graduatedYearsAgo?: number;
  creditsLastTerm?: number;
  gpaLastTerm45?: number;
  gpaLastTerm100?: number;
  gpaTotal100?: number;
  /** 학자금 지원구간 1~10 (지원구간 통지서) */
  aidBand?: number;
  studentLoan?: '없음' | '취업후상환' | '취업후상환(생활비 대출 포함)' | '일반상환' | '일반상환(생활비 대출 포함)';

  // 취업·소득 (건강보험 자격득실, 원천징수영수증, 재직증명서)
  employment?: string;
  healthInsurance?: '직장가입자' | '지역가입자' | '피부양자';
  healthInsuranceAtExam?: '직장가입자' | '지역가입자' | '피부양자';
  weeklyHours?: number;
  monthlyIncomeWon?: number;
  /** 직전 연도 총소득(총급여) */
  annualIncomeWon?: number;
  /** 사업자 연매출. 사업자가 없으면 undefined가 아니라 null */
  businessRevenueWon?: number | null;
  employerCity?: string;
  employerSize?: '중소' | '중견' | '대기업' | '공공' | '사회적기업 등';
  /** 다니는 곳이 소비향락업·공공기관·공기업·초중고·대학교·출자·출연기관인가 (재직증명서·사업자등록증) */
  excludedWorkplace?: boolean;
  /** 국민내일배움카드의 그 밖의 발급 제외 대상(특고·법인대표·자영업·비영리 대표·생계급여·부정수급 등)에 해당하는가 */
  trainingCardExcluded?: boolean;
  /** 직장의 상시근로자 수 */
  employerHeadcount?: number;
  monthsSinceHire?: number;
  publicServant?: boolean;
  interview?: '면접 예정' | '면접 합격(1개월 이내)' | '해당 없음';
  /** 자격증 응시일 YYYY-MM-DD */
  examDate?: string;
  examAfterMoveIn?: boolean;
  militaryMonths?: number;
  /** 출생연도 (주민등록초본). 출생일 기준 공고의 경계 판정에만 쓴다 */
  birthYear?: number;

  // 가구·복지 (가족관계증명서, 건강보험료 납부확인서, 수급자 증명)
  welfare?: string;
  /** 내가 속한 가구의 기준 중위소득 대비 % */
  householdMedianPct?: number;
  /** 원가구(부모 포함)의 기준 중위소득 대비 % */
  familyMedianPct?: number;
  netAssetManwon?: number;
  familyAssetManwon?: number;
  /** 직전 3개년도 중 금융소득 종합과세 대상자였던 적이 있는가 */
  financialIncomeTaxed?: boolean;
  /** 해당하는 특화 대상. 예: '다자녀', '2자녀', '신혼', '장애', '자립준비청년', '선취업 후진학자', '비과세 육아휴직급여', '병 급여' */
  specialGroups?: string[];
  sameHouseholdApplicant?: boolean;

  // 주거 (임대차계약서, 등기부, 대출 약정서)
  independent?: boolean;
  homeOwner?: boolean;
  householdHead?: '세대주' | '예비 세대주' | '세대원';
  rental?: string;
  depositWon?: number;
  areaM2?: number;
  housingLoan?: '버팀목(일반)' | '버팀목(청년전용)' | '버팀목(신혼부부)' | '신생아특례' | '기타 전세대출' | '없음';
  /** 성년 세대원(본인 포함) 가운데 주택도시기금 대출 이용자가 있는가 */
  householdFundLoan?: boolean;
  /** 대출받아 들어갈 집이 채권양도협약기관 소유 쉐어하우스인가 */
  shareHouse?: boolean;
  dormitory?: '천안행복기숙사' | '수도권 기숙사' | '기타 기숙사' | '해당 없음';
  capitalCommute?: '통학' | '통근' | '없음';

  /** 지금 받고 있는 지원 (질문 문구에 이 낱말이 있으면 '참여·수급 중') */
  currentSupports?: string[];
  /** 받았다가 끝난 지원 */
  pastSupports?: string[];
}

const INTERESTS: UserProfile['interests'] = ['일자리', '주거', '교육·직업훈련', '금융·복지·문화'];

export const VIRTUAL_PERSONAS: readonly WalletFacts[] = [
  {
    id: 'persona-a',
    name: '가상 인물 A',
    summary: '천안 거주 4학년 대학생, 만 24세, 부모님과 함께 삶, 졸업예정',
    profile: {
      age: 24,
      status: '대학 재학',
      residence: '충청남도 천안시',
      schoolRegion: '충청남도 천안시',
      workRegion: '',
      interests: INTERESTS,
    },
    selfYears: { 천안시: 4, 충청남도: 4 },
    parentYears: { 천안시: 12, 충청남도: 12 },
    canMoveTo: [],
    enrollment: '졸업예정',
    campusCity: '천안시',
    highSchoolCity: '천안시',
    yearsToGraduation: 0.5,
    creditsLastTerm: 18,
    gpaLastTerm45: 3.6,
    gpaLastTerm100: 90,
    gpaTotal100: 88,
    aidBand: 5,
    studentLoan: '취업후상환',
    employment: '미취업',
    healthInsurance: '피부양자',
    healthInsuranceAtExam: '피부양자',
    weeklyHours: 0,
    monthlyIncomeWon: 0,
    annualIncomeWon: 0,
    businessRevenueWon: null,
    publicServant: false,
    trainingCardExcluded: false,
    interview: '면접 예정',
    examDate: '2026-03-14',
    examAfterMoveIn: true,
    militaryMonths: 0,
    birthYear: 2002,
    welfare: '해당 없음',
    householdMedianPct: 110,
    familyMedianPct: 110,
    netAssetManwon: 500,
    familyAssetManwon: 35000,
    financialIncomeTaxed: false,
    specialGroups: [],
    sameHouseholdApplicant: false,
    independent: false,
    homeOwner: false,
    householdHead: '세대원',
    rental: '해당 없음',
    housingLoan: '없음',
    householdFundLoan: false,
    shareHouse: false,
    dormitory: '해당 없음',
    capitalCommute: '없음',
    currentSupports: [],
    pastSupports: ['국가장학금'],
  },
  {
    id: 'persona-b',
    name: '가상 인물 B',
    summary: '아산 거주 신입 직장인, 만 27세, 아산 중소기업 입사 3개월, 버팀목 전세 이용',
    profile: {
      age: 27,
      status: '재직 중',
      residence: '충청남도 아산시',
      schoolRegion: '',
      workRegion: '충청남도 아산시',
      interests: INTERESTS,
    },
    selfYears: { 아산시: 2, 충청남도: 2 },
    parentYears: {},
    canMoveTo: [],
    enrollment: '졸업',
    graduatedYearsAgo: 1,
    studentLoan: '없음',
    employment: '재직',
    healthInsurance: '직장가입자',
    healthInsuranceAtExam: '직장가입자',
    weeklyHours: 40,
    monthlyIncomeWon: 2800000,
    annualIncomeWon: 9000000,
    businessRevenueWon: null,
    employerCity: '아산시',
    employerSize: '중소',
    employerHeadcount: 30,
    excludedWorkplace: false,
    monthsSinceHire: 3,
    publicServant: false,
    trainingCardExcluded: false,
    interview: '해당 없음',
    militaryMonths: 18,
    birthYear: 1999,
    welfare: '해당 없음',
    householdMedianPct: 105,
    familyMedianPct: 140,
    netAssetManwon: 6000,
    familyAssetManwon: 50000,
    financialIncomeTaxed: false,
    specialGroups: [],
    sameHouseholdApplicant: false,
    independent: true,
    homeOwner: false,
    householdHead: '세대주',
    rental: '일반 임대차',
    depositWon: 100000000,
    areaM2: 33,
    housingLoan: '버팀목(청년전용)',
    householdFundLoan: true,
    shareHouse: false,
    dormitory: '해당 없음',
    capitalCommute: '없음',
    currentSupports: ['전세자금대출'],
    pastSupports: [],
  },
  {
    id: 'persona-c',
    name: '가상 인물 C',
    summary: '천안 거주 졸업 1년 차 구직자, 만 29세, 혼자 월세 거주, 취업 면접 예정',
    profile: {
      age: 29,
      status: '구직 중',
      residence: '충청남도 천안시',
      schoolRegion: '',
      workRegion: '',
      interests: INTERESTS,
    },
    selfYears: { 천안시: 6, 충청남도: 6 },
    parentYears: { 천안시: 6, 충청남도: 6 },
    canMoveTo: [],
    enrollment: '졸업',
    graduatedYearsAgo: 1,
    campusCity: '천안시',
    highSchoolCity: '천안시',
    aidBand: 6,
    studentLoan: '일반상환',
    employment: '미취업',
    healthInsurance: '지역가입자',
    healthInsuranceAtExam: '지역가입자',
    weeklyHours: 0,
    monthlyIncomeWon: 0,
    annualIncomeWon: 4000000,
    businessRevenueWon: null,
    publicServant: false,
    trainingCardExcluded: false,
    interview: '면접 예정',
    examDate: '2026-05-23',
    examAfterMoveIn: true,
    militaryMonths: 21,
    birthYear: 1997,
    welfare: '해당 없음',
    householdMedianPct: 45,
    familyMedianPct: 95,
    netAssetManwon: 1500,
    familyAssetManwon: 30000,
    financialIncomeTaxed: false,
    specialGroups: [],
    sameHouseholdApplicant: false,
    independent: true,
    homeOwner: false,
    householdHead: '세대주',
    rental: '일반 임대차',
    depositWon: 5000000,
    areaM2: 26,
    housingLoan: '없음',
    householdFundLoan: false,
    shareHouse: false,
    dormitory: '해당 없음',
    capitalCommute: '없음',
    currentSupports: [],
    pastSupports: [],
  },
];

export function findPersona(id: string | null): WalletFacts | null {
  return VIRTUAL_PERSONAS.find((p) => p.id === id) ?? null;
}
