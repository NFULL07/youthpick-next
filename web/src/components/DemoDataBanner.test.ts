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
