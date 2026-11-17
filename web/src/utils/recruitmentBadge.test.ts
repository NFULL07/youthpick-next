import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_USER_PROFILE, POLICIES_DATA } from '../data/policies';
import { PolicyCard } from '../components/PolicyCard';
import type { PolicyItem } from '../types/policy';
import { recruitmentBadge, recruitmentTone, unmetCriteriaReasons } from './recruitmentBadge';

const noop = () => undefined;

function renderCard(policy: PolicyItem, unmetReasons: string[]): string {
  return renderToStaticMarkup(
    createElement(PolicyCard, {
      policy,
      isSaved: false,
      isCompared: false,
      unmetReasons,
      onToggleSave: noop,
      onToggleCompare: noop,
      onOpenDetail: noop,
    })
  );
}

test('모집 상태 상자 색: 모집 중 초록, 모집 중+조건 미충족 빨강, 마감 검정, 공고 확인 필요 노랑', () => {
  assert.equal(recruitmentTone('모집 중'), 'open');
  assert.equal(recruitmentTone('모집 중', true), 'open-unmet');
  assert.equal(recruitmentTone('마감'), 'closed');
  assert.equal(recruitmentTone('마감', true), 'closed'); // 마감이면 조건과 관계없이 검정
  assert.equal(recruitmentTone('공고 확인 필요'), 'check');
  assert.equal(recruitmentTone('공고 확인 필요', true), 'check'); // 모집 여부를 모르면 빨강으로 단정하지 않음

  assert.match(recruitmentBadge('모집 중').colorClass, /bg-\[#D8F279\]/);
  assert.match(recruitmentBadge('모집 중', true).colorClass, /bg-alert text-white/);
  assert.match(recruitmentBadge('마감').colorClass, /bg-\[#1F2421\] text-white/);
  assert.match(recruitmentBadge('공고 확인 필요').colorClass, /bg-\[#FFF0CC\]/);
  assert.equal(recruitmentBadge('모집 중', true).label, '모집 중 · 조건 미충족');
  assert.equal(recruitmentBadge('마감').label, '마감');
});

test('조건 미충족 이유는 X만 모으고 ?(미입력)는 넣지 않음', () => {
  const policy = POLICIES_DATA.find((p) => p.recruitmentStatus === '모집 중');
  assert.ok(policy);

  // 기본 프로필은 조건을 충족하거나 확인 필요라서 X가 없다
  assert.deepEqual(unmetCriteriaReasons(policy, DEFAULT_USER_PROFILE), []);

  // 나이를 범위 밖으로 바꾸면 X와 이유가 나온다
  const tooOld = { ...DEFAULT_USER_PROFILE, age: policy.maxAge + 5 };
  const reasons = unmetCriteriaReasons(policy, tooOld);
  assert.equal(reasons.length, 1);
  assert.match(reasons[0], /연령 범위 밖/);

  // 나이를 비우면(미입력) X가 아니라 ?라서 빨강 근거가 되지 않는다
  assert.deepEqual(unmetCriteriaReasons(policy, { ...DEFAULT_USER_PROFILE, age: 0 }), []);
});

test('정책 카드: 빨간 상자와 이유는 모집 중이면서 X가 있을 때만', () => {
  const open = POLICIES_DATA.find((p) => p.recruitmentStatus === '모집 중');
  const check = POLICIES_DATA.find((p) => p.recruitmentStatus === '공고 확인 필요');
  assert.ok(open && check);
  const reason = '입력한 만 40세가 공고 연령 범위 밖이에요.';

  const normal = renderCard(open, []);
  assert.ok(normal.includes('data-tone="open"'));
  assert.ok(!normal.includes(reason));

  const unmet = renderCard(open, [reason, '두 번째 이유']);
  assert.ok(unmet.includes('data-tone="open-unmet"'));
  assert.ok(unmet.includes('모집 중 · 조건 미충족'));
  assert.ok(unmet.includes(reason));
  assert.ok(unmet.includes('외 1건'));

  const closed = renderCard({ ...open, recruitmentStatus: '마감' }, [reason]);
  assert.ok(closed.includes('data-tone="closed"'));
  assert.ok(!closed.includes(reason)); // 마감은 검정 상자만, 이유는 적지 않음

  const unknown = renderCard(check, [reason]);
  assert.ok(unknown.includes('data-tone="check"'));
  assert.ok(unknown.includes('공고 확인 필요'));
});
