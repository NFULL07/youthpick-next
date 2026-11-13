import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_USER_PROFILE, POLICIES_DATA } from '../data/policies';
import { KOREA_REGIONS, formatSelectedRegion } from '../data/regions';
import { POLICY_CATEGORIES, PolicyItem, RecruitmentStatus } from '../types/policy';
import {
  analyzeLifeChangeImpacts,
  evaluatePolicyCriteria,
  filterAndSortPolicies,
} from './policyEngine';
import { generateDeterministicSherpaReply } from './sherpaEngine';

test('Ontong-Youth 5 policy categories are enforced', () => {
  assert.deepEqual([...POLICY_CATEGORIES], [
    '일자리',
    '주거',
    '교육·직업훈련',
    '금융·복지·문화',
    '참여·기반',
  ]);
});

// 필터 로직 검증용 고정 모집 상태. 실제 공고 상태가 아니다.
// 시연 예시 데이터는 모두 '공고 연결 후 확인'이라(리뷰 이슈 1), 필터 테스트는 이 입력값을 쓴다.
const FILTER_FIXTURE_STATUS: Record<string, RecruitmentStatus> = {
  '1': '모집 중',
  '2': '모집 중',
  '3': '공고 연결 후 확인',
  '4': '모집 중',
  '5': '모집 중',
  '6': '마감',
  '7': '모집 중',
  '8': '공고 연결 후 확인',
};
const FILTER_FIXTURE: PolicyItem[] = POLICIES_DATA.map((p) => ({
  ...p,
  recruitmentStatus: FILTER_FIXTURE_STATUS[p.id],
}));

test('filterAndSortPolicies filters accurately by new 5 categories and recruitment status', () => {
  const financeOpen = filterAndSortPolicies(FILTER_FIXTURE, {
    category: '금융·복지·문화',
    recruitmentStatus: '모집 중',
    searchQuery: '',
    sortBy: 'default',
  });
  assert.ok(financeOpen.length >= 2);
  assert.ok(
    financeOpen.every(
      (p) => p.category === '금융·복지·문화' && p.recruitmentStatus === '모집 중'
    )
  );

  const closedOnly = filterAndSortPolicies(FILTER_FIXTURE, {
    category: '전체',
    recruitmentStatus: '마감',
    searchQuery: '',
    sortBy: 'default',
  });
  assert.equal(closedOnly.length, 1);
  assert.equal(closedOnly[0].category, '참여·기반');
});

test('analyzeLifeChangeImpacts produces changed condition tags for life changes', () => {
  const impacts = analyzeLifeChangeImpacts(
    DEFAULT_USER_PROFILE,
    {
      residence: '충청남도 천안시',
      schoolRegion: '충청남도 천안시',
      academicStatus: '졸업',
      employmentStatus: '구직 중',
    },
    POLICIES_DATA
  );
  assert.ok(impacts.length > 0);
  const firstTags = impacts[0].changedTags;
  assert.ok(firstTags.some((t) => t.includes('거주지 변경')));
  assert.ok(firstTags.some((t) => t.includes('학적 변동')));
  assert.ok(firstTags.some((t) => t.includes('취업 상태')));
});

test('hierarchical Korean regions include 충청남도 -> 천안시 formatting', () => {
  const chungnam = KOREA_REGIONS.find((r) => r.sido === '충청남도');
  assert.ok(chungnam);
  assert.ok(chungnam.sigunguList.includes('천안시'));
  assert.equal(formatSelectedRegion('충청남도', '천안시'), '충청남도 천안시');
  assert.equal(formatSelectedRegion('경기도', '경기도 전체'), '경기도');
});

test('evaluatePolicyCriteria returns 4 structured criteria rows with user match data', () => {
  const rows = evaluatePolicyCriteria(POLICIES_DATA[0], DEFAULT_USER_PROFILE);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].item, '연령');
  assert.equal(rows[0].status, '충족 가능');
});

test('deterministic Sherpa engine replies without external AI API calls', () => {
  const reply = generateDeterministicSherpaReply('천안 대학생의 주거 조건이 궁금해요', {
    route: 'home',
    profile: DEFAULT_USER_PROFILE,
    policies: POLICIES_DATA,
  });
  assert.equal(reply.sender, 'assistant');
  assert.ok(reply.text.includes('천안시'));
  assert.equal(reply.targetRoute, 'switch');
});

test('example policies are marked as demo and do not state amount, schedule or recruitment status', () => {
  const amount = /\d[\d,]*\s*(만\s*)?원/;
  const anyDigit = /\d/;
  assert.equal(POLICIES_DATA.length, 8);
  for (const p of POLICIES_DATA) {
    assert.equal(p.isDemo, true, `${p.id} isDemo`);
    assert.equal(p.recruitmentStatus, '공고 연결 후 확인', `${p.id} recruitmentStatus`);
    assert.equal(p.deadlineLabel, '공고 연결 후 확인', `${p.id} deadlineLabel`);
    assert.ok(!amount.test(p.supportSummary), `${p.id} supportSummary has amount`);
    assert.ok(!anyDigit.test(p.deadlineLabel), `${p.id} deadlineLabel has date`);
  }
});

test('Sherpa does not repeat a fabricated status for a demo policy', () => {
  const reply = generateDeterministicSherpaReply('이 정책 조건 알려줘', {
    route: 'detail',
    profile: DEFAULT_USER_PROFILE,
    policies: POLICIES_DATA,
    selectedPolicy: POLICIES_DATA[0],
  });
  assert.ok(reply.text.includes('시연 예시'));
  assert.ok(!reply.text.includes('모집 중'));
});
