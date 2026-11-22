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
        const fixed = DIRECT_INPUT_SPECS[rule.fieldId];
        const options = fixed?.kind === 'select' ? fixed.options : rule.choices;
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
      } else if (rule.fieldId !== 'existing_support' && rule.fieldId !== 'special_target_status') {
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

  // E4 나이는 아산 주소로 신청할 때만: 40대 아산 캠퍼스 졸업생은 O, 40대 아산 주민(학교 조건 없음)은 X
  assert.equal(verdict(vary(b, {}, { age: 45 }), 'E4').result, 'X');
  assert.equal(verdict(vary(b, { campusCity: '아산시' }, { age: 45, residence: '충청남도 천안시' }), 'E4').result, 'O');
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
  assert.equal(row(b, 'C2', 'fund_household'), 'X', '버팀목 이용 중');
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
  assert.equal(row(vary(c, { militaryMonths: 96 }, { age: 41 }), 'F1', 'age'), 'X');
  assert.equal(row(vary(c, { militaryMonths: 72 }, { age: 40 }), 'F1', 'age'), 'O');

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
  assert.deepEqual(rejected.sort(), ['A3.age', 'C4.age', 'D3.age', 'D3.employment']);
  assert.ok(!(RULES.get('D3') ?? []).some((r) => r.ruleKey === 'employment'));
});
