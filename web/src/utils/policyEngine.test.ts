import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_USER_PROFILE, POLICIES_DATA } from '../data/policies';
import { KOREA_REGIONS, formatSelectedRegion } from '../data/regions';
import { POLICY_CATEGORIES, PolicyItem, RecruitmentStatus } from '../types/policy';
import {
  analyzeLifeChangeImpacts,
  compareRegion,
  evaluatePolicyCriteria,
  filterAndSortPolicies,
  matchesRegion,
  parseRegion,
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

// 리뷰 이슈 3: 부분 문자열이 아니라 지역 목록 이름으로 정확히 비교
test('parseRegion accepts only exact sido or "sido sigungu" names', () => {
  assert.deepEqual(parseRegion('충청남도'), { sido: '충청남도', sigungu: null });
  assert.deepEqual(parseRegion(' 충청남도 천안시 '), { sido: '충청남도', sigungu: '천안시' });
  assert.equal(parseRegion(''), null);
  assert.equal(parseRegion('중구'), null);
  assert.equal(parseRegion('천안'), null);
  assert.equal(parseRegion('충청남도 천안시청'), null);
  assert.equal(parseRegion('충청남도 충청남도 전체'), null);
});

test('compareRegion does not match by substring', () => {
  // 이전에는 모두 true였던 경우
  assert.equal(compareRegion(['충청남도 천안시'], '충청남도'), 'unknown');
  assert.equal(compareRegion(['서울특별시 중구'], '중구'), 'unknown');
  assert.equal(compareRegion(['충청남도 천안시'], '충청남도 천안시청'), 'unknown');
  assert.equal(matchesRegion(['충청남도 천안시'], '충청남도'), false);

  assert.equal(compareRegion(['충청남도 천안시'], '충청남도 천안시'), 'match');
  assert.equal(compareRegion(['충청남도 천안시'], '충청남도 아산시'), 'mismatch');
  assert.equal(compareRegion(['충청남도'], '충청남도 아산시'), 'match');
  assert.equal(compareRegion(['경기도'], '경기도 광주시'), 'match');
  assert.equal(compareRegion(['광주광역시'], '경기도 광주시'), 'mismatch');
  assert.equal(compareRegion(['서울특별시 중구'], '인천광역시 중구'), 'mismatch');
  assert.equal(compareRegion(['전국'], '부산광역시'), 'match');
  assert.equal(compareRegion(['전국'], ''), 'unknown');
  assert.equal(compareRegion(['천안'], '충청남도 천안시'), 'unknown');
});

// 리뷰 이슈 4: 결과를 O / X / ?로 구분
function rowsByItem(policyId: string, profile: typeof DEFAULT_USER_PROFILE) {
  const policy = POLICIES_DATA.find((p) => p.id === policyId);
  assert.ok(policy);
  return Object.fromEntries(
    evaluatePolicyCriteria(policy, profile).map((r) => [r.item, r])
  );
}

test('evaluatePolicyCriteria returns X with a reason when a condition is clearly not met', () => {
  // 정책 8: 경기도, 만 24세~24세
  const rows = rowsByItem('8', {
    ...DEFAULT_USER_PROFILE,
    age: 40,
    status: '재직 중',
    residence: '부산광역시',
    schoolRegion: '부산광역시 해운대구',
    workRegion: '부산광역시',
  });
  assert.equal(rows['연령'].result, 'X');
  assert.equal(rows['연령'].status, '조건 불일치');
  assert.ok(rows['연령'].reason);
  assert.equal(rows['생활권 (거주·재학·근무)'].result, 'X');
  assert.ok(rows['생활권 (거주·재학·근무)'].reason);
  assert.equal(rows['학적·취업 상태'].result, 'O');
  assert.equal(rows['소득·제출 서류'].result, '?');

  // 정책 2 참여 대상: 졸업, 구직 중, 휴학
  assert.equal(rowsByItem('2', { ...DEFAULT_USER_PROFILE, status: '창업' })['학적·취업 상태'].result, 'X');
});

test('missing or partial region input stays ? instead of X', () => {
  const empty = rowsByItem('6', { ...DEFAULT_USER_PROFILE, residence: '', schoolRegion: '', workRegion: '' });
  assert.equal(empty['생활권 (거주·재학·근무)'].result, '?');

  // 거주지만 불일치, 학교·근무 미입력 -> X로 단정하지 않음
  const partial = rowsByItem('6', { ...DEFAULT_USER_PROFILE, residence: '서울특별시', schoolRegion: '', workRegion: '' });
  assert.equal(partial['생활권 (거주·재학·근무)'].result, '?');
  assert.equal(partial['생활권 (거주·재학·근무)'].reason, undefined);

  // 시·군 미선택(충청남도)은 천안시만 인정하는 정책에서 X가 아니라 ?
  const cheonanOnly = { ...POLICIES_DATA[0], targetRegions: ['충청남도 천안시'] };
  const sidoOnly = evaluatePolicyCriteria(cheonanOnly, {
    ...DEFAULT_USER_PROFILE,
    residence: '충청남도',
    schoolRegion: '서울특별시 강남구',
    workRegion: '서울특별시 강남구',
  });
  assert.equal(sidoOnly[1].result, '?');
});

test('evaluatePolicyCriteria uses all three results and keeps income/docs as ?', () => {
  const seen = new Set<string>();
  for (const p of POLICIES_DATA) {
    for (const age of [10, 23, 50]) {
      for (const region of ['', '부산광역시', '경기도']) {
        const rows = evaluatePolicyCriteria(p, {
          ...DEFAULT_USER_PROFILE,
          age,
          residence: region,
          schoolRegion: region,
          workRegion: region,
        });
        rows.forEach((r) => seen.add(r.result));
        assert.equal(rows[3].result, '?');
      }
    }
  }
  assert.deepEqual([...seen].sort(), ['?', 'O', 'X']);
});
