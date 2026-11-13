import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_USER_PROFILE, POLICIES_DATA } from '../data/policies';
import { KOREA_REGIONS, formatSelectedRegion } from '../data/regions';
import { POLICY_CATEGORIES } from '../types/policy';
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

test('filterAndSortPolicies filters accurately by new 5 categories and recruitment status', () => {
  const financeOpen = filterAndSortPolicies(POLICIES_DATA, {
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

  const closedOnly = filterAndSortPolicies(POLICIES_DATA, {
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
