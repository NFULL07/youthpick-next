import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DIRECT_INPUT_SPECS } from '../data/directInputSpec';
import { VIRTUAL_PERSONAS, findPersona, type WalletFacts } from '../data/virtualWallet';
import { evaluateRuleRows, profileToInputs } from './ruleEngine';
import type { EligibilityRule } from './ruleTypes';
import { walletAnswer, walletInputs } from './walletAnswers';

/** 따옴표·줄바꿈이 들어간 CSV를 읽는 작은 파서(시험용) */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const csv = parseCsv(readFileSync(new URL('../../../docs/data/eligibility_rules_v0_1.csv', import.meta.url), 'utf-8'));
const REGION_NAMES = { '44': '충청남도', '44130': '충청남도 천안시', '44131': '충청남도 천안시', '44133': '충청남도 천안시', '44200': '충청남도 아산시' };

/** 초안 규칙을 '검수 완료'라고 가정한 판정 (시험용. 화면은 검수 완료 규칙만 쓴다) */
const RULES = new Map<string, EligibilityRule[]>();
csv.forEach((r, i) => {
  if (r['검수 상태'] === '반려') return; // 반려한 행은 판정에 쓰지 않는다
  const policyId = r['공고키'].split(':')[0];
  const rule: EligibilityRule = {
    id: i + 1, ruleKey: r['규칙키'], fieldId: r['항목ID'], fieldName: r['항목ID'],
    operator: r['연산자'] as EligibilityRule['operator'], value: r['값(JSON)'] ? JSON.parse(r['값(JSON)']) : null,
    anyOfGroup: r['OR묶음'] || null, label: r['화면 문구'], failReason: r['불일치 이유'] || null,
    question: r['질문'] || null, choices: r['선택지(JSON)'] ? JSON.parse(r['선택지(JSON)']) : null,
    unit: r['단위'] || null, sortOrder: Number(r['순서']) || 0, sourceQuote: null, sourceLocator: null,
    sourceTitle: null, sourceUrl: null,
  };
  RULES.set(policyId, [...(RULES.get(policyId) ?? []), rule]);
});

function verdict(persona: WalletFacts, policyId: string) {
  const rules = RULES.get(policyId) ?? [];
  const inputs = { ...profileToInputs(persona.profile), ...walletInputs(persona, rules) };
  const rows = evaluateRuleRows(rules, inputs, REGION_NAMES);
  const result = rows.some((r) => r.outcome.result === 'X') ? 'X' : rows.every((r) => r.outcome.result === 'O') ? 'O' : '?';
  return { result, rows };
}

test('규칙 초안은 28개 정책 모두에 있음', () => {
  assert.equal(RULES.size, 28);
});

test('가상 지갑의 답은 규칙의 보기(또는 정해 둔 보기) 안에서만 나옴', () => {
  for (const persona of VIRTUAL_PERSONAS) {
    for (const [policyId, rules] of RULES) {
      for (const rule of rules) {
        const answer = walletAnswer(persona, rule, rules);
        if (answer === undefined) continue;
        // 화면과 같은 순서: 규칙에 보기가 있으면 규칙 보기, 없으면 정해 둔 보기
        const fixed = DIRECT_INPUT_SPECS[rule.fieldId];
        const options = rule.choices && rule.choices.length > 0 ? rule.choices : fixed?.kind === 'select' ? fixed.options : null;
        if (options && options.length > 0) {
          assert.ok(options.includes(answer), `${persona.id} ${policyId}.${rule.ruleKey}: '${answer}'`);
        }
      }
    }
  }
});

test('가상 인물별 대표 판정 (초안을 검수 완료로 가정)', () => {
  const a = findPersona('persona-a')!;
  const b = findPersona('persona-b')!;
  const c = findPersona('persona-c')!;
  assert.equal(verdict(a, 'B1').result, 'O', '천안 대학생: 국가장학금');
  assert.equal(verdict(a, 'A4').result, 'X', '천안 대학생: 아산 거주 요건');
  assert.equal(verdict(b, 'C3').result, 'O', '아산 직장인: 충남 전세이자');
  assert.equal(verdict(b, 'H1').result, 'O', '아산 직장인: 아산 청년내일카드');
  assert.equal(verdict(b, 'D1').result, 'X', '아산 직장인: 미취업 아님');
  assert.equal(verdict(c, 'C1').result, 'O', '천안 구직자: 청년월세');
  assert.equal(verdict(c, 'A3').result, 'O', '천안 구직자: 졸업 후 2년 이내 미취업');
  assert.equal(verdict(c, 'E3').result, 'O', '천안 구직자: 면접 정장');
});

test('가상 지갑을 켜면 대부분의 정책이 O 또는 X로 갈림', () => {
  for (const persona of VIRTUAL_PERSONAS) {
    const decided = [...RULES.keys()].filter((id) => verdict(persona, id).result !== '?').length;
    assert.ok(decided >= 22, `${persona.id}: ${decided}/28`);
  }
});

test('지갑에 없는 사실이나 해석 못 한 질문은 답하지 않음(= ?)', () => {
  const empty: WalletFacts = { id: 'x', name: 'x', summary: '', profile: VIRTUAL_PERSONAS[0].profile, selfYears: {}, parentYears: {} };
  for (const [, rules] of RULES) {
    for (const rule of rules) {
      const answer = walletAnswer(empty, rule, rules);
      if (rule.fieldId === 'registered_move_in_date' || rule.fieldId === 'parent_registered_duration') {
        assert.ok(answer === undefined || answer.endsWith('주민등록 없음'));
      } else if (
        rule.fieldId !== 'existing_support' &&
        rule.fieldId !== 'special_target_status' &&
        // 예·아니오로 묻는 학적 증명서 질문(D4)은 '타지역 거주'를 '내 정보'의 주소로 판단해 아니오가 나올 수 있다
        !(rule.fieldId === 'enrollment_status' && rule.choices?.includes('예'))
      ) {
        assert.equal(answer, undefined, `${rule.fieldId}`);
      }
    }
  }
  const odd = { ...RULES.get('E5')![1], question: '처음 보는 질문인가요?' };
  assert.equal(walletAnswer(VIRTUAL_PERSONAS[0], odd), undefined);
});

test('가상 지갑 코드는 브라우저 저장소에 값을 쓰지 않음', () => {
  for (const file of ['../data/virtualWallet.ts', './walletAnswers.ts', './virtualWalletContext.ts', '../components/VirtualWalletBanner.tsx']) {
    const src = readFileSync(new URL(file, import.meta.url), 'utf-8');
    for (const banned of ['localStorage', 'sessionStorage', 'indexedDB', 'saveJson', 'fetch(']) {
      assert.ok(!src.includes(banned), `${file}: ${banned}`);
    }
  }
});

/** 가상 인물의 일부 사실만 바꾼 사례 */
function vary(base: WalletFacts, facts: Partial<WalletFacts>, profile: Partial<WalletFacts['profile']> = {}): WalletFacts {
  return { ...base, ...facts, profile: { ...base.profile, ...profile } };
}

test('팀 결정(2026-11-21): 예외 조건이 X·O를 틀리게 만들지 않음', () => {
  const a = findPersona('persona-a')!;
  const b = findPersona('persona-b')!;
  const c = findPersona('persona-c')!;

  // A1 졸업학년은 12학점 미만이어도 학점 기준 제외. 졸업학년이 아니면 대학 최소 학점을 몰라 ?
  assert.equal(verdict(vary(a, { creditsLastTerm: 9 }), 'A1').result, 'O');
  assert.equal(verdict(vary(a, { creditsLastTerm: 9, enrollment: '재학', yearsToGraduation: 2.5 }), 'A1').result, '?');
  // A1 만 36~45세는 선취업 후진학자 등일 때만
  assert.equal(verdict(vary(a, { specialGroups: ['선취업 후진학자'] }, { age: 40 }), 'A1').result, 'O');
  assert.equal(verdict(vary(a, {}, { age: 40 }), 'A1').result, 'X');

  // B1 성적: 80점 미만이면 X, 장애인·자립준비청년은 성적 기준 없음, 기초·차상위는 C학점 점수 기준을 몰라 ?
  assert.equal(verdict(vary(a, { gpaLastTerm100: 75 }), 'B1').result, 'X');
  assert.equal(verdict(vary(a, { gpaLastTerm100: 75, specialGroups: ['장애'] }), 'B1').result, 'O');
  assert.equal(verdict(vary(a, { gpaLastTerm100: 75, welfare: '차상위' }), 'B1').result, '?');

  // C2 만 25세 미만 세대주: 60㎡ 초과면 단독세대주 여부를 몰라 ?, 60㎡ 이하면 면적 조건 충족
  const young = vary(c, { areaM2: 70 }, { age: 23 });
  const area25 = (p: WalletFacts) => verdict(p, 'C2').rows.find((r) => r.rules.some((x) => x.ruleKey === 'area25'))!.outcome.result;
  assert.equal(area25(young), '?');
  assert.equal(area25(vary(young, { areaM2: 50 })), 'O');
  assert.equal(area25(vary(c, { areaM2: 70 })), 'O', '만 25세 이상은 85㎡ 기준만');
  // C2 소득: 5천만원 초과는 예외 대상일 때만
  const income = (p: WalletFacts) => verdict(p, 'C2').rows.find((r) => r.rules.some((x) => x.ruleKey === 'income'))!.outcome.result;
  assert.equal(income(vary(c, { annualIncomeWon: 70_000_000 })), 'X');
  assert.equal(income(vary(c, { annualIncomeWon: 70_000_000, specialGroups: ['신혼'] })), 'O');
  assert.equal(income(vary(c, { annualIncomeWon: 70_000_000, specialGroups: ['다자녀'] })), 'X');
  assert.equal(income(vary(c, { annualIncomeWon: 58_000_000, specialGroups: ['다자녀'] })), 'O');

  // C3 출생일 기준: 만 40세여도 1986년생이면 대상
  assert.equal(verdict(vary(b, { birthYear: 1986 }, { age: 40 }), 'C3').result, 'O');
  assert.equal(verdict(vary(b, { birthYear: 1985 }, { age: 40 }), 'C3').result, 'X');

  // E4 40대 아산 주민(학교 조건 없음)은 X.
  // 학교 경로의 나이 예외는 사람 검수(이해찬 2026-11-23)에서 반려 → 운영기관 확인 전까지 나이 조건은 모두에게 적용(40대 아산 캠퍼스 졸업생도 X)
  assert.equal(verdict(vary(b, { campusCity: '천안시', highSchoolCity: '천안시' }, { age: 45 }), 'E4').result, 'X');
  assert.equal(verdict(vary(b, { campusCity: '아산시' }, { age: 45, residence: '충청남도 천안시' }), 'E4').result, 'X');
});

test('교차검증(2026-11-22): 원문 예외·단서를 반영한 규칙', () => {
  const a = findPersona('persona-a')!;
  const b = findPersona('persona-b')!;
  const c = findPersona('persona-c')!;
  const row = (p: WalletFacts, id: string, key: string) =>
    verdict(p, id).rows.find((r) => r.rules.some((x) => x.ruleKey === key))!.outcome.result;

  // A1 장애인은 학점 기준 적용 예외
  assert.equal(verdict(vary(a, { creditsLastTerm: 9, enrollment: '재학', yearsToGraduation: 2.5, specialGroups: ['장애'] }), 'A1').result, 'O');

  // C1 출생연도 기준(2026년 1991~2007년생): 만 35세 1991년생은 O, 1990년생은 X
  assert.equal(row(vary(c, { birthYear: 1991 }, { age: 35 }), 'C1', 'age'), 'O');
  assert.equal(row(vary(c, { birthYear: 1990 }, { age: 36 }), 'C1', 'age'), 'X');
  // C1 한시 특별지원 24개월을 모두 받았으면 끝났어도 X
  assert.equal(verdict(vary(c, { pastSupports: ['청년월세 한시 특별지원 24개월'] }), 'C1').result, 'X');

  // C2 쉐어하우스는 세대주 요건 예외
  assert.equal(row(vary(c, { householdHead: '세대원' }), 'C2', 'head'), 'X');
  assert.equal(row(vary(c, { householdHead: '세대원', shareHouse: true }), 'C2', 'head'), 'O');
  // C2 성년 세대원 가운데 기금대출 이용자가 있으면 X
  assert.equal(row(vary(c, { householdFundLoan: true }), 'C2', 'fund_household'), 'X');
  // 버팀목 이용 중: 임차중도금 중복 허용 예외(HF 보증·다른 물건지)에 해당하는지 지갑이 몰라 ?
  assert.equal(row(b, 'C2', 'fund_household'), '?', '버팀목 이용 중, 예외 여부 모름');
  // C2 병역 연장은 중소·중견기업 재직자 등만: 창업 지원 여부를 모르면 ?
  assert.equal(row(vary(c, { militaryMonths: 21 }, { age: 37 }), 'C2', 'age'), 'X', '1년 빼도 만 36세');
  assert.equal(row(vary(c, { militaryMonths: 36 }, { age: 37 }), 'C2', 'age'), '?');
  assert.equal(row(vary(c, { militaryMonths: 36, employerSize: '중소' }, { age: 37 }), 'C2', 'age'), 'O');
  assert.equal(row(vary(c, { militaryMonths: 72, employerSize: '중소' }, { age: 40 }), 'C2', 'age'), 'X', '최대 만 39세');

  // E1 판단 시점은 시험응시일: 지금 재직 중이어도 X가 아니라 ?
  assert.equal(row(b, 'E1', 'employment'), '?');
  assert.equal(row(c, 'E1', 'employment'), 'O');

  // F1 소득 없음은 X, 병 급여가 있으면 소득 묶음 O, 금융소득 종합과세 대상자는 X
  assert.equal(row(a, 'F1', 'income_salary'), 'X');
  assert.equal(row(vary(a, { specialGroups: ['병 급여'] }), 'F1', 'income_salary'), 'O');
  assert.equal(row(vary(c, { financialIncomeTaxed: true }), 'F1', 'financial_income'), 'X');
  // F1 병역 인정은 최대 6년
  assert.equal(row(vary(c, { militaryMonths: 96, birthYear: 1985 }, { age: 41 }), 'F1', 'age'), 'X');
  assert.equal(row(vary(c, { militaryMonths: 72, birthYear: 1986 }, { age: 40 }), 'F1', 'age'), 'O');

  // H1 참여 대상 기업: 중소 5인 이상 O, 대기업 X, 1~4인은 업종을 몰라 ?
  assert.equal(row(b, 'H1', 'employer_size'), 'O');
  assert.equal(row(vary(b, { employerSize: '대기업' }), 'H1', 'employer_size'), 'X');
  assert.equal(row(vary(b, { employerHeadcount: 3 }), 'H1', 'employer_size'), '?');
  // H1 보수 기준 3,846,357원
  assert.equal(row(vary(b, { monthlyIncomeWon: 3_500_000 }), 'H1', 'pay'), 'O');
  assert.equal(row(vary(b, { monthlyIncomeWon: 3_900_000 }), 'H1', 'pay'), 'X');

  // E5 고등학생은 학년을 몰라 답하지 않음
  const e5 = RULES.get('E5')!.find((r) => r.ruleKey === 'student')!;
  assert.equal(walletAnswer(vary(a, { enrollment: undefined, highSchoolEnrolled: true }), e5), undefined);
});

test('반려한 행은 시험용 판정에도 쓰지 않음', () => {
  const rejected = csv.filter((r) => r['검수 상태'] === '반려').map((r) => `${r['공고키'].split(':')[0]}.${r['규칙키']}`);
  assert.deepEqual(rejected.sort(), ['A3.age', 'C3.existing_support', 'C4.age', 'C4.same_household', 'D3.age', 'D3.employment', 'D5.employment', 'E4.age_school']);
  assert.ok(!(RULES.get('D3') ?? []).some((r) => r.ruleKey === 'employment'));
});

test('사람 검수 v2-1(2026-11-22 안준모): 수정 지시를 반영한 규칙', () => {
  const a = findPersona('persona-a')!;
  const b = findPersona('persona-b')!;
  const c = findPersona('persona-c')!;
  const row = (p: WalletFacts, id: string, key: string) =>
    verdict(p, id).rows.find((r) => r.rules.some((x) => x.ruleKey === key))!.outcome.result;

  // A1 대학원생은 만 40세까지, 학부생은 선취업 후진학자 등만 만 45세까지
  assert.equal(row(vary(a, { enrollment: '대학원' }, { age: 38 }), 'A1', 'age'), 'O');
  assert.equal(row(vary(a, { enrollment: '대학원' }, { age: 41 }), 'A1', 'age'), 'X');
  assert.equal(row(vary(a, { enrollment: '재학' }, { age: 38 }), 'A1', 'age'), 'X');
  assert.equal(row(vary(a, { enrollment: '재학', specialGroups: ['선취업 후진학자'] }, { age: 44 }), 'A1', 'age'), 'O');
  // A1 휴학생은 복학 예정 여부를 몰라 ?(일괄 X가 아님), 졸업생은 X
  assert.equal(row(vary(a, { enrollment: '휴학' }), 'A1', 'enrollment'), '?');
  assert.equal(row(vary(a, { enrollment: '졸업' }), 'A1', 'enrollment'), 'X');
  assert.equal(row(a, 'A1', 'enrollment'), 'O');

  // A4 등록금 대출이 없으면 X
  assert.equal(row(vary(a, { studentLoan: '없음' }), 'A4', 'loan'), 'X');
  assert.equal(row(a, 'A4', 'loan'), 'O');

  // B3 휴학·졸업은 X, 재학·졸업예정은 O
  assert.equal(row(a, 'B3', 'enrollment'), 'O');
  assert.equal(row(vary(a, { enrollment: '휴학' }), 'B3', 'enrollment'), 'X');

  // C2 쉐어하우스 여부와 공공임대 거주는 따로 묻는다
  assert.equal(row(vary(c, { householdHead: '세대원', shareHouse: true }), 'C2', 'head'), 'O');
  assert.equal(row(vary(c, { shareHouse: true, areaM2: 100 }), 'C2', 'area'), 'O');
  assert.equal(row(vary(c, { rental: '공공임대주택 거주' }), 'C2', 'public_rental'), '?');
  assert.equal(row(c, 'C2', 'public_rental'), 'O');
  // C2 집이 있으면 X
  assert.equal(row(vary(c, { homeOwner: true }), 'C2', 'home'), 'X');
  // C2 전세대출을 안 쓰면 임차중도금 예외와 무관하게 기존 대출 행 O
  assert.equal(row(c, 'C2', 'existing_support'), 'O');
  assert.equal(row(b, 'C2', 'existing_support'), '?', '전세대출 이용 중, 임차중도금 예외 여부 모름');
});

const V3_BY = 'Claude(원문 대조)·김주완 확정';

test('검수 완료 행: v2-1(안준모) 5개, v2-2(이해찬) 9개, v3(Claude 원문 대조·주완 확정) 8개 정책', () => {
  const done = csv.filter((r) => r['검수 상태'] === '검수 완료');
  const by = (name: string) => new Set(done.filter((r) => r['검수자'] === name).map((r) => r['공고키'].split(':')[0]));
  assert.deepEqual([...by('안준모')].sort(), ['A1', 'A4', 'B3', 'C1', 'C2']);
  assert.deepEqual([...by('이해찬')].sort(), ['D4', 'E1', 'E3', 'E4', 'E5', 'F1', 'F2', 'G1', 'H1']);
  assert.deepEqual([...by(V3_BY)].sort(), ['A2', 'B5', 'C3', 'D1', 'D2', 'D3', 'D5', 'G2']);
  assert.ok(done.every((r) => ['안준모', '이해찬', V3_BY].includes(r['검수자']) && r['근거 원문 인용'] && r['근거 URL'] && r['검수일']));
  // 확정 못 한 정책은 초안 그대로(근거가 2025 이전뿐, 원문을 못 엶, 규칙 구조를 먼저 고쳐야 함)
  for (const id of ['A3', 'B1', 'B2', 'B4', 'C4', 'E2']) {
    assert.ok(!done.some((r) => r['공고키'].startsWith(id + ':')), id);
  }
});

test('v3 수정: D1 주 30시간 미만 근로자도 참여, D3 졸업 시점·참여 대학은 질문으로', () => {
  const b = findPersona('persona-b')!;
  const a = findPersona('persona-a')!;
  const row = (p: WalletFacts, id: string, key: string) =>
    verdict(p, id).rows.find((r) => r.rules.some((x) => x.ruleKey === key))!.outcome.result;
  // D1: 재직 중이어도 주 30시간 미만이면 O, 36시간이면 X
  assert.equal(row(vary(b, { weeklyHours: 20 }), 'D1', 'employment'), 'O');
  assert.equal(row(vary(b, { weeklyHours: 40 }), 'D1', 'employment'), 'X');
  // D3: 졸업 시점·참여 대학은 지갑이 몰라 ?(충남 대학이라는 이유만으로 O가 아님)
  assert.equal(row(a, 'D3', 'campus'), '?');
  assert.equal(row(a, 'D3', 'enrollment'), '?');
});

test('사람 검수 v2-2(2026-11-23 이해찬): 수정 지시를 반영한 규칙', () => {
  const a = findPersona('persona-a')!;
  const b = findPersona('persona-b')!;
  const c = findPersona('persona-c')!;
  const row = (p: WalletFacts, id: string, key: string) =>
    verdict(p, id).rows.find((r) => r.rules.some((x) => x.ruleKey === key))!.outcome.result;

  // D4 미취업은 두 경로 모두에 적용(이해찬 '맞음': 기존 초안 그대로)
  assert.equal(row(a, 'D4', 'employment'), 'O');
  assert.equal(row(vary(a, { employment: '재직' }), 'D4', 'employment'), 'X');
  assert.equal(row(vary(a, { employment: '재직' }, { residence: '충청남도 아산시' }), 'D4', 'employment'), 'X');
  // D4 타지역 거주자는 졸업예정증명서(지갑의 학적 '졸업예정')로 판단: 4학년 재학만으로는 X
  const away = { residence: '충청남도 아산시' };
  assert.equal(row(vary(a, {}, away), 'D4', 'residence_school'), 'O');
  assert.equal(row(vary(a, { enrollment: '재학', yearsToGraduation: 0.5 }, away), 'D4', 'residence_school'), 'X');
  assert.equal(row(vary(a, { campusCity: undefined }, away), 'D4', 'residence_school'), '?');

  // E4 학교 경로는 증명서로 판단: 아산 캠퍼스 재학·졸업생 O, 아산 고교 재학 중(졸업 전)은 X, 모르면 ?
  const outside = { residence: '충청남도 천안시' };
  assert.equal(row(vary(c, { campusCity: '아산시' }, outside), 'E4', 'target_school'), 'O');
  assert.equal(row(vary(c, { campusCity: '천안시', highSchoolCity: '아산시', highSchoolEnrolled: true }, outside), 'E4', 'target_school'), 'X');
  assert.equal(row(vary(c, { campusCity: undefined }, outside), 'E4', 'target_school'), '?');
  // D4·E4 증명서 질문은 '학적 상태' 항목(2026-11-24): 칸 이름·서류 안내만 바뀌고 판정은 같음
  for (const [id, key] of [['D4', 'residence_school'], ['E4', 'target_school']] as const) {
    const rule = RULES.get(id)!.find((r) => r.ruleKey === key)!;
    assert.equal(rule.fieldId, 'enrollment_status');
    assert.deepEqual(rule.choices, ['예', '아니오', '모름']);
  }
  // E4 나이는 모두에게 적용(학교 경로 나이 예외 반려)
  assert.equal(row(vary(c, {}, { age: 41 }), 'E4', 'age'), 'X');

  // E5 학생 보기: 졸업은 학생 아님 O, 졸업까지 2년 이상 X
  assert.equal(row(c, 'E5', 'student'), 'O');
  assert.equal(row(vary(a, { enrollment: '재학', yearsToGraduation: 3 }), 'E5', 'student'), 'X');
  assert.equal(row(vary(a, { enrollment: '재학', yearsToGraduation: 1 }), 'E5', 'student'), 'O');

  // F1 가구 소득: 200% 이하 O. 200% 초과면 맞벌이 2인 가구 여부를 몰라 ?
  assert.equal(row(a, 'F1', 'household'), 'O');
  assert.equal(row(vary(a, { householdMedianPct: 230 }), 'F1', 'household'), '?');

  // F2 일해서 버는 소득 월 10만원 이상: 예·아니오로 판정
  assert.equal(row(b, 'F2', 'work_income'), 'O');
  assert.equal(row(c, 'F2', 'work_income'), 'X');
  assert.equal(row(vary(b, { monthlyIncomeWon: undefined }), 'F2', 'work_income'), '?');

  // E5 그 밖의 제외 대상(초안): 대기업 월 300만원 이상·만 45세 미만 근로자는 X
  assert.equal(row(b, 'E5', 'other_exclusions'), 'O');
  assert.equal(row(vary(b, { employerSize: '대기업', monthlyIncomeWon: 3_500_000 }), 'E5', 'other_exclusions'), 'X');

  // F1 이번 회차 출생일 범위(초안): 경계 연도(1991년생)는 생일을 몰라 ?, 범위 밖은 X
  assert.equal(row(vary(c, { birthYear: 1991, militaryMonths: 0 }, { age: 35 }), 'F1', 'age'), '?');
  assert.equal(row(vary(c, { birthYear: 1990, militaryMonths: 0 }, { age: 36 }), 'F1', 'age'), 'X');

  // H1 타 지역 거주자는 입사 6개월 안에 아산 전입하면 인정
  assert.equal(row(vary(b, {}, { residence: '충청남도 천안시' }), 'H1', 'res_city'), 'X');
  assert.equal(row(vary(b, { canMoveTo: ['아산시'] }, { residence: '충청남도 천안시' }), 'H1', 'res_city'), 'O');
  // H1 제외 기관(공공기관·공기업)은 대상 기업 보기와 따로 X
  assert.equal(row(vary(b, { employerSize: '공공' }), 'H1', 'employer_excluded'), 'X');
  assert.equal(row(b, 'H1', 'employer_excluded'), 'O');
});

test('v2-2 9개 정책: 사람 검수(이해찬) 41행 검수 완료, 반려 1행, 검수표에 없던 2행은 초안', () => {
  const v22 = ['D4', 'E1', 'E3', 'E4', 'E5', 'F1', 'F2', 'G1', 'H1'];
  const rows = csv.filter((r) => v22.includes(r['공고키'].split(':')[0]));
  const key = (r: Record<string, string>) => `${r['공고키'].split(':')[0]}.${r['규칙키']}`;
  assert.equal(rows.filter((r) => r['검수 상태'] === '검수 완료' && r['검수자'] === '이해찬').length, 41);
  assert.deepEqual(rows.filter((r) => r['검수 상태'] === '반려').map(key), ['E4.age_school']);
  assert.deepEqual(rows.filter((r) => r['검수 상태'] === '초안').map(key).sort(), ['E5.other_exclusions', 'F1.age_birth']);
  assert.ok(!rows.some((r) => r['규칙키'] === 'employment_school'), 'D4 미취업 분리는 사람 검수에서 맞음(기존 초안) → 넣지 않음');
});

test('가상 지갑은 모르는 사실을 아니오로 채우지 않음(CLAUDE.md 4장)', () => {
  const b = findPersona('persona-b')!;
  const c = findPersona('persona-c')!;
  const row = (p: WalletFacts, id: string, key: string) =>
    verdict(p, id).rows.find((r) => r.rules.some((x) => x.ruleKey === key))!.outcome.result;
  // 사실이 있으면 판정, 없으면 ?
  assert.equal(row(b, 'H1', 'employer_excluded'), 'O');
  assert.equal(row(vary(b, { excludedWorkplace: undefined }), 'H1', 'employer_excluded'), '?');
  assert.equal(row(b, 'E5', 'other_exclusions'), 'O');
  assert.equal(row(vary(b, { trainingCardExcluded: undefined }), 'E5', 'other_exclusions'), '?');
  // 모르는 사실이 있어도 확인된 제외 사유(대기업 고임금)가 있으면 X
  assert.equal(row(vary(b, { trainingCardExcluded: undefined, employerSize: '대기업', monthlyIncomeWon: 3_500_000 }), 'E5', 'other_exclusions'), 'X');
  // 이사 계획: 빈 목록은 '계획 없음'(아니오), 사실이 없으면 ?
  assert.equal(row(vary(b, {}, { residence: '충청남도 천안시' }), 'H1', 'res_city'), 'X');
  assert.equal(row(vary(b, { canMoveTo: undefined }, { residence: '충청남도 천안시' }), 'H1', 'res_city'), '?');
  assert.equal(walletAnswer(vary(c, { canMoveTo: undefined }), RULES.get('H1')!.find((r) => r.ruleKey === 'res_move')!), undefined);
});
