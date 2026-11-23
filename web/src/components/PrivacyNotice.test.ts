import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AI_COMPANY, PrivacyNotice, privacyItems } from './PrivacyNotice';

test('개인정보 안내: AI를 켰을 때만 보내는 항목과 받는 곳을 적음', () => {
  const live = privacyItems('live').join(' ');
  const example = privacyItems('example').join(' ');
  assert.ok(live.includes(AI_COMPANY) && live.includes('Supabase') && live.includes('나이대(5세 단위)'));
  assert.ok(!example.includes(AI_COMPANY));
  assert.ok(example.includes('외부로 보내지 않아요'));
  for (const items of [privacyItems('live'), privacyItems('example')]) {
    assert.ok(items[0].includes('브라우저에만 저장'));
    assert.ok(items[1].includes('새로고침하면 지워져요'));
  }
});

test('개인정보 안내는 처음에 접혀 있고 버튼으로 연다', () => {
  const html = renderToStaticMarkup(createElement(PrivacyNotice, { mode: 'example' }));
  assert.ok(html.includes('개인정보 처리 안내'));
  assert.ok(html.includes('aria-expanded="false"'));
  assert.ok(!html.includes('<ol'));
});
