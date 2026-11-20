import type { WalletFacts } from '../data/virtualWallet';
import { parseRawInput, PROFILE_SUPPLIED_FIELDS } from './ruleEngine';
import type { EligibilityRule, RuleInputItem, RuleInputs } from './ruleTypes';

/**
 * 가상 지갑의 '사실'을 규칙 질문의 '답'으로 바꾼다.
 * - 같은 항목이라도 질문 문구(지역, 기준 %, 금액)에 따라 답이 다르다.
 * - 사실이 없거나 질문을 해석하지 못하면 undefined를 돌려준다(= 미입력, 판정은 ?).
 * - 값은 메모리에서만 쓴다. 저장·전송·기록하지 않는다.
 */

const YES = '예';
const NO = '아니오';
const yesNo = (v: boolean | undefined) => (v === undefined ? undefined : v ? YES : NO);
const squash = (s: string) => s.replace(/\s+/g, '');

function durationChoice(years: number | undefined, place: string): string {
  if (years === undefined || years <= 0) return `${place}에 주민등록 없음`;
  if (years < 1) return '1년 미만';
  if (years < 2) return '1~2년';
  if (years < 3) return '2~3년';
  return '3년 이상';
}

/** 질문에서 "○○시에 계속" / "○○도에 계속" 지역 이름을 찾는다 */
function placeInQuestion(question: string): string | null {
  return question.match(/([가-힣]+(?:시|도|군))에 계속/)?.[1] ?? null;
}

function percentsIn(question: string): number[] {
  return Array.from(question.matchAll(/(\d+)\s*%/g), (m) => Number(m[1]));
}

/** "1억 2,200만원", "4억 7,000만원", "3억 4,500만원" -> 만원 단위 */
function amountsInManwon(question: string): number[] {
  return Array.from(question.matchAll(/(\d+)억(?:\s*([\d,]+)만)?/g), (m) => {
    const eok = Number(m[1]);
    const man = m[2] ? Number(m[2].replace(/,/g, '')) : 0;
    return eok * 10000 + man;
  });
}

function supportStatus(f: WalletFacts, question: string): string {
  const q = squash(question);
  const hit = (list?: string[]) => (list ?? []).some((k) => q.includes(squash(k)));
  if (hit(f.currentSupports)) return '참여·수급 중';
  if (hit(f.pastSupports)) return '참여·수급 종료';
  return '해당 없음';
}

function enrolledNow(f: WalletFacts): boolean {
  return f.enrollment === '재학' || f.enrollment === '졸업예정' || f.enrollment === '휴학' || f.enrollment === '대학원';
}

/** special_target_status: 정책마다 질문이 다르다. 아는 질문만 답한다 */
function specialTarget(f: WalletFacts, q: string): boolean | undefined {
  if (q.includes('공무원')) return f.publicServant;
  if (q.includes('중소·중견')) return f.employerSize === undefined ? undefined : ['중소', '중견', '사회적기업 등'].includes(f.employerSize);
  if (q.includes('졸업예정자(4학년 2학기')) {
    const city = q.match(/([가-힣]+시) 관내 대학/)?.[1];
    return f.enrollment === undefined ? undefined : f.enrollment === '졸업예정' && f.campusCity === city;
  }
  if (q.includes('대학이나 고등학교에 다니고')) {
    const city = q.match(/([가-힣]+시)에 있는/)?.[1];
    return (enrolledNow(f) && f.campusCity === city) || (f.highSchoolEnrolled === true && f.highSchoolCity === city);
  }
  if (q.includes('캠퍼스의 대학 재학·졸업생')) {
    const city = q.match(/([가-힣]+시)에 있는 캠퍼스/)?.[1];
    return f.campusCity === city || f.highSchoolCity === city;
  }
  if (q.includes('봉사·다자녀·다문화·새터민')) return f.specialGroups === undefined ? undefined : f.specialGroups.length > 0;
  if (q.includes('전입할 수 있나요')) {
    const city = q.match(/([가-힣]+시)로 전입/)?.[1];
    return f.canMoveTo === undefined ? false : f.canMoveTo.includes(city ?? '');
  }
  return undefined;
}

function graduationChoice(f: WalletFacts, choices: string[]): string | undefined {
  if (choices.includes('졸업 후 2년 이내 · 미취업')) {
    if (f.enrollment === undefined) return undefined;
    if (f.enrollment !== '졸업') return '졸업 전(재학·휴학)';
    if (f.graduatedYearsAgo === undefined) return undefined;
    if (f.graduatedYearsAgo > 2) return '졸업 후 2년 초과';
    return f.employment === '미취업' ? '졸업 후 2년 이내 · 미취업' : '졸업 후 2년 이내 · 취업';
  }
  if (choices.includes('졸업까지 2년 미만 남음')) {
    if (f.enrollment === undefined) return undefined;
    if (!enrolledNow(f) || f.enrollment === '휴학') {
      if (f.enrollment === '휴학') return f.yearsToGraduation === undefined ? undefined : f.yearsToGraduation < 2 ? '졸업까지 2년 미만 남음' : '졸업까지 2년 이상 남음';
      return '재학생 아님(졸업·수료·미진학 등)';
    }
    if (f.yearsToGraduation === undefined) return undefined;
    return f.yearsToGraduation < 2 ? '졸업까지 2년 미만 남음' : '졸업까지 2년 이상 남음';
  }
  return undefined;
}

function militaryAnswer(f: WalletFacts, rule: EligibilityRule, rules: EligibilityRule[]): string | undefined {
  if (f.militaryMonths === undefined) return undefined;
  if (f.militaryMonths <= 0) return NO;
  const ageRule = rules.find((r) => r.operator === 'age_between' && r.anyOfGroup === rule.anyOfGroup);
  const max = (ageRule?.value as { max?: number } | null)?.max;
  if (max === undefined) return undefined;
  return f.profile.age - Math.floor(f.militaryMonths / 12) <= max ? YES : NO;
}

/** 규칙 하나에 대한 가상 지갑의 답(직접 입력 칸에 넣는 글자와 같은 모양) */
export function walletAnswer(
  f: WalletFacts,
  rule: EligibilityRule,
  rules: EligibilityRule[] = [rule]
): string | undefined {
  const q = rule.question ?? '';
  const choices = rule.choices ?? [];
  switch (rule.fieldId) {
    case 'registered_move_in_date':
    case 'parent_registered_duration': {
      const place = placeInQuestion(q);
      if (!place) return undefined;
      const table = rule.fieldId === 'registered_move_in_date' ? f.selfYears : f.parentYears;
      return durationChoice(table[place], place);
    }
    case 'enrollment_status':
      return f.enrollment;
    case 'employment_status':
      return f.employment;
    case 'credits_earned':
      return f.creditsLastTerm?.toString();
    case 'gpa_value': {
      const value = q.includes('4.5') ? f.gpaLastTerm45 : q.includes('전 학년') ? f.gpaTotal100 : f.gpaLastTerm100;
      return value?.toString();
    }
    case 'score_period': {
      const threshold = Number(q.match(/(\d\.\d)\s*이상/)?.[1]);
      if (!Number.isFinite(threshold) || f.gpaLastTerm45 === undefined) return undefined;
      return yesNo(f.gpaLastTerm45 >= threshold);
    }
    case 'aid_band_value':
      return f.aidBand === undefined ? undefined : `${f.aidBand}구간`;
    case 'student_loan_status':
      return f.studentLoan;
    case 'health_insurance_type':
      return q.includes('당시') ? f.healthInsuranceAtExam : f.healthInsurance;
    case 'welfare_status':
      return f.welfare;
    case 'household_income_amount': {
      const pcts = percentsIn(q);
      if (pcts.length === 0 || f.householdMedianPct === undefined) return undefined;
      if (q.includes('원가구') && pcts.length >= 2) {
        if (f.familyMedianPct === undefined) return undefined;
        return yesNo(f.householdMedianPct <= pcts[0] && f.familyMedianPct <= pcts[1]);
      }
      return yesNo(f.householdMedianPct <= pcts[0]);
    }
    case 'asset_criteria_check': {
      const limits = amountsInManwon(q);
      if (limits.length === 0 || f.netAssetManwon === undefined) return undefined;
      if (limits.length >= 2) {
        if (f.familyAssetManwon === undefined) return undefined;
        return yesNo(f.netAssetManwon <= limits[0] && f.familyAssetManwon <= limits[1]);
      }
      return yesNo(f.netAssetManwon <= limits[0]);
    }
    case 'independent_residence':
      return yesNo(f.independent);
    case 'homeownership_status':
      return f.homeOwner === undefined ? undefined : f.homeOwner ? '주택 소유(분양권·입주권 포함)' : '무주택';
    case 'household_head_status':
      return f.householdHead;
    case 'rental_situation':
      if (!f.rental) return undefined;
      return choices.includes(f.rental) ? f.rental : choices.includes('해당 없음') ? '해당 없음' : undefined;
    case 'rental_deposit_amount':
      return f.depositWon?.toString();
    case 'housing_area':
      return f.areaM2?.toString();
    case 'housing_loan_product':
      return f.housingLoan;
    case 'dormitory_type':
      return f.dormitory;
    case 'existing_support':
      return supportStatus(f, q);
    case 'same_household_applicant':
      return yesNo(f.sameHouseholdApplicant);
    case 'graduation_date':
      return graduationChoice(f, choices);
    case 'military_service_months':
      return militaryAnswer(f, rule, rules);
    case 'business_registration_status': {
      if (f.businessRevenueWon === undefined) return undefined;
      if (f.businessRevenueWon === null) return '없음';
      if (choices.includes('있음(연매출 3억원 이하)')) {
        return f.businessRevenueWon <= 300000000 ? '있음(연매출 3억원 이하)' : '있음(연매출 3억원 초과)';
      }
      return '있음';
    }
    case 'weekly_work_hours':
      return f.weeklyHours?.toString();
    case 'personal_income_amount': {
      const monthly = q.includes('한 달') || q.includes('월평균');
      return (monthly ? f.monthlyIncomeWon : f.annualIncomeWon)?.toString();
    }
    case 'hire_date':
      if (f.monthsSinceHire === undefined) {
        return f.employment === undefined || f.employment === '재직' ? undefined : '입사 전';
      }
      return f.monthsSinceHire <= 5 ? '입사 5개월 이내' : '입사 5개월 초과';
    case 'interview_schedule':
      return f.interview;
    case 'exam_info':
      if (choices.includes('2026.1.1 이후 응시')) {
        if (!f.examDate) return undefined;
        return f.examDate >= '2026-01-01' ? '2026.1.1 이후 응시' : '2025년 이전 응시';
      }
      if (q.includes('전입한 뒤')) return f.examDate ? yesNo(f.examAfterMoveIn) : undefined;
      return undefined;
    case 'capital_area_commute':
      if (!f.capitalCommute) return undefined;
      if (f.capitalCommute === '통학') return '예(통학, 철도 정기승차권 이용)';
      if (f.capitalCommute === '통근') return '예(통근 등, 철도 정기승차권 이용)';
      return '아니오';
    case 'special_target_status':
      return yesNo(specialTarget(f, q));
    default:
      return undefined;
  }
}

/**
 * 규칙 목록에 대한 가상 지갑 입력값. '내 정보'에서 오는 지역 항목은 넣지 않는다
 * (지역은 지갑 인물의 '내 정보'로 판정한다). 학적·취업은 지갑 값이 더 자세해서 덮어쓴다.
 */
export function walletInputs(f: WalletFacts, rules: EligibilityRule[]): RuleInputs {
  const inputs: RuleInputs = {};
  for (const rule of rules) {
    if (inputs[rule.fieldId]) continue;
    const regionField = PROFILE_SUPPLIED_FIELDS.includes(rule.fieldId) && rule.fieldId !== 'enrollment_status';
    if (regionField || rule.fieldId === 'employer_info') continue;
    const raw = walletAnswer(f, rule, rules);
    if (raw === undefined) continue;
    const parsed = parseRawInput(rule, raw);
    if (parsed) inputs[rule.fieldId] = parsed;
  }
  return inputs;
}

/** 직접 입력 칸에 미리 넣을 값 (가상 지갑을 켰을 때만) */
export function walletPresetValues(
  f: WalletFacts,
  items: RuleInputItem[],
  allRules: EligibilityRule[]
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const item of items) {
    const sorted = [...item.rules].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const raw = sorted.length > 0 ? walletAnswer(f, sorted[0], allRules) : undefined;
    if (raw !== undefined) values[item.fieldId] = raw;
  }
  return values;
}
