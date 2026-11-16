import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_USER_PROFILE, INITIAL_WALLET_DOCS } from '../data/policies';
import { sanitizeProfile, sanitizeStringList, sanitizeWalletDocs } from './storedState';

test('형식이 다른 프로필 저장값은 기본값으로 대체 (빈 화면 방지)', () => {
  for (const bad of [null, {}, [], 'x', { age: 23, residence: '경기도' }, { ...DEFAULT_USER_PROFILE, status: '없는 상태' }, { ...DEFAULT_USER_PROFILE, interests: 'x' }]) {
    assert.deepEqual(sanitizeProfile(bad, DEFAULT_USER_PROFILE), DEFAULT_USER_PROFILE);
  }
});

test('올바른 프로필은 유지하고 모르는 관심 분야만 뺌', () => {
  const stored = { ...DEFAULT_USER_PROFILE, age: 25, interests: ['주거', '없는 분야'] };
  const result = sanitizeProfile(stored, DEFAULT_USER_PROFILE);
  assert.equal(result.age, 25);
  assert.deepEqual(result.interests, ['주거']);
});

test('저장 정책 목록은 문자열 배열만 인정', () => {
  assert.deepEqual(sanitizeStringList({}, ['1']), ['1']);
  assert.deepEqual(sanitizeStringList(['2', 3, null], ['1']), ['2']);
});

test('지갑 문서 저장값 검사와 이전 상태값 옮기기', () => {
  assert.deepEqual(sanitizeWalletDocs({}, INITIAL_WALLET_DOCS), INITIAL_WALLET_DOCS);
  assert.deepEqual(sanitizeWalletDocs([{ id: 'x' }], INITIAL_WALLET_DOCS), INITIAL_WALLET_DOCS);
  const legacy = INITIAL_WALLET_DOCS.map((d, i) =>
    i === 0 ? { ...d, status: '보관 완료', uploadedFileName: 'a.pdf' } : d
  );
  const result = sanitizeWalletDocs(legacy, INITIAL_WALLET_DOCS);
  assert.equal(result[0].status, '파일명 기록');
  assert.equal(result[0].uploadedFileName, 'a.pdf');
});
