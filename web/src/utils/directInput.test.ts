import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { POLICIES_DATA } from '../data/policies';
import {
  DIRECT_INPUT_ITEMS,
  REQUIREMENT_DOCS,
  WALLET_EXTERNAL_DOC_IDS,
} from '../data/docRequirements.generated';
import { DIRECT_INPUT_SPECS } from '../data/directInputSpec';
import { DirectInputSection } from '../components/DirectInputSection';
import { WalletExternalDocsSection } from '../components/WalletExternalDocsSection';
import {
  DIRECT_INPUT_NOTICE,
  getDirectInputItemsForPolicy,
  getDirectInputResult,
  getInputSpec,
} from './directInput';
import type { EligibilityRule, RuleInputItem } from './ruleTypes';

test('지갑 밖 서류는 확인서류표 기준 14종', () => {
  assert.deepEqual(
    [...WALLET_EXTERNAL_DOC_IDS],
    ['D09', 'D11', 'D16', 'D17', 'D18', 'D19', 'D25', 'D26', 'D30', 'D32', 'D33', 'D34', 'D36', 'D39']
  );
});

test('직접 입력 항목 11개는 모두 공고별 일시 입력이고, 개인 서류가 지갑 밖 서류뿐', () => {
  assert.deepEqual(
    DIRECT_INPUT_ITEMS.map((i) => i.number),
    [21, 22, 23, 31, 34, 44, 45, 48, 52, 53, 54]
  );
  const external = new Set(WALLET_EXTERNAL_DOC_IDS);
  for (const item of DIRECT_INPUT_ITEMS) {
    assert.equal(item.storage, '공고별 일시 입력', item.label);
    const personalDocs = item.docIds.filter((id) => {
      const doc = REQUIREMENT_DOCS.find((d) => d.id === id);
      return doc && !doc.kakaoList.includes('해당 없음');
    });
    assert.ok(personalDocs.length > 0, item.label);
    assert.ok(personalDocs.every((id) => external.has(id)), item.label);
  }
});

test('직접 입력 항목마다 입력 방식이 정의되어 있음', () => {
  for (const item of DIRECT_INPUT_ITEMS) {
    assert.ok(DIRECT_INPUT_SPECS[item.fieldId], item.fieldId);
  }
});

test('시연 정책의 직접 입력 연결은 존재하는 항목만 가리키고, 학자금 4항목은 정책 9에 연결됨', () => {
  const known = new Set(DIRECT_INPUT_ITEMS.map((i) => i.fieldId));
  for (const policy of POLICIES_DATA) {
    for (const id of policy.directInputFieldIds ?? []) {
      assert.ok(known.has(id), `${policy.id}:${id}`);
    }
  }
  const studentLoan = POLICIES_DATA.find((p) => p.id === '9');
  assert.ok(studentLoan);
  assert.deepEqual(
    getDirectInputItemsForPolicy(studentLoan).map((i) => i.number),
    [21, 22, 23, 54]
  );
});

test('직접 입력 결과는 규칙 연결 전이라 값이 있어도 ?', () => {
  assert.equal(getDirectInputResult('').result, '?');
  assert.equal(getDirectInputResult('3구간').result, '?');
  assert.notEqual(getDirectInputResult('').label, getDirectInputResult('3구간').label);
});

test('직접 입력 영역은 서류 안내와 저장 안 함 안내를 보여줌', () => {
  const housing = POLICIES_DATA.find((p) => p.id === '1');
  assert.ok(housing);
  const html = renderToStaticMarkup(createElement(DirectInputSection, { policy: housing }));
  assert.ok(html.includes(DIRECT_INPUT_NOTICE));
  assert.ok(html.includes('월세액'));
  assert.ok(html.includes('임대차계약서'));
  assert.ok(html.includes('관리비·보증금 제외 여부와 공고 인정 지급기간 확인.'));

  const noInput = POLICIES_DATA.find((p) => !(p.directInputFieldIds ?? []).length);
  assert.ok(noInput);
  assert.equal(renderToStaticMarkup(createElement(DirectInputSection, { policy: noInput })), '');
});

test('전자지갑의 지갑 밖 서류 목록은 14종을 모두 보여줌', () => {
  const html = renderToStaticMarkup(createElement(WalletExternalDocsSection));
  assert.ok(html.includes('14종'));
  for (const doc of REQUIREMENT_DOCS.filter((d) => d.walletExternal)) {
    assert.ok(html.includes(doc.name.replace(/&/g, '&amp;')), doc.id);
  }
});

test('직접 입력 코드는 브라우저 저장소·URL에 값을 쓰지 않음', () => {
  const files = [
    new URL('../components/DirectInputSection.tsx', import.meta.url),
    new URL('./directInput.ts', import.meta.url),
    new URL('./ruleEngine.ts', import.meta.url),
    new URL('./ruleTypes.ts', import.meta.url),
  ];
  for (const file of files) {
    const src = readFileSync(file, 'utf-8');
    for (const banned of ['localStorage', 'sessionStorage', 'indexedDB', 'location.hash', 'history.', 'console.']) {
      assert.ok(!src.includes(banned), `${file.pathname}: ${banned}`);
    }
  }
});

test('정해 둔 입력 방식이 있는 항목도 규칙의 질문을 보여줌(보기는 그대로)', () => {
  const rule: EligibilityRule = {
    id: 1, ruleKey: 'existing_support', fieldId: 'existing_support', fieldName: '기존 지원',
    operator: 'in', value: ['해당 없음', '참여·수급 종료'], anyOfGroup: null, label: '실업급여 수급 중이 아님',
    failReason: null, question: '지금 실업급여를 받고 있나요?', choices: null, unit: null, sortOrder: 10,
    sourceQuote: null, sourceLocator: null, sourceTitle: null, sourceUrl: null,
  };
  const item: RuleInputItem = {
    number: 0, label: '기존 지원', fieldId: 'existing_support', inputKey: 'existing_support', storage: '공고별 일시 입력', docsLabel: '',
    issuer: '', checkMethod: '', checkContent: '', caution: '', docIds: [], rules: [rule], docs: [], regionNames: {},
  };
  const spec = getInputSpec(item);
  assert.ok(spec && spec.kind === 'select');
  assert.deepEqual(spec.options, DIRECT_INPUT_SPECS.existing_support.kind === 'select' ? DIRECT_INPUT_SPECS.existing_support.options : []);
  assert.ok(spec.hint?.startsWith('지금 실업급여를 받고 있나요?'));
  const noQuestion: RuleInputItem = { ...item, rules: [{ ...rule, question: null }] };
  assert.equal(getInputSpec(noQuestion), DIRECT_INPUT_SPECS.existing_support);
});
