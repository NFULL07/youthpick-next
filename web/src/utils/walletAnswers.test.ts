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
