import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEMO_DATA_NOTICE, DemoDataBanner } from './DemoDataBanner';

test('demo data banner renders the notice as a labelled note', () => {
  const html = renderToStaticMarkup(createElement(DemoDataBanner));
  assert.equal(DEMO_DATA_NOTICE, '시연용 예시 데이터입니다. 실제 공고는 연결 후 표시됩니다.');
  assert.ok(html.includes(DEMO_DATA_NOTICE));
  assert.ok(html.includes('role="note"'));
});

test('data banner shows the given notice instead of the demo notice', () => {
  const html = renderToStaticMarkup(createElement(DemoDataBanner, { notice: '정책 7건으로 시범 운영 중이에요.' }));
  assert.ok(html.includes('정책 7건으로 시범 운영 중이에요.'));
  assert.ok(!html.includes(DEMO_DATA_NOTICE));
  assert.ok(!html.includes('aria-expanded'), '설명이 없으면 접기 버튼도 없음');
});

test('설명이 있으면 처음엔 접혀 있고 \'자세히\'로 펼침', () => {
  const props = { notice: '정책 7건으로 시범 운영 중이에요.', detail: '자동 갱신할 예정이에요.' };
  const closed = renderToStaticMarkup(createElement(DemoDataBanner, props));
  assert.ok(closed.includes('정책 7건으로 시범 운영 중이에요.'));
  assert.ok(closed.includes('aria-expanded="false"') && closed.includes('자세히'));
  assert.match(closed, /<p[^>]*hidden=""[^>]*>자동 갱신할 예정이에요\.<\/p>/, '접힌 동안 설명은 숨김');
  const open = renderToStaticMarkup(createElement(DemoDataBanner, { ...props, defaultOpen: true }));
  assert.ok(open.includes('aria-expanded="true"') && open.includes('접기'));
  assert.match(open, /<p(?![^>]*hidden)[^>]*>자동 갱신할 예정이에요\.<\/p>/, '펼치면 설명이 보임');
  const id = /aria-controls="([^"]+)"/.exec(open)?.[1];
  assert.ok(id && open.includes(`id="${id}"`), '버튼이 설명 칸을 가리킴');
});
