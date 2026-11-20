import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_USER_PROFILE, POLICIES_DATA } from '../data/policies';
import { AGE_RANGE_MESSAGE, parseAgeInput } from '../pages/ProfilePage';
import { CRITERIA_RESULT_STYLE } from '../types/policy';
import { generateDeterministicSherpaReply, type SherpaContext } from './sherpaEngine';
import { saveJson } from './storedState';

test('R3: 지역 이름만으로 주거 답변이 나오지 않음', () => {
  const ctx: SherpaContext = { route: 'home', profile: DEFAULT_USER_PROFILE, policies: POLICIES_DATA };
  for (const q of ['천안 취업 정책 알려줘', '천안에서 자격증 지원 있어?']) {
    const reply = generateDeterministicSherpaReply(q, ctx);
    assert.ok(!reply.text.includes('월세 지원 등은 실제 거주지'), q);
  }
  assert.equal(generateDeterministicSherpaReply('천안 월세 지원', ctx).targetRoute, 'switch');
});

test('R7: 범위 밖 나이는 바꾸지 않고 거부', () => {
  assert.equal(parseAgeInput('12'), null);
  assert.equal(parseAgeInput('50'), null);
  assert.equal(parseAgeInput('2a'), null);
  assert.equal(parseAgeInput(''), null);
  assert.equal(parseAgeInput('15'), 15);
  assert.equal(parseAgeInput(' 49 '), 49);
  assert.ok(AGE_RANGE_MESSAGE.includes('저장하지 않아요'));
});

test('R9: 저장이 막혀도 예외가 나지 않음', () => {
  const broken = { setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.equal(saveJson('k', [1], broken), false);
  const store: Record<string, string> = {};
  assert.equal(saveJson('k', [1], { setItem: (k: string, v: string) => { store[k] = v; } }), true);
  assert.equal(store.k, '[1]');
  assert.equal(saveJson('k', [1], null), false);
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf-8');
  assert.ok(!app.includes('localStorage.setItem'), 'App.tsx는 saveJson만 쓴다');
});

test('R10: 개발 서버 호스트 검사를 끄지 않음', () => {
  const config = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf-8');
  assert.ok(!config.includes('allowedHosts'));
});

test('직접 입력 결과 배지는 O/X/? 색을 따로 씀', () => {
  assert.notEqual(CRITERIA_RESULT_STYLE.O, CRITERIA_RESULT_STYLE['?']);
  assert.notEqual(CRITERIA_RESULT_STYLE.X, CRITERIA_RESULT_STYLE['?']);
  const src = readFileSync(new URL('../components/DirectInputSection.tsx', import.meta.url), 'utf-8');
  assert.ok(src.includes('CRITERIA_RESULT_STYLE[result]'));
});
