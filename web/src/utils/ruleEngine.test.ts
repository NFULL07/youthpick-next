import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_USER_PROFILE } from '../data/policies';
import type { LifeChangeScenario, PolicyItem } from '../types/policy';
import {
  analyzeRuleChange,
  buildCriteriaRows,
  evaluateFieldInput,
  evaluateRule,
  evaluateRuleRows,
  inputSpecForRules,
  parseRawInput,
  profileToInputs,
  scenarioToInputs,
} from './ruleEngine';
import { inputKeyOf, type EligibilityRule, type PolicyRuleSet, type RuleInput } from './ruleTypes';

const REGIONS: Record<string, string> = {
  '44': '충청남도',
  '44130': '충청남도 천안시',
  '44131': '충청남도 천안시',
  '44133': '충청남도 천안시',
  '44200': '충청남도 아산시',
};

let nextId = 1;
function rule(over: Partial<EligibilityRule>): EligibilityRule {
  return {
    id: nextId++,
    ruleKey: 'r',
    fieldId: 'birth_year',
    fieldName: '출생연도',
    operator: 'age_between',
    value: { min: 19, max: 34 },
    anyOfGroup: null,
    label: '만 19~34세',
    failReason: null,
    question: null,
    choices: null,
    unit: null,
    sortOrder: 0,
    sourceQuote: '시험용 인용',
    sourceLocator: '2쪽',
    sourceTitle: '시험용 공고',
    sourceUrl: 'https://example.org/notice',
    ...over,
  };
}

function ruleSet(over: Partial<PolicyRuleSet>): PolicyRuleSet {
  return {
    noticeTitle: '시험용 공고',
    rules: [],
    relations: [],
    apiHints: [],
    documentNames: [],
    regionNames: REGIONS,
    inputItems: [],
    ...over,
  };
}

const age = (min: number, max = min): RuleInput => ({ kind: 'age', min, max });

test('미입력과 모름은 어떤 연산자에서도 X가 아니라 ?', () => {
  const rules = [
    rule({}),
    rule({ operator: 'between', value: { min: 1, max: 5 } }),
    rule({ operator: 'gte', value: 3 }),
    rule({ operator: 'lte', value: 3 }),
    rule({ operator: 'eq', value: '재학' }),
    rule({ operator: 'in', value: ['재학'] }),
    rule({ operator: 'not_in', value: ['재학'] }),
    rule({ operator: 'region_in', value: ['44130'] }),
    rule({ operator: 'is_true', value: null }),
    rule({ operator: 'is_false', value: null }),
  ];
  for (const r of rules) {
    assert.equal(evaluateRule(r, undefined, REGIONS).result, '?', r.operator);
    assert.equal(evaluateRule(r, undefined, REGIONS).note, '미입력');
    assert.equal(evaluateRule(r, { kind: 'unknown' }, REGIONS).result, '?', r.operator);
  }
});

test('판정할 수 없는 형식의 값은 X로 만들지 않고 ?', () => {
  assert.equal(evaluateRule(rule({ operator: 'gte', value: 3 }), { kind: 'text', value: '많음' }).result, '?');
  assert.equal(evaluateRule(rule({ operator: 'in', value: ['재학'] }), { kind: 'number', value: 1 }).result, '?');
  assert.equal(evaluateRule(rule({ operator: 'is_true', value: null }), { kind: 'text', value: '예' }).result, '?');
  // 값 모양이 깨진 규칙도 X를 만들지 않는다
  assert.equal(evaluateRule(rule({ value: 'broken' }), age(23)).result, '?');
  assert.equal(evaluateRule(rule({ operator: 'in', value: 'broken' }), { kind: 'text', value: '재학' }).result, '?');
});

test('나이: 범위 안 O, 밖 X(이유 포함), 출생연도만 알아 경계에 걸리면 ?', () => {
  const r = rule({});
  assert.equal(evaluateRule(r, age(23)).result, 'O');
  const out = evaluateRule(r, age(35));
  assert.equal(out.result, 'X');
  assert.ok(out.reason && out.reason.includes('35'));
  assert.equal(evaluateRule(r, age(33, 34)).result, 'O');
  assert.equal(evaluateRule(r, age(34, 35)).result, '?'); // 생일 전이면 34, 지나면 35
  assert.equal(evaluateRule(r, age(18, 19)).result, '?');
  assert.equal(evaluateRule(r, age(35, 36)).result, 'X');
  assert.equal(evaluateRule(rule({ value: { max: 35 } }), age(12)).result, 'O'); // 하한 없음
  assert.equal(evaluateRule(rule({ failReason: '만 19~34세만 신청할 수 있어요.' }), age(40)).reason, '만 19~34세만 신청할 수 있어요.');
});

test('숫자·선택·예아니오 연산자', () => {
  const n = (value: number): RuleInput => ({ kind: 'number', value });
  const t = (value: string): RuleInput => ({ kind: 'text', value });
  assert.equal(evaluateRule(rule({ operator: 'lte', value: 700000, unit: '원' }), n(600000)).result, 'O');
  const over = evaluateRule(rule({ operator: 'lte', value: 700000, unit: '원', label: '월세 70만 원 이하' }), n(800000));
  assert.equal(over.result, 'X');
  assert.equal(over.note, '800,000원');
  assert.ok(over.reason?.includes('월세 70만 원 이하'));
  assert.equal(evaluateRule(rule({ operator: 'gte', value: 12 }), n(12)).result, 'O');
  assert.equal(evaluateRule(rule({ operator: 'between', value: { min: 1, max: 8 } }), n(9)).result, 'X');
  assert.equal(evaluateRule(rule({ operator: 'in', value: ['재학', '휴학'] }), t('휴학')).result, 'O');
  assert.equal(evaluateRule(rule({ operator: 'in', value: ['재학', '휴학'] }), t('졸업')).result, 'X');
  assert.equal(evaluateRule(rule({ operator: 'not_in', value: ['참여·수급 중'] }), t('해당 없음')).result, 'O');
  assert.equal(evaluateRule(rule({ operator: 'not_in', value: ['참여·수급 중'] }), t('참여·수급 중')).result, 'X');
  assert.equal(evaluateRule(rule({ operator: 'eq', value: '무주택' }), t('무주택')).result, 'O');
  assert.equal(evaluateRule(rule({ operator: 'is_true', value: null }), { kind: 'boolean', value: true }).result, 'O');
  assert.equal(evaluateRule(rule({ operator: 'is_true', value: null }), { kind: 'boolean', value: false }).result, 'X');
  assert.equal(evaluateRule(rule({ operator: 'is_false', value: null }), { kind: 'boolean', value: false }).result, 'O');
});

test('지역: 코드를 이름으로 풀어 정확히 대조하고, 시·군 미선택이나 모르는 코드는 ?', () => {
  const cheonan = rule({ operator: 'region_in', value: ['44130', '44131', '44133'], fieldId: 'registered_city_code' });
  const region = (value: string): RuleInput => ({ kind: 'region', value });
  assert.equal(evaluateRule(cheonan, region('충청남도 천안시'), REGIONS).result, 'O');
  assert.equal(evaluateRule(cheonan, region('충청남도 아산시'), REGIONS).result, 'X');
  assert.equal(evaluateRule(cheonan, region('경기도'), REGIONS).result, 'X'); // 시·도가 다르면 불일치
  assert.equal(evaluateRule(cheonan, region('충청남도'), REGIONS).result, '?'); // 시·군 미선택
  const sido = rule({ operator: 'region_in', value: ['44'] });
  assert.equal(evaluateRule(sido, region('충청남도 아산시'), REGIONS).result, 'O');
  const unknownCode = rule({ operator: 'region_in', value: ['44130', '99999'] });
  assert.equal(evaluateRule(unknownCode, region('경기도'), REGIONS).result, '?'); // 못 푼 코드가 있으면 불일치로 단정하지 않음
  assert.equal(evaluateRule(unknownCode, region('충청남도 천안시'), REGIONS).result, 'O');
  // 직접 입력의 보기에서 고른 값
  assert.equal(evaluateRule(cheonan, { kind: 'text', value: '충청남도 천안시' }, REGIONS).result, 'O');
  assert.equal(evaluateRule(cheonan, { kind: 'text', value: '그 외 지역' }, REGIONS).result, 'X');
});

test('OR묶음은 한 줄: 하나라도 O면 O, 모두 X일 때만 X, 그 밖에는 ?', () => {
  const rules = [
    rule({ ruleKey: 'self', fieldId: 'registered_city_code', fieldName: '주민등록 시·군', operator: 'region_in', value: ['44200'], anyOfGroup: 'g', label: '아산시에 주민등록', sortOrder: 1 }),
    rule({ ruleKey: 'school', fieldId: 'campus_id', fieldName: '소속 캠퍼스', operator: 'region_in', value: ['44200'], anyOfGroup: 'g', label: '아산시 소재 대학 재학', sortOrder: 2 }),
    rule({ ruleKey: 'age', sortOrder: 3 }),
  ];
  const region = (value: string): RuleInput => ({ kind: 'region', value });
  const both = evaluateRuleRows(rules, { registered_city_code: region('경기도 수원시'), campus_id: region('충청남도 천안시'), birth_year: age(23) }, REGIONS);
  assert.equal(both.length, 2);
  assert.equal(both[0].outcome.result, 'X');
  assert.ok(both[0].outcome.reason?.includes('아산시에 주민등록 / 아산시 소재 대학 재학'));
  assert.equal(both[0].item, '주민등록 시·군 / 소속 캠퍼스');
  assert.equal(both[0].label, '아산시에 주민등록 또는 아산시 소재 대학 재학');
  assert.equal(both[1].item, '연령');

  const one = evaluateRuleRows(rules, { registered_city_code: region('경기도 수원시'), campus_id: region('충청남도 아산시') }, REGIONS);
  assert.equal(one[0].outcome.result, 'O');
  const partial = evaluateRuleRows(rules, { registered_city_code: region('경기도 수원시') }, REGIONS);
  assert.equal(partial[0].outcome.result, '?'); // 학교 미입력이 남아 있으면 X로 단정하지 않음
});

test('같은 항목 이름이 겹치면 번호를 붙여 구분', () => {
  const rows = evaluateRuleRows(
    [rule({ operator: 'gte', value: 1, fieldName: '성적값', ruleKey: 'a' }), rule({ operator: 'lte', value: 4, fieldName: '성적값', ruleKey: 'b' })],
    {}
  );
  assert.deepEqual(rows.map((r) => r.item), ['성적값', '성적값 (2)']);
});

test('내 정보를 규칙 입력값으로: 알 수 없는 항목은 넣지 않음', () => {
  const inputs = profileToInputs(DEFAULT_USER_PROFILE); // 23세, 대학 재학, 경기도, 학교 충청남도 천안시
  assert.deepEqual(inputs.birth_year, { kind: 'age', min: 23, max: 23 });
  assert.deepEqual(inputs.registered_city_code, { kind: 'region', value: '경기도' });
  assert.deepEqual(inputs.campus_id, { kind: 'region', value: '충청남도 천안시' });
  assert.deepEqual(inputs.enrollment_status, { kind: 'text', value: '재학' });
  assert.equal(inputs.employment_status, undefined); // 재학생의 취업 상태는 모른다
  assert.equal(inputs.employer_info, undefined);

  const seeker = profileToInputs({ ...DEFAULT_USER_PROFILE, status: '구직 중', age: 0, residence: '' });
  assert.deepEqual(seeker.employment_status, { kind: 'text', value: '미취업' });
  assert.equal(seeker.enrollment_status, undefined);
  assert.equal(seeker.birth_year, undefined);
  assert.equal(seeker.registered_city_code, undefined);
});

test('조건표: 규칙이 없으면 ? 한 줄, API 값은 참고로만, 관계는 병행 가능만 O', () => {
  const empty = buildCriteriaRows(
    ruleSet({ apiHints: [{ kind: 'age', item: '연령 (API 참고)', text: '만 19~34세', minAge: 19, maxAge: 34 }] }),
    profileToInputs({ ...DEFAULT_USER_PROFILE, age: 50 })
  );
  assert.equal(empty[0].item, '판정 규칙');
  assert.equal(empty[0].result, '?');
  // 나이가 API 범위 밖이어도 API 값으로는 X를 만들지 않는다
  assert.equal(empty[1].result, '?');
  assert.ok(empty[1].basis.includes('판정에 쓰지 않아요'));

  const rows = buildCriteriaRows(
    ruleSet({
      rules: [rule({})],
      documentNames: ['주민등록표 등본'],
      relations: [
        { relation: '병행 제한', otherPolicyId: 'C3', otherPolicyTitle: '충남 전세이자', direction: null, conditionText: null, sourceQuote: '유사 사업 지원 중이면 불가', sourceLocator: null, sourceTitle: null, sourceUrl: null },
        { relation: '병행 가능', otherPolicyId: 'G1', otherPolicyTitle: 'K-패스', direction: null, conditionText: null, sourceQuote: '중복 지원 가능', sourceLocator: null, sourceTitle: null, sourceUrl: null },
      ],
    }),
    profileToInputs(DEFAULT_USER_PROFILE)
  );
  assert.deepEqual(rows.map((r) => r.result), ['O', '?', '?', 'O']);
  assert.ok(rows[0].basis.includes('시험용 인용') && rows[0].basis.includes('시험용 공고'));
  assert.ok(rows[2].officialRule.startsWith('병행 제한'));
  assert.equal(new Set(rows.map((r) => r.item)).size, rows.length); // 표의 줄 이름은 고유
  assert.ok(rows.every((r) => r.status.length > 0));
});

test('조건표: 미입력 항목은 어디서 입력하는지 알려 줌', () => {
  const rent = rule({ fieldId: 'monthly_rent_amount', fieldName: '월세액', operator: 'lte', value: 700000, sortOrder: 2 });
  const item = { number: 44, label: '월세액', fieldId: 'monthly_rent_amount', inputKey: 'monthly_rent_amount', storage: '', docsLabel: '', issuer: '', checkMethod: '', checkContent: '', caution: '', docIds: [], rules: [rent], docs: [], regionNames: REGIONS };
  const rows = buildCriteriaRows(ruleSet({ rules: [rule({}), rent], inputItems: [item] }), {});
  assert.ok(rows[0].userMatchNote.includes('내 정보'));
  assert.ok(rows[1].userMatchNote.includes('직접 입력'));
});

test('직접 입력: 글자를 값으로 바꿔 그 자리에서 판정', () => {
  const rent = rule({ fieldId: 'monthly_rent_amount', operator: 'lte', value: 700000, unit: '원', failReason: '월세가 70만 원을 넘어요.' });
  assert.deepEqual(evaluateFieldInput([rent], ''), { result: '?', label: '미입력' });
  assert.equal(evaluateFieldInput([rent], '600,000').result, 'O');
  assert.deepEqual(evaluateFieldInput([rent], '800000'), { result: 'X', label: '월세가 70만 원을 넘어요.' });

  const band = rule({ fieldId: 'aid_band_value', operator: 'lte', value: 8 });
  assert.equal(evaluateFieldInput([band], '3구간').result, 'O'); // 보기 글자에서 숫자를 읽는다
  assert.equal(evaluateFieldInput([band], '9구간').result, 'X');
  assert.equal(evaluateFieldInput([band], '모름').result, '?');

  const yes = rule({ operator: 'is_true', value: null });
  assert.equal(evaluateFieldInput([yes], '예').result, 'O');
  assert.equal(evaluateFieldInput([yes], '아니오').result, 'X');
  assert.equal(evaluateFieldInput([yes], '모름').result, '?');

  // 묶음 안의 한 조건만 안 맞으면 X가 아니라 ?
  const parent = rule({ fieldId: 'parent_registered_city_code', operator: 'region_in', value: ['44130'], anyOfGroup: 'g' });
  assert.equal(evaluateFieldInput([parent], '충청남도 천안시', REGIONS).result, 'O');
  const other = evaluateFieldInput([parent], '그 외 지역', REGIONS);
  assert.equal(other.result, '?');
  assert.ok(other.label.includes('묶음'));

  assert.equal(parseRawInput(rent, '  '), undefined);
  assert.deepEqual(parseRawInput(rent, '숫자 아님'), { kind: 'unknown' });
  assert.deepEqual(parseRawInput(rule({}), '23'), { kind: 'age', min: 23, max: 23 });
});

test('직접 입력 칸의 입력 방식을 규칙에서 만든다', () => {
  assert.deepEqual(inputSpecForRules([rule({ operator: 'lte', value: 10, unit: '개월', question: '몇 개월인가요?' })]), { kind: 'number', unit: '개월', hint: '몇 개월인가요?' });
  const yesNo = inputSpecForRules([rule({ operator: 'is_true', value: null, label: '무주택' })]);
  assert.deepEqual(yesNo, { kind: 'select', options: ['예', '아니오', '모름'], hint: '공고 기준: 무주택' });
  const choice = inputSpecForRules([rule({ operator: 'in', value: ['재직', '자영업'] })]);
  assert.deepEqual(choice.kind === 'select' && choice.options, ['재직', '자영업', '해당 없음(그 외)', '모름']);
  const custom = inputSpecForRules([rule({ operator: 'in', value: ['무주택'], choices: ['무주택', '주택 소유', '모름'] })]);
  assert.deepEqual(custom.kind === 'select' && custom.options, ['무주택', '주택 소유', '모름']);
  const region = inputSpecForRules([rule({ operator: 'region_in', value: ['44130', '44131', '44200'] })], REGIONS);
  assert.deepEqual(region.kind === 'select' && region.options, ['충청남도 천안시', '충청남도 아산시', '그 외 지역', '모름']);
});

test('생활변화: 검수 완료 규칙의 판정이 달라지는지만 말한다', () => {
  const policy = { id: 'T1', title: '시험 정책' } as PolicyItem;
  const scenario: LifeChangeScenario = { residence: '충청남도 천안시', schoolRegion: '충청남도 천안시', academicStatus: '졸업', employmentStatus: '구직 중' };
  const rules = [
    rule({ ruleKey: 'city', fieldId: 'registered_city_code', fieldName: '주민등록 시·군', operator: 'region_in', value: ['44130'], label: '천안시에 주민등록' }),
    rule({ ruleKey: 'enroll', fieldId: 'enrollment_status', fieldName: '학적 상태', operator: 'in', value: ['재학', '휴학'], label: '재학·휴학' }),
    rule({ ruleKey: 'job', fieldId: 'employment_status', fieldName: '취업·활동 상태', operator: 'in', value: ['미취업'], label: '미취업' }),
  ];
  const impact = analyzeRuleChange(policy, ruleSet({ rules }), DEFAULT_USER_PROFILE, scenario);
  assert.deepEqual(impact.changedTags, ['주민등록 시·군: X → O', '학적 상태: O → X', '취업·활동 상태: ? → O']);
  assert.equal(impact.impactTone, 'caution');
  assert.ok(impact.impactSummary.includes('1개'));

  const none = analyzeRuleChange(policy, ruleSet({}), DEFAULT_USER_PROFILE, scenario);
  assert.equal(none.impactTone, 'neutral');
  assert.ok(none.impactSummary.includes('검수한 판정 규칙이 아직 없어'));

  const same = analyzeRuleChange(policy, ruleSet({ rules: [rule({})] }), DEFAULT_USER_PROFILE, scenario);
  assert.deepEqual(same.changedTags, ['검수한 조건 기준 변화 없음']);

  // 프리랜서·창업은 둘 중 무엇인지 몰라 판정하지 않는다
  const freelance = scenarioToInputs(DEFAULT_USER_PROFILE, { ...scenario, employmentStatus: '프리랜서·창업' });
  assert.deepEqual(freelance.employment_status, { kind: 'unknown' });
});

test('특화 대상 질문은 질문 문구마다 입력 칸이 따로, 같은 질문은 한 칸', () => {
  const share = rule({ fieldId: 'special_target_status', operator: 'is_true', question: '쉐어하우스인가요?', anyOfGroup: 'head', label: '쉐어하우스' });
  const head = rule({ fieldId: 'household_head_status', operator: 'in', value: ['세대주'], anyOfGroup: 'head', label: '세대주' });
  const shareArea = rule({ fieldId: 'special_target_status', operator: 'is_true', question: '쉐어하우스인가요?', anyOfGroup: 'area', label: '쉐어하우스(면적)', sortOrder: 2 });
  const area = rule({ fieldId: 'housing_area', operator: 'lte', value: 85, anyOfGroup: 'area', label: '85㎡ 이하', sortOrder: 2 });
  const rental = rule({ fieldId: 'special_target_status', operator: 'is_false', question: '공공임대주택에 사나요?', label: '공공임대 아님', sortOrder: 3 });
  assert.equal(inputKeyOf(share), inputKeyOf(shareArea));
  assert.notEqual(inputKeyOf(share), inputKeyOf(rental));
  assert.equal(inputKeyOf(head), 'household_head_status');
  const rows = evaluateRuleRows([share, head, shareArea, area, rental], {
    [inputKeyOf(share)]: { kind: 'boolean', value: true },
    [inputKeyOf(rental)]: { kind: 'boolean', value: true },
    household_head_status: { kind: 'text', value: '세대원' },
  });
  assert.deepEqual(rows.map((r) => r.outcome.result), ['O', 'O', 'X']);
});
