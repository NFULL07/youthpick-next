import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DirectInputSection } from '../components/DirectInputSection';
import { DEFAULT_USER_PROFILE } from './policies';
import { getDirectInputItemsForPolicy, getDirectInputResult, getDocsForItem, getInputSpec } from '../utils/directInput';
import { analyzeLifeChangeImpacts, evaluatePolicyCriteria, getRecommendedPoliciesForProfile } from '../utils/policyEngine';
import { buildPolicies, buildRegionNames, noticeStatus, toDateKey } from './catalogBuilder';
import { PolicyDetailPage } from '../pages/PolicyDetailPage';
import { pickHousingCheckPolicy } from '../pages/HomeBoardPage';
import { safeLinkUrl, uniqueLinks } from '../utils/officialLinks';
import type { CatalogRows, NoticeRow } from './catalogTypes';

/**
 * 시험용 행: 테스트 PostgreSQL에 마이그레이션·적재 스크립트를 적용한 뒤 anon 권한으로 읽은 것.
 * 판정 규칙·관계의 내용은 실제 공고가 아니라 시험용 값이다(근거 문구가 '[시험용]'으로 시작).
 */
function fixture(): CatalogRows {
  const raw = readFileSync(new URL('./__fixtures__/catalogRows.fixture.json', import.meta.url), 'utf-8');
  return JSON.parse(raw) as CatalogRows;
}

const NOW = new Date('2026-11-17T05:00:00Z');
const build = (rows = fixture()) => buildPolicies(rows, NOW);
const find = (id: string, rows = fixture()) => {
  const policy = build(rows).policies.find((p) => p.id === id);
  assert.ok(policy, id);
  return policy;
};

test('1차안 정책만 정책ID 순서로 보여 주고, 통계를 만든다', () => {
  const { policies, stats } = build();
  assert.deepEqual(policies.map((p) => p.id), ['A3', 'B4', 'C1', 'C3', 'D1', 'D2', 'E4']); // 예비 X1, 제외 Z1은 빠짐
  assert.ok(policies.every((p) => p.dataSource === 'supabase' && p.ruleSet));
  assert.deepEqual(stats, { policyCount: 7, reviewedRuleCount: 13, relationCount: 2, collectedOn: '2026-11-09' });
  assert.equal(policies[0].pickNumber, 'PICK 01');
});

test('정책 카드의 글은 정책후보표 값을 그대로 쓰고, 없으면 공고 확인으로 둔다', () => {
  const rows = fixture();
  const c1 = find('C1', rows);
  const source = rows.policy.find((p) => p.id === 'C1')!;
  assert.equal(c1.title, source.name);
  assert.equal(c1.supportSummary, source.benefit_text);
  assert.equal(c1.shortDescription, source.target_summary);
  assert.equal(c1.category, '주거');
  assert.deepEqual(c1.requiredDocs, ['주민등록표 등본', '임대차계약서 사본']);
  assert.deepEqual(find('B4').requiredDocs, ['공고에서 확인']);

  const bare = fixture();
  Object.assign(bare.policy.find((p) => p.id === 'B4')!, { agency: null, target_summary: null, benefit_text: null, residence_requirement: null });
  const b4 = find('B4', bare);
  assert.ok(b4.supportSummary.includes('공고에서 확인'));
  assert.ok(b4.shortDescription.includes('공고에서 확인'));
  assert.ok(b4.keyCheckHint.includes('공고에서 확인'));
});

test('모집 상태: 원문 기준 상태가 우선, 접수중은 종료일이 지나면 마감, 모르면 공고 확인 필요', () => {
  assert.equal(find('C1').recruitmentStatus, '마감');
  assert.equal(find('D1').recruitmentStatus, '모집 중'); // 상시·수시
  assert.equal(find('A3').recruitmentStatus, '공고 확인 필요'); // 미확인
  const d2 = find('D2'); // 2025년 레코드만 있음
  assert.equal(d2.recruitmentStatus, '공고 확인 필요');
  assert.ok(d2.deadlineLabel.startsWith('2026년 운영 여부 미확인'));

  const open = { apply_status_original: '접수중', apply_end: '2026-11-17', current_year_unconfirmed: false } as NoticeRow;
  assert.equal(noticeStatus(open, '2026-11-17'), '모집 중');
  assert.equal(noticeStatus(open, '2026-11-18'), '마감');
  assert.equal(noticeStatus({ ...open, apply_status_original: null }, '2026-11-17'), '공고 확인 필요');
  assert.equal(noticeStatus({ ...open, apply_status_original: '접수중 가능(확인 필요)' }, '2026-11-17'), '공고 확인 필요');
  assert.equal(toDateKey(new Date('2026-11-17T16:00:00Z')), '2026-11-18'); // 한국 시간
});

test('검수 완료 규칙이 있는 공고가 대표 공고가 되고, 조건표가 규칙으로 계산된다', () => {
  const c1 = find('C1');
  assert.equal(c1.ruleSet!.rules.length, 5);
  const rows = evaluatePolicyCriteria(c1, DEFAULT_USER_PROFILE); // 만 23세
  const byItem = new Map(rows.map((r) => [r.item, r]));
  assert.equal(byItem.get('연령')?.result, 'O');
  assert.equal(byItem.get('월세액')?.result, '?'); // 미입력은 X가 아니다
  assert.ok(byItem.get('월세액')?.userMatchNote.includes('직접 입력'));
  assert.equal(byItem.get('제출 서류')?.result, '?');
  const together = rows.find((r) => r.item.startsWith('함께 받기'));
  assert.ok(together && together.officialRule.startsWith('병행 제한') && together.result === '?');
  assert.ok(together.basis.includes('[시험용]'));

  const old = evaluatePolicyCriteria(c1, { ...DEFAULT_USER_PROFILE, age: 40 });
  const ageRow = old.find((r) => r.item === '연령')!;
  assert.equal(ageRow.result, 'X');
  assert.equal(ageRow.reason, '만 19~34세만 신청할 수 있어요.');
});

test('생활권 묶음: 주민등록 또는 재학 중 하나만 맞으면 O', () => {
  const e4 = find('E4'); // 시험용 규칙: 아산시 주민등록 또는 아산시 소재 대학 재학
  const first = (profile: typeof DEFAULT_USER_PROFILE) => evaluatePolicyCriteria(e4, profile)[0];
  assert.equal(first(DEFAULT_USER_PROFILE).result, 'X'); // 경기도 거주, 천안 재학
  assert.equal(first({ ...DEFAULT_USER_PROFILE, schoolRegion: '충청남도 아산시' }).result, 'O');
  assert.equal(first({ ...DEFAULT_USER_PROFILE, residence: '충청남도 아산시' }).result, 'O');
  assert.equal(first({ ...DEFAULT_USER_PROFILE, schoolRegion: '' }).result, '?'); // 학교 미입력
});

test('규칙이 없는 정책은 ?로만 보여 주고 API 값은 참고로 붙인다', () => {
  const b4 = evaluatePolicyCriteria(find('B4'), DEFAULT_USER_PROFILE); // API에 없는 정책
  assert.deepEqual(b4.map((r) => [r.item, r.result]), [['판정 규칙', '?']]);
  const a3 = evaluatePolicyCriteria(find('A3'), { ...DEFAULT_USER_PROFILE, age: 50 });
  const hint = a3.find((r) => r.item === '연령 (API 참고)');
  assert.ok(hint && hint.result === '?' && hint.officialRule === '만 19~39세');
  assert.ok(a3.every((r) => r.result !== 'X' || !r.item.includes('API')));
});

test('초안·알 수 없는 연산자·수집 제외 항목 규칙은 화면 데이터에 들어오지 않는다', () => {
  const rows = fixture();
  const base = rows.eligibility_rule.find((r) => r.rule_key === 'age')!;
  rows.eligibility_rule.push(
    { ...base, id: 9001, rule_key: 'draft', review_status: 'draft' },
    { ...base, id: 9002, rule_key: 'weird', operator: 'matches' },
    { ...base, id: 9003, rule_key: 'rrn', field_id: 'resident_registration_number', operator: 'eq', value: 'x' },
    { ...base, id: 9004, rule_key: 'ghost', field_id: 'no_such_field' }
  );
  rows.policy_relationship.push({ ...rows.policy_relationship[0], id: 9005, review_status: 'draft', relation: '병행 가능' });
  const c1 = find('C1', rows);
  assert.deepEqual(c1.ruleSet!.rules.map((r) => r.ruleKey).sort(), ['age', 'income', 'no_house', 'rent', 'separate']);
  assert.deepEqual(c1.ruleSet!.relations.map((r) => r.relation), ['병행 제한']);
});

test('직접 입력 항목: 내 정보로 채울 수 없는 규칙 항목만, 서류 안내와 함께', () => {
  const c1 = find('C1');
  const items = getDirectInputItemsForPolicy(c1);
  assert.deepEqual(items.map((i) => i.fieldId), ['independent_residence', 'homeownership_status', 'monthly_rent_amount', 'household_income_amount']);
  const rent = items.find((i) => i.fieldId === 'monthly_rent_amount')!;
  assert.equal(rent.number, 44); // 확인서류표의 직접 입력 항목을 그대로 쓴다
  assert.deepEqual(getDocsForItem(rent).map((d) => d.id), ['D25', 'D26']);
  assert.deepEqual(getInputSpec(rent)?.kind, 'number');
  assert.equal(getDirectInputResult('', rent).result, '?');
  assert.equal(getDirectInputResult('600000', rent).result, 'O');
  assert.deepEqual(getDirectInputResult('800000', rent), { result: 'X', label: '월세가 70만 원을 넘어요.' });

  const separate = items.find((i) => i.fieldId === 'independent_residence')!;
  assert.equal(separate.label, '부모와 별도 거주 여부');
  assert.ok(separate.docsLabel.length > 0 && getDocsForItem(separate).length > 0);
  const spec = getInputSpec(separate);
  assert.deepEqual(spec?.kind === 'select' && spec.options, ['예', '아니오', '모름']);
  assert.equal(spec?.hint, '부모와 따로 살고 있나요?');

  const house = getInputSpec(items.find((i) => i.fieldId === 'homeownership_status')!);
  assert.deepEqual(house?.kind === 'select' && house.options, ['무주택', '주택 소유(분양권·입주권 포함)', '모름']);

  const html = renderToStaticMarkup(createElement(DirectInputSection, { policy: c1 }));
  assert.ok(html.includes('부모와 따로 살고 있나요?'));
  assert.ok(html.includes('입력한 값은 저장되지 않아요'));
  assert.equal(renderToStaticMarkup(createElement(DirectInputSection, { policy: find('B4') })), '');
});

test('지역 코드 이름: 자치구는 상위 시 이름으로', () => {
  assert.deepEqual(buildRegionNames(fixture().region), {
    '44': '충청남도',
    '44130': '충청남도 천안시',
    '44131': '충청남도 천안시',
    '44133': '충청남도 천안시',
    '44200': '충청남도 아산시',
  });
  assert.deepEqual(buildRegionNames([{ code: '99999', name: '고아', parent_code: '00', level: '시군구' }]), {});
});

test('생활변화와 추천도 Supabase 정책에서 동작한다', () => {
  const { policies } = build();
  const impacts = analyzeLifeChangeImpacts(
    DEFAULT_USER_PROFILE,
    { residence: '충청남도 아산시', schoolRegion: '충청남도 천안시', academicStatus: '대학 재학', employmentStatus: '확인 전' },
    policies
  );
  // 판정이 달라지는 정책이 먼저 온다(충남 주민등록이 필요한 C3, 아산 생활권이 필요한 E4)
  assert.deepEqual(impacts.slice(0, 2).map((i) => i.policy.id), ['C3', 'E4']);
  assert.deepEqual(impacts[0].changedTags, ['주민등록 시·도: X → O']);
  assert.deepEqual(impacts[1].changedTags, ['주민등록 시·군 / 소속 캠퍼스: X → O']);
  assert.ok(impacts.slice(0, 2).every((i) => i.impactTone === 'positive'));
  assert.equal(impacts.length, 5);
  const last = impacts[impacts.length - 1];
  assert.ok(last.impactSummary.includes('검수한 판정 규칙이 아직 없어') || last.policy.ruleSet!.rules.length > 0);
  assert.ok(impacts.every((i) => !i.impactSummary.includes('우선 지원') && !i.impactSummary.includes('연계 가능')));
  assert.equal(getRecommendedPoliciesForProfile(policies, DEFAULT_USER_PROFILE, 3).length, 3);
});

test('공식 링크: 대표 공고의 신청·안내 주소가 먼저, 그다음 검수 규칙의 근거 원문. http(s)만, 같은 주소는 한 번만 (2026-11-24 점검)', () => {
  const rows = fixture();
  const built = find('C1', rows);
  // 대표 공고를 찾아 주소를 넣는다
  const notice = rows.policy_notice.filter((n) => n.policy_id === 'C1');
  for (const n of notice) Object.assign(n, { apply_url: 'https://apply.example.go.kr/c1', ref_url: 'javascript:alert(1)' });
  const c1 = find('C1', rows);
  assert.equal(c1.officialLinks![0].label, '신청 페이지');
  assert.equal(c1.officialLinks![0].url, 'https://apply.example.go.kr/c1');
  assert.ok(c1.officialLinks!.every((l) => /^https?:/.test(l.url)), 'javascript: 주소는 버림');
  const ruleUrls = c1.ruleSet!.rules.map((r) => r.sourceUrl).filter(Boolean);
  if (ruleUrls.length > 0) assert.ok(c1.officialLinks!.some((l) => l.url === new URL(ruleUrls[0]!).toString()), '근거 원문도 링크로');
  assert.ok(built.officialLinks, '주소가 없어도 목록은 있음(빈 목록 또는 근거 원문)');

  assert.equal(safeLinkUrl('javascript:alert(1)'), null);
  assert.equal(safeLinkUrl('data:text/html,x'), null);
  assert.equal(safeLinkUrl('/relative'), null);
  assert.equal(safeLinkUrl(''), null);
  assert.equal(safeLinkUrl('https://a.example.org/x'), 'https://a.example.org/x');
  assert.deepEqual(
    uniqueLinks([{ label: 'a', url: 'https://a.example.org' }, { label: 'b', url: 'https://a.example.org' }, { label: 'c', url: null }]).map((l) => l.label),
    ['a']
  );
});

test('정책 상세: 공식 안내 링크(새 창), 조건표 근거 원문 링크, 휴대폰용 카드 목록 (2026-11-24 점검)', () => {
  const rows = fixture();
  for (const n of rows.policy_notice.filter((n) => n.policy_id === 'C1')) Object.assign(n, { apply_url: 'https://apply.example.go.kr/c1' });
  const c1 = find('C1', rows);
  const html = renderToStaticMarkup(
    createElement(PolicyDetailPage, {
      policy: c1,
      profile: DEFAULT_USER_PROFILE,
      isSaved: false,
      onToggleSave: () => {},
      onNavigate: () => {},
      onStartPreparation: () => {},
      onAskSherpaAboutPolicy: () => {},
    })
  );
  assert.ok(html.includes('공식 안내 (새 창)'));
  assert.match(html, /<a href="https:\/\/apply\.example\.go\.kr\/c1" target="_blank" rel="noopener noreferrer"/);
  // 휴대폰(md 미만)은 카드 목록, 표는 md 이상에서만
  assert.match(html, /<ul class="space-y-3 md:hidden" aria-label="공고 기준과 나의 조건">/);
  assert.match(html, /class="hidden overflow-x-auto[^"]*md:block"/);
  const cards = html.split('md:hidden" aria-label="공고 기준과 나의 조건">')[1].split('</ul>')[0];
  assert.ok(/충족 가능|조건 불일치|추가 확인/.test(cards), '카드 안에 확인 결과가 보임');
  // 공식 링크가 없으면 안내 문구
  const bare = { ...c1, officialLinks: [] };
  const html2 = renderToStaticMarkup(createElement(PolicyDetailPage, {
    policy: bare, profile: DEFAULT_USER_PROFILE, isSaved: false,
    onToggleSave: () => {}, onNavigate: () => {}, onStartPreparation: () => {}, onAskSherpaAboutPolicy: () => {},
  }));
  assert.ok(html2.includes('등록된 공식 링크가 아직 없어요'));
});

test('나의 보드 "주거 지원, 내 생활권도 인정될까?": 지역 조건 규칙이 있는 주거 정책을 연다(시연 id 1 고정 버그)', () => {
  const policies = build().policies;
  const picked = pickHousingCheckPolicy(policies);
  assert.ok(picked);
  assert.equal(picked.category, '주거');
  const housing = policies.filter((p) => p.category === '주거');
  const withRegion = housing.filter((p) => (p.ruleSet?.rules ?? []).some((r) => r.operator === 'region_in'));
  if (withRegion.length > 0) assert.ok(withRegion.includes(picked));
  assert.equal(pickHousingCheckPolicy(policies.filter((p) => p.category !== '주거')), undefined, '주거 정책이 없으면 undefined');
  const home = readFileSync(new URL('../pages/HomeBoardPage.tsx', import.meta.url), 'utf-8');
  assert.ok(!home.includes("onNavigate('detail', '1')"));
});
