import type { WalletFacts } from '../data/virtualWallet';
import { parseRawInput, PROFILE_SUPPLIED_FIELDS } from './ruleEngine';
import { inputKeyOf, type EligibilityRule, type RuleInputItem, type RuleInputs } from './ruleTypes';

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

function supportStatus(f: WalletFacts, question: string): string | undefined {
  // 지원 목록이 사실로 없으면 모름
  if (f.currentSupports === undefined && f.pastSupports === undefined) return undefined;
  const q = squash(question);
  const hit = (list?: string[]) => (list ?? []).some((k) => q.includes(squash(k)));
  if (hit(f.currentSupports)) return '참여·수급 중';
  if (hit(f.pastSupports)) return '참여·수급 종료';
  return '해당 없음';
}

/** 지금 받거나 받았던 지원 가운데 word가 들어간 것이 있는가. 지원 목록이 없으면 모름 */
function hadSupport(f: WalletFacts, ...words: string[]): boolean | undefined {
  if (f.currentSupports === undefined && f.pastSupports === undefined) return undefined;
  const all = [...(f.currentSupports ?? []), ...(f.pastSupports ?? [])];
  return all.some((s) => words.some((w) => s.includes(w)));
}

/**
 * 대학 캠퍼스·고등학교 소재지 가운데 city가 있는가. 둘 중 하나라도 사실이 없으면서 맞는 것도 없으면 모름.
 * (학교 사실이 비어 있는 것을 '그 시 학교 아님'으로 채우지 않는다)
 */
function schoolIn(f: WalletFacts, city: string | undefined): boolean | undefined {
  const known = [f.campusCity, f.highSchoolCity];
  if (city && known.includes(city)) return true;
  return known.every((v) => v !== undefined) ? false : undefined;
}

function enrolledNow(f: WalletFacts): boolean {
  return f.enrollment === '재학' || f.enrollment === '졸업예정' || f.enrollment === '휴학' || f.enrollment === '대학원';
}

/** 주택도시기금 소득 예외: 6천만원 대상과 7.5천만원(신혼가구) 대상 */
const INCOME_6000_GROUPS = ['혁신도시 이전 공공기관 종사자', '타 지역 이주 재개발 구역 세입자', '다자녀', '2자녀'];

/** special_target_status: 정책마다 질문이 다르다. 아는 질문만 답한다 */
function specialTarget(f: WalletFacts, q: string): boolean | undefined {
  if (q.includes('응시한 날 미취업')) {
    // 지금 미취업이면 응시한 날도 미취업으로 본다. 지금 재직 중이면 응시일과 입사일의 앞뒤를 몰라 답하지 않는다
    if (f.employment === undefined) return undefined;
    return f.employment === '미취업' ? true : undefined;
  }
  if (q.includes('한시 특별지원을 24개월')) return hadSupport(f, '한시 특별지원 24개월');
  if (q.includes('채권양도협약기관 소유 쉐어하우스')) return f.shareHouse;
  if (q.includes('임차중도금')) {
    // 주택도시기금 임차중도금 중복 허용 예외: 본인이 전세대출을 쓰지 않으면 예외에 해당할 일이 없다(아니오).
    // 쓰고 있으면 HF 보증 여부·다른 물건지 임차중도금 여부를 지갑이 몰라 답하지 않는다
    if (f.housingLoan === undefined) return undefined;
    return f.housingLoan === '없음' ? false : undefined;
  }
  if (q.includes('재능키움')) return hadSupport(f, '재능키움', '충남평생교육진흥원');
  if (q.includes('종합소득이 6,300만원')) {
    // 총급여·연매출 경로가 안 될 때의 길. 비과세 육아휴직급여·병 급여가 있으면 예, 소득이 아예 없으면 아니오
    if (f.specialGroups?.some((g) => g === '비과세 육아휴직급여' || g === '병 급여')) return true;
    if (f.annualIncomeWon === 0 && f.businessRevenueWon === null) return false;
    return undefined;
  }
  if (q.includes('선취업 후진학자')) {
    // 질문: 만 36~45세이면서 선취업 후진학자 등인가
    return f.specialGroups === undefined ? undefined : f.specialGroups.includes('선취업 후진학자') && f.profile.age <= 45;
  }
  if (q.includes('혁신도시')) {
    if (f.specialGroups === undefined || f.annualIncomeWon === undefined) return undefined;
    const upTo6000 = f.specialGroups.some((g) => INCOME_6000_GROUPS.includes(g)) && f.annualIncomeWon <= 60_000_000;
    const upTo7500 = f.specialGroups.includes('신혼') && f.annualIncomeWon <= 75_000_000;
    return upTo6000 || upTo7500;
  }
  if (q.includes('대규모 기업 근로자')) {
    // 국민내일배움카드의 그 밖의 제외 대상. 지갑 사실로 '예'가 확인되면 예(대기업 월 300만원 이상·만 45세 미만, 생계급여, 75세 이상).
    // 그 밖에는 서류에서 읽은 사실(trainingCardExcluded)만 쓴다. 없으면 모름(CLAUDE.md 4장: 모르는 값을 채우지 않음)
    const bigCompany = f.employerSize === '대기업' && f.monthlyIncomeWon !== undefined && f.monthlyIncomeWon >= 3_000_000 && f.profile.age < 45;
    if (bigCompany || f.welfare?.includes('생계급여') || f.profile.age >= 75) return true;
    return f.trainingCardExcluded;
  }
  if (q.includes('소비향락업')) {
    // 아산 청년내일카드 제외 업종·기관. 지갑의 '공공'은 공공기관·공기업이라 예. 그 밖에는 서류에서 읽은 사실만(없으면 모름)
    if (f.employerSize === '공공') return true;
    return f.excludedWorkplace;
  }
  if (q.includes('공무원')) return f.publicServant;
  if (q.includes('중소·중견')) return f.employerSize === undefined ? undefined : ['중소', '중견', '사회적기업 등'].includes(f.employerSize);
  if (q.includes('졸업예정증명서를 발급')) {
    // 천안형 채용연계 타지역 거주자 경로(사람 검수 v2-2: 4학년 2학기 재학이 아니라 졸업예정증명서로 판단).
    // 지갑의 학적 '졸업예정'은 졸업예정증명서에서 읽은 사실이다
    const city = q.match(/([가-힣]+시) 관내 대학/)?.[1];
    // '타지역에 거주하면서'를 묻는 질문이면 그 시에 사는 사람은 아니오
    if (q.includes('타지역에 거주') && city && f.profile.residence.includes(city)) return false;
    if (f.enrollment === undefined) return undefined;
    if (f.enrollment !== '졸업예정') return false;
    return f.campusCity === undefined ? undefined : f.campusCity === city;
  }
  if (q.includes('대학이나 고등학교에 다니고')) {
    const city = q.match(/([가-힣]+시)에 있는/)?.[1];
    return (enrolledNow(f) && f.campusCity === city) || (f.highSchoolEnrolled === true && f.highSchoolCity === city);
  }
  if (q.includes('캠퍼스 대학(교)의 재학증명서')) {
    // 아산 정장 대여 학교 경로(사람 검수 v2-2: 증명서로 판단). 대학은 재학·졸업, 고등학교는 졸업만.
    // 휴학생은 재학증명서가 나오는지 몰라 답하지 않는다
    const city = q.match(/([가-힣]+시) 관내 캠퍼스/)?.[1];
    if (!city) return undefined;
    const campus =
      f.campusCity === undefined ? undefined : f.campusCity !== city ? false : f.enrollment === '휴학' ? undefined : true;
    const high =
      f.highSchoolCity === undefined ? undefined : f.highSchoolCity === city && f.highSchoolEnrolled !== true;
    if (campus || high) return true;
    return campus === false && high === false ? false : undefined;
  }
  if (q.includes('나이 제한이 없다고 확인')) {
    // 아산 정장 대여 학교 경로의 나이: 학교 경로가 아니면 아니오, 학교 경로면 운영기관 확인 여부를 몰라 답하지 않는다
    const city = q.match(/([가-힣]+시) 관내 캠퍼스/)?.[1];
    return schoolIn(f, city) === false ? false : undefined;
  }
  if (q.includes('캠퍼스의 대학 재학·졸업생')) {
    const city = q.match(/([가-힣]+시)에 있는 캠퍼스/)?.[1];
    return schoolIn(f, city);
  }
  if (q.includes('봉사·다자녀·다문화·새터민')) return f.specialGroups === undefined ? undefined : f.specialGroups.length > 0;
  if (q.includes('전입할 수 있나요')) {
    const city = q.match(/([가-힣]+시)로 전입/)?.[1];
    // 이사 계획이 사실로 없으면 모름(빈 목록이면 '계획 없음'이라 아니오)
    return f.canMoveTo === undefined ? undefined : f.canMoveTo.includes(city ?? '');
  }
  return undefined;
}

/** 학자금대출 연령 예외 보기(대학원 만 40세 / 선취업 후진학자 등 만 45세). 만 35세 이하는 나이 행으로 충족 */
function loanAgeChoice(f: WalletFacts, choices: string[]): string | undefined {
  const none = choices.find((c) => c === '위에 해당 없음');
  if (f.profile.age <= 35) return none;
  if (f.enrollment === undefined) return undefined;
  if (f.enrollment === '대학원') return f.profile.age <= 40 ? choices.find((c) => c.startsWith('대학원생')) : none;
  if (f.specialGroups === undefined) return undefined;
  return f.specialGroups.includes('선취업 후진학자') && f.profile.age <= 45
    ? choices.find((c) => c.startsWith('만 36~45세 학부생'))
    : none;
}

/** 학자금대출 학적 보기. 휴학생의 복학 예정, 졸업유예의 졸업요건 충족 여부는 지갑이 몰라 답하지 않는다 */
function loanEnrollChoice(f: WalletFacts, choices: string[]): string | undefined {
  switch (f.enrollment) {
    case '재학':
    case '졸업예정':
    case '대학원':
      return choices.find((c) => c.startsWith('재학 중'));
    case '졸업':
      return choices.find((c) => c.startsWith('학생 아님'));
    default:
      return undefined;
  }
}

/** 아산 청년내일카드 참여 대상 기업 보기 (회사 규모·형태와 상시근로자 수로 고른다) */
function employerChoice(f: WalletFacts, choices: string[]): string | undefined {
  const sme = choices.find((c) => c.startsWith('중소·중견기업(상시근로자 5인 이상)'));
  if (!sme || f.employerSize === undefined) return undefined;
  if (f.employerSize === '공공') return choices.find((c) => c.startsWith('제외 대상')) ?? choices.find((c) => c === '그 밖의 기업');
  if (f.employerSize === '대기업') return choices.find((c) => c === '그 밖의 기업');
  if (f.employerHeadcount === undefined) return undefined;
  if (f.employerSize === '사회적기업 등') return f.employerHeadcount >= 1 ? choices.find((c) => c.startsWith('사회적기업')) : undefined;
  // 1~4인 기업은 지정 업종인지 몰라 답하지 않는다
  return f.employerHeadcount >= 5 ? sme : undefined;
}

function graduationChoice(f: WalletFacts, choices: string[]): string | undefined {
  if (choices.includes('졸업 후 2년 이내 · 미취업')) {
    if (f.enrollment === undefined) return undefined;
    if (f.enrollment !== '졸업') return '졸업 전(재학·휴학)';
    if (f.graduatedYearsAgo === undefined) return undefined;
    if (f.graduatedYearsAgo > 2) return '졸업 후 2년 초과';
    return f.employment === '미취업' ? '졸업 후 2년 이내 · 미취업' : '졸업 후 2년 이내 · 취업';
  }
  if (choices.includes('대학·대학원 졸업까지 2년 미만')) {
    // 국민내일배움카드 학생 제외(사람 검수 v2-2 보기). 고등학생은 학년을 몰라 답하지 않는다(고등학교 1~2학년은 제외 대상)
    if (f.highSchoolEnrolled) return undefined;
    if (f.enrollment === undefined) return undefined;
    if (f.enrollment === '졸업') return '학생 아님';
    // 수료·졸업유예는 남은 수업연한이 없어 '2년 미만'(통과 보기)
    if (f.enrollment === '수료·졸업유예') return '대학·대학원 졸업까지 2년 미만';
    if (f.yearsToGraduation === undefined) return undefined;
    return f.yearsToGraduation < 2 ? '대학·대학원 졸업까지 2년 미만' : '대학·대학원 졸업까지 2년 이상';
  }
  return undefined;
}

function militaryAnswer(f: WalletFacts, rule: EligibilityRule, rules: EligibilityRule[]): string | undefined {
  if (f.militaryMonths === undefined) return undefined;
  if (f.militaryMonths <= 0) return NO;
  const ageRule = rules.find((r) => r.operator === 'age_between' && r.anyOfGroup === rule.anyOfGroup);
  const max = (ageRule?.value as { max?: number } | null)?.max;
  if (max === undefined) return undefined;
  const q = rule.question ?? '';
  // 질문에 상한이 있으면 반영: "(최대 6년)" 인정 연수, "실제 나이가 만 39세 이하"
  const capYears = Number(q.match(/최대 (\d+)년/)?.[1]);
  const years = Math.min(Math.floor(f.militaryMonths / 12), Number.isFinite(capYears) ? capYears : Infinity);
  const hardMax = Number(q.match(/실제 나이가 만 (\d+)세 이하/)?.[1]);
  if (Number.isFinite(hardMax) && f.profile.age > hardMax) return NO;
  if (f.profile.age - years > max) return NO;
  if (q.includes('중소·중견')) {
    // 주택도시기금: 중소·중견기업 재직자 또는 창업 보증·자금 지원을 받는 사람만. 창업 지원 여부는 지갑이 몰라 재직자만 예
    if (f.employerSize === undefined) return undefined;
    return f.employerSize === '중소' || f.employerSize === '중견' ? YES : undefined;
  }
  return YES;
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
      // 보기로 자세히 묻는 학적(학자금대출)은 보기에 맞춰 답한다
      if (choices.some((c) => c.startsWith('신입·편입·재입학·복학 예정'))) return loanEnrollChoice(f, choices);
      return f.enrollment;
    case 'employment_status':
      return f.employment;
    case 'credits_earned':
      return f.creditsLastTerm?.toString();
    case 'gpa_value': {
      if (choices.includes('B학점(80점) 이상')) {
        // 보기로 묻는 성적 기준(국가장학금): 예외 대상 -> B학점 -> 기초·차상위(C학점 점수 기준을 몰라 답하지 않음)
        if (f.specialGroups?.some((g) => g === '장애' || g === '자립준비청년')) return '장애인·자립준비청년(성적 기준 없음)';
        if (f.gpaLastTerm100 === undefined) return undefined;
        if (f.gpaLastTerm100 >= 80) return 'B학점(80점) 이상';
        if (f.welfare === undefined || f.specialGroups === undefined) return undefined;
        return /기초|차상위/.test(f.welfare) ? undefined : '위에 해당 없음';
      }
      const value = q.includes('4.5') ? f.gpaLastTerm45 : q.includes('전 학년') ? f.gpaTotal100 : f.gpaLastTerm100;
      return value?.toString();
    }
    case 'academic_year': {
      if (q.includes('1차는 2~4학년')) {
        // 재능키움: 공고일 현재 대학교 재학생(1차 2~4학년, 2차 1학년). 휴학·수료·졸업유예·졸업·대학원은 아니오
        if (f.enrollment === undefined) return undefined;
        return yesNo(f.enrollment === '재학' || f.enrollment === '졸업예정');
      }
      // 질문: 졸업학년이거나 소속 대학 최소 이수학점 이상인가. 대학별 최소 학점은 지갑이 모르므로 졸업학년일 때만 답한다
      if (!q.includes('졸업학년')) return undefined;
      if (q.includes('장애인') && f.specialGroups?.includes('장애')) return YES;
      if (q.includes('대학원생') && f.enrollment === '대학원') return YES;
      const finalYear = f.enrollment === '졸업예정' || (f.yearsToGraduation !== undefined && f.yearsToGraduation <= 1);
      return finalYear ? YES : undefined;
    }
    case 'birth_date': {
      // 질문: "1991년 11월 17일~2007년 11월 27일 사이에 태어났나요?" 지갑은 출생연도만 안다.
      // 경계 연도에 걸리면(1월 1일·12월 31일 경계가 아니면) 생일을 몰라 답하지 않는다
      const range = q.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일~(\d{4})년 (\d{1,2})월 (\d{1,2})일/);
      if (!range || f.birthYear === undefined) return undefined;
      const [from, fromM, fromD, to, toM, toD] = range.slice(1).map(Number);
      if (f.birthYear < from || f.birthYear > to) return NO;
      if (f.birthYear === from && !(fromM === 1 && fromD === 1)) return undefined;
      if (f.birthYear === to && !(toM === 12 && toD === 31)) return undefined;
      return YES;
    }
    case 'household_size':
      // 질문: 단독세대주인가. 세대주가 아니면 '아니오', 세대주면 세대원 수를 몰라 답하지 않는다
      if (!q.includes('단독세대주') || f.householdHead === undefined) return undefined;
      return f.householdHead === '세대주' ? undefined : NO;
    case 'score_period': {
      const threshold = Number(q.match(/(\d\.\d)\s*이상/)?.[1]);
      if (!Number.isFinite(threshold) || f.gpaLastTerm45 === undefined) return undefined;
      return yesNo(f.gpaLastTerm45 >= threshold);
    }
    case 'aid_band_value':
      return f.aidBand === undefined ? undefined : `${f.aidBand}구간`;
    case 'student_loan_status':
      if (choices.includes('등록금 대출 있음(생활비 대출 동시 보유 포함)')) {
        // 아산 이자 지원: 등록금 대출 / 생활비 대출만 / 없음. 지갑의 대출 종류는 등록금 대출 기준
        if (f.studentLoan === undefined) return undefined;
        return f.studentLoan === '없음' ? '해당 없음' : '등록금 대출 있음(생활비 대출 동시 보유 포함)';
      }
      return f.studentLoan;
    case 'health_insurance_type':
      return q.includes('당시') ? f.healthInsuranceAtExam : f.healthInsurance;
    case 'welfare_status':
      return f.welfare;
    case 'household_income_amount': {
      // 맞벌이 2인 가구(본인·배우자 2인, 둘 다 소득 확인) 여부는 지갑에 가구 구성 사실이 없어 답하지 않는다
      if (q.includes('맞벌이')) return undefined;
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
      if (f.homeOwner === undefined) return undefined;
      if (choices.includes('세대원 전원 무주택')) return f.homeOwner ? '주택 소유자 있음' : '세대원 전원 무주택';
      return f.homeOwner ? '주택 소유(분양권·입주권 포함)' : '무주택';
    case 'household_head_status':
      return f.householdHead;
    case 'rental_situation': {
      if (choices.includes('공공임대주택에 입주 중이 아님')) {
        // 주택도시기금: 공공임대 거주 여부와 예외(그 집이 목적물·퇴거). 공공임대 거주자의 예외는 지갑이 몰라 답하지 않는다
        if (f.rental === undefined) return undefined;
        return f.rental === '공공임대주택 거주' ? undefined : '공공임대주택에 입주 중이 아님';
      }
      if (!f.rental) return undefined;
      if (f.rental === '공공임대주택 거주') return choices.find((c) => c.startsWith('공공임대')) ?? undefined;
      return choices.includes(f.rental) ? f.rental : choices.includes('해당 없음') ? '해당 없음' : undefined;
    }
    case 'household_scope':
      // 질문: 성년 세대원 가운데 주택도시기금 대출 이용자가 있는가
      return q.includes('주택도시기금 대출') ? yesNo(f.householdFundLoan) : undefined;
    case 'income_definition':
      return q.includes('금융소득 종합과세') ? yesNo(f.financialIncomeTaxed) : undefined;
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
      const smallBiz = choices.find((c) => c.startsWith('있음(모든 사업장 연매출 합계 3억원 이하'));
      if (smallBiz) {
        // 청년미래적금: 3억원 이하라도 소상공인확인서·융자제외 업종 여부는 지갑이 몰라 답하지 않는다
        return f.businessRevenueWon <= 300000000 ? undefined : choices.find((c) => c.startsWith('있음(연매출 3억원 초과'));
      }
      if (choices.includes('있음(연매출 3억원 이하)')) {
        return f.businessRevenueWon <= 300000000 ? '있음(연매출 3억원 이하)' : '있음(연매출 3억원 초과)';
      }
      return '있음';
    }
    case 'weekly_work_hours':
      return f.weeklyHours?.toString();
    case 'personal_income_amount': {
      if (rule.operator === 'is_true') {
        // 청년내일저축계좌(사람 검수 v2-2): "현재 일해서 버는 소득이 월 10만 원 이상인가요?"
        const man = Number(q.match(/월 ([\d,]+)만 원 이상/)?.[1]?.replace(/,/g, ''));
        if (!Number.isFinite(man) || f.monthlyIncomeWon === undefined) return undefined;
        return yesNo(f.monthlyIncomeWon >= man * 10000);
      }
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
      // 보기로 묻는 질문(아산 청년내일카드 참여 대상 기업)과 예·아니오 질문
      if (choices.some((c) => c.startsWith('대학원생(전문기술석사 포함)'))) return loanAgeChoice(f, choices);
      if (choices.some((c) => c.startsWith('신입·편입·재입학·복학 예정'))) return loanEnrollChoice(f, choices);
      if (choices.length > 0) return employerChoice(f, choices);
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
    const key = inputKeyOf(rule);
    if (inputs[key]) continue;
    const regionField = PROFILE_SUPPLIED_FIELDS.includes(rule.fieldId) && rule.fieldId !== 'enrollment_status';
    if (regionField || rule.fieldId === 'employer_info') continue;
    const raw = walletAnswer(f, rule, rules);
    if (raw === undefined) continue;
    const parsed = parseRawInput(rule, raw);
    if (parsed) inputs[key] = parsed;
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
    if (raw !== undefined) values[item.inputKey] = raw;
  }
  return values;
}
