import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_USER_PROFILE, POLICIES_DATA } from '../data/policies';
import { KOREA_REGIONS, formatSelectedRegion } from '../data/regions';
import { POLICY_CATEGORIES } from '../types/policy';
import {
  analyzeLifeChangeImpacts,
  clearCompareIdsForTab,
  compareRegion,
  countCheckedPrepPolicies,
  evaluatePolicyCriteria,
  filterAndSortPolicies,
  getComparedPoliciesForTab,
  matchesRegion,
  paginatePolicies,
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

test('전남광주통합특별시 unifies 광주광역시 5구 and 전라남도 22시군', () => {
  assert.equal(KOREA_REGIONS.find((r) => r.sido === '광주광역시'), undefined);
  assert.equal(KOREA_REGIONS.find((r) => r.sido === '전라남도'), undefined);
  const unified = KOREA_REGIONS.find((r) => r.sido === '전남광주통합특별시');
  assert.ok(unified);
  const expectedDistricts = [
    '전남광주통합특별시 전체',
    '동구', '서구', '남구', '북구', '광산구',
    '목포시', '여수시', '순천시', '나주시', '광양시',
    '담양군', '곡성군', '구례군', '고흥군', '보성군',
    '화순군', '장흥군', '강진군', '해남군', '영암군',
    '무안군', '함평군', '영광군', '장성군', '완도군',
    '진도군', '신안군',
  ];
  assert.deepEqual(unified.sigunguList, expectedDistricts);
  assert.deepEqual(parseRegion('전남광주통합특별시 광산구'), {
    sido: '전남광주통합특별시',
    sigungu: '광산구',
  });
  assert.equal(compareRegion(['전남광주통합특별시'], '전남광주통합특별시 신안군'), 'match');
  assert.equal(compareRegion(['전남광주통합특별시'], '전라남도 여수시'), 'match');
  assert.equal(compareRegion(['광주광역시'], '전남광주통합특별시 동구'), 'match');
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

test('countCheckedPrepPolicies counts policies with at least 1 checked item', () => {
  const p1 = POLICIES_DATA[0];
  const p2 = POLICIES_DATA[1];
  assert.equal(countCheckedPrepPolicies([], []), 0);
  assert.equal(countCheckedPrepPolicies([p1, p2], []), 0);

  // 정책 A에서 3개 체크 -> 배지 1
  const p1All = p1.checklist.map((c) => c.id);
  assert.equal(countCheckedPrepPolicies([p1, p2], p1All), 1);

  // 정책 A에서 3개 + 정책 B에서 1개 -> 배지 2
  assert.equal(
    countCheckedPrepPolicies([p1, p2], [...p1All, p2.checklist[0].id]),
    2
  );

  // 정책 A 모두 해제 시 -> 배지 1
  assert.equal(countCheckedPrepPolicies([p1, p2], [p2.checklist[0].id]), 1);

  // 준비 목록에서 빠진 정책의 체크 ID는 무시
  assert.equal(countCheckedPrepPolicies([p2], p1All), 0);
});

test('paginatePolicies slices into 10-item pages and clamps out-of-range pages', () => {
  const sample = Array.from({ length: 23 }, (_, i) => i + 1);
  const page1 = paginatePolicies(sample, 1, 10);
  assert.equal(page1.totalPages, 3);
  assert.equal(page1.currentPage, 1);
  assert.deepEqual(page1.items, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  const page2 = paginatePolicies(sample, 2, 10);
  assert.equal(page2.currentPage, 2);
  assert.deepEqual(page2.items, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);

  const page3 = paginatePolicies(sample, 3, 10);
  assert.equal(page3.currentPage, 3);
  assert.deepEqual(page3.items, [21, 22, 23]);

  const overflow = paginatePolicies(sample, 99, 10);
  assert.equal(overflow.currentPage, 3);
  assert.deepEqual(overflow.items, [21, 22, 23]);

  const empty = paginatePolicies([], 2, 10);
  assert.equal(empty.totalPages, 1);
  assert.equal(empty.currentPage, 1);
  assert.deepEqual(empty.items, []);
});

test('getComparedPoliciesForTab and clearCompareIdsForTab scope compare bar & clearing to active tab pool', () => {
  const boardPolicies = POLICIES_DATA.slice(0, 3); // ids 1, 2, 3
  const explorePolicies = POLICIES_DATA; // ids 1..8
  const globalIds = ['1', '4', '5'];

  // 보드 탭에는 1만 노출되므로 보드 비교 목록은 [1]
  const boardMatched = getComparedPoliciesForTab(boardPolicies, globalIds);
  assert.deepEqual(
    boardMatched.map((p) => p.id),
    ['1']
  );

  // 정책 찾기 탭에는 1, 4, 5 모두 노출되므로 [1, 4, 5]
  const exploreMatched = getComparedPoliciesForTab(explorePolicies, globalIds);
  assert.deepEqual(
    exploreMatched.map((p) => p.id),
    ['1', '4', '5']
  );

  // 보드 탭에서 선택 비우기를 누르면 보드 풀(1,2,3)에 속한 '1'만 제거되고 '4', '5'는 유지
  const afterBoardClear = clearCompareIdsForTab(globalIds, boardPolicies);
  assert.deepEqual(afterBoardClear, ['4', '5']);
  assert.equal(getComparedPoliciesForTab(boardPolicies, afterBoardClear).length, 0);
  assert.deepEqual(
    getComparedPoliciesForTab(explorePolicies, afterBoardClear).map((p) => p.id),
    ['4', '5']
  );

  // 정책 찾기 탭에서 선택 비우기를 누르면 전체 풀 제거
  const afterExploreClear = clearCompareIdsForTab(afterBoardClear, explorePolicies);
  assert.deepEqual(afterExploreClear, []);
});


