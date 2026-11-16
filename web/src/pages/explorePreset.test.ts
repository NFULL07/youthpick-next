import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_USER_PROFILE, POLICIES_DATA } from '../data/policies';
import { ExplorePreset } from '../types/policy';
import { PoliciesExplorePage } from './PoliciesExplorePage';

function renderExplore(preset: ExplorePreset | null) {
  const noop = () => undefined;
  return renderToStaticMarkup(
    createElement(PoliciesExplorePage, {
      profile: DEFAULT_USER_PROFILE,
      policies: POLICIES_DATA,
      savedIds: [],
      comparePolicyIds: [],
      prepPolicyIds: [],
      preset,
      onNavigate: noop,
      onToggleSave: noop,
      onToggleCompare: noop,
      onClearCompare: noop,
      onStartPreparation: noop,
      onOpenSherpaWithPrompt: noop,
    })
  );
}

test('홈에서 분야를 고르고 넘어오면 정책 찾기가 그 분야로 시작함', () => {
  const expected = POLICIES_DATA.filter((p) => p.category === '주거').length;
  const html = renderExplore({ category: '주거' });
  assert.ok(html.includes(`찾은 정책 ${expected}개`));
  assert.ok(/aria-pressed="true"[^>]*>주거</.test(html));
});

test('홈에서 검색어를 넣고 넘어오면 검색창에 그대로 들어감', () => {
  const html = renderExplore({ query: '취업' });
  assert.ok(html.includes('value="취업"'));
});

test('미리 채울 조건이 없으면 전체 정책으로 시작함', () => {
  const html = renderExplore(null);
  assert.ok(html.includes(`찾은 정책 ${POLICIES_DATA.length}개`));
  assert.ok(/aria-pressed="true"[^>]*>전체</.test(html));
});
