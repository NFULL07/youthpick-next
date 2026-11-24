import type { DirectInputSpec } from '../data/directInputSpec';
import { uniqueLinks } from './officialLinks';
import {
  CRITERIA_STATUS_LABEL,
  type AcademicWorkStatus,
  type CriteriaResult,
  type LifeChangeScenario,
  type PolicyChangeImpact,
  type PolicyCriteriaRow,
  type PolicyItem,
  type UserProfile,
} from '../types/policy';
import { compareRegion } from './regionMatch';
import {
  inputKeyOf,
  type EligibilityRule,
  type PolicyRelation,
  type PolicyRuleSet,
  type RuleInput,
  type RuleInputs,
} from './ruleTypes';

/**
 * 검수 완료 판정 규칙을 브라우저 안에서 계산한다.
 *
 * 원칙 (CLAUDE.md 4장)
 * - 입력이 없거나 '모름'이면 X가 아니라 ?로 둔다.
 * - ?를 O나 X로 바꾸지 않는다. 판정할 수 없는 값도 ?다.
 * - X는 이유와 함께 돌려준다.
 * - 입력값은 인자로만 받고 어디에도 남기지 않는다(저장·전송·기록 없음).
 */

export interface RuleOutcome {
  result: CriteriaResult;
  /** 사용자 값 표시 */
  note: string;
  /** X일 때 이유 */
  reason?: string;
}

/** '내 정보'로 채울 수 있는 항목. 나머지는 정책 상세에서 직접 입력받는다 */
export const PROFILE_SUPPLIED_FIELDS: readonly string[] = [
  'birth_year',
  'registered_sido_code',
  'registered_city_code',
  'campus_id',
  'enrollment_status',
];

const ENROLLMENT_FROM_STATUS: Partial<Record<AcademicWorkStatus, string>> = {
  '대학 재학': '재학',
  휴학: '휴학',
  졸업: '졸업',
};

const EMPLOYMENT_FROM_STATUS: Partial<Record<AcademicWorkStatus, string>> = {
  '구직 중': '미취업',
  '재직 중': '재직',
};

export const UNKNOWN_CHOICE = '모름';
export const OTHER_CHOICE = '해당 없음(그 외)';
export const OTHER_REGION_CHOICE = '그 외 지역';

/** '내 정보'를 규칙 입력값으로 바꾼다. 알 수 없는 항목은 넣지 않는다(= 미입력) */
export function profileToInputs(profile: UserProfile): RuleInputs {
  const inputs: RuleInputs = {};
  if (Number.isFinite(profile.age) && profile.age > 0) {
    inputs.birth_year = { kind: 'age', min: profile.age, max: profile.age };
  }
  if (profile.residence.trim()) {
    inputs.registered_sido_code = { kind: 'region', value: profile.residence };
    inputs.registered_city_code = { kind: 'region', value: profile.residence };
  }
  if (profile.schoolRegion.trim()) {
    inputs.campus_id = { kind: 'region', value: profile.schoolRegion };
  }
  if (profile.workRegion.trim()) {
    inputs.employer_info = { kind: 'region', value: profile.workRegion };
  }
  const enrollment = ENROLLMENT_FROM_STATUS[profile.status];
  if (enrollment) inputs.enrollment_status = { kind: 'text', value: enrollment };
  const employment = EMPLOYMENT_FROM_STATUS[profile.status];
  if (employment) inputs.employment_status = { kind: 'text', value: employment };
  return inputs;
}

/** 생활변화 가정을 규칙 입력값으로 바꾼다. 실제 내 정보는 바꾸지 않는다 */
export function scenarioToInputs(profile: UserProfile, scenario: LifeChangeScenario): RuleInputs {
  const inputs = profileToInputs({
    ...profile,
    residence: scenario.residence,
    schoolRegion: scenario.schoolRegion,
    status: scenario.academicStatus,
  });
  if (scenario.employmentStatus === '구직 중') {
    inputs.employment_status = { kind: 'text', value: '미취업' };
  } else if (scenario.employmentStatus === '재직 중') {
    inputs.employment_status = { kind: 'text', value: '재직' };
  } else if (scenario.employmentStatus === '프리랜서·창업') {
    // 프리랜서인지 창업인지 알 수 없어 판정하지 않는다
    inputs.employment_status = { kind: 'unknown' };
  }
  return inputs;
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function rangeOf(value: unknown): { min?: number; max?: number } | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { min, max } = value as { min?: unknown; max?: unknown };
  const range: { min?: number; max?: number } = {};
  if (isNumber(min)) range.min = min;
  if (isNumber(max)) range.max = max;
  return range.min === undefined && range.max === undefined ? null : range;
}

function stringList(value: unknown): string[] | null {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string')
    ? (value as string[])
    : null;
}

function describeInput(input: RuleInput, rule: EligibilityRule): string {
  switch (input.kind) {
    case 'age':
      return input.min === input.max
        ? `만 ${input.min}세`
        : `만 ${input.min}~${input.max}세 (생일에 따라 달라요)`;
    case 'number':
      return `${input.value.toLocaleString('ko-KR')}${rule.unit ?? ''}`;
    case 'text':
      return input.value;
    case 'boolean':
      return input.value ? '예' : '아니오';
    case 'region':
      return input.value.trim() || '미입력';
    case 'unknown':
      return UNKNOWN_CHOICE;
  }
}

/** 규칙의 지역 코드를 화면 지역 이름으로 바꾼다. 모르는 코드는 unresolved에 담는다 */
export function regionNamesOf(
  rule: EligibilityRule,
  regionNames: Record<string, string>
): { names: string[]; unresolved: string[] } {
  const codes = stringList(rule.value) ?? [];
  const names: string[] = [];
  const unresolved: string[] = [];
  for (const code of codes) {
    const name = regionNames[code];
    if (!name) unresolved.push(code);
    else if (!names.includes(name)) names.push(name);
  }
  return { names, unresolved };
}

function decide(matched: boolean, input: RuleInput, rule: EligibilityRule): RuleOutcome {
  const note = describeInput(input, rule);
  if (matched) return { result: 'O', note };
  return {
    result: 'X',
    note,
    reason: rule.failReason ?? `'${rule.label}' 조건에 맞지 않아요.`,
  };
}

function cannotDecide(input: RuleInput, rule: EligibilityRule): RuleOutcome {
  return { result: '?', note: `${describeInput(input, rule)} · 이 값으로는 판정할 수 없어요` };
}

/** 규칙 하나를 입력값 하나로 판정한다 */
export function evaluateRule(
  rule: EligibilityRule,
  input: RuleInput | undefined,
  regionNames: Record<string, string> = {}
): RuleOutcome {
  if (!input) return { result: '?', note: '미입력' };
  if (input.kind === 'unknown') return { result: '?', note: UNKNOWN_CHOICE };

  switch (rule.operator) {
    case 'age_between': {
      const range = rangeOf(rule.value);
      const age =
        input.kind === 'age'
          ? input
          : input.kind === 'number'
            ? { min: input.value, max: input.value }
            : null;
      if (!range || !age) return cannotDecide(input, rule);
      const allInside =
        (range.min === undefined || age.min >= range.min) &&
        (range.max === undefined || age.max <= range.max);
      const allOutside =
        (range.max !== undefined && age.min > range.max) ||
        (range.min !== undefined && age.max < range.min);
      const note = describeInput(input.kind === 'age' ? input : { kind: 'age', ...age }, rule);
      if (allInside) return { result: 'O', note };
      if (allOutside) {
        return { result: 'X', note, reason: rule.failReason ?? `${note}는 공고 연령 범위 밖이에요.` };
      }
      // 출생연도만 알면 생일 전후로 만 나이가 달라진다. 경계에 걸리면 단정하지 않는다
      return { result: '?', note };
    }
    case 'between': {
      const range = rangeOf(rule.value);
      if (!range || input.kind !== 'number') return cannotDecide(input, rule);
      return decide(
        (range.min === undefined || input.value >= range.min) &&
          (range.max === undefined || input.value <= range.max),
        input,
        rule
      );
    }
    case 'gte':
    case 'lte': {
      if (!isNumber(rule.value) || input.kind !== 'number') return cannotDecide(input, rule);
      return decide(
        rule.operator === 'gte' ? input.value >= rule.value : input.value <= rule.value,
        input,
        rule
      );
    }
    case 'eq': {
      if (typeof rule.value === 'string' && input.kind === 'text') {
        return decide(input.value.trim() === rule.value.trim(), input, rule);
      }
      if (isNumber(rule.value) && input.kind === 'number') {
        return decide(input.value === rule.value, input, rule);
      }
      if (typeof rule.value === 'boolean' && input.kind === 'boolean') {
        return decide(input.value === rule.value, input, rule);
      }
      return cannotDecide(input, rule);
    }
    case 'in':
    case 'not_in': {
      const list = stringList(rule.value);
      if (!list || input.kind !== 'text') return cannotDecide(input, rule);
      const included = list.some((v) => v.trim() === input.value.trim());
      return decide(rule.operator === 'in' ? included : !included, input, rule);
    }
    case 'region_in': {
      const { names, unresolved } = regionNamesOf(rule, regionNames);
      if (input.kind === 'text') {
        // 직접 입력의 보기에서 고른 값: 보기의 지역 이름이거나 '그 외 지역'
        if (names.includes(input.value)) return { result: 'O', note: input.value };
        return unresolved.length > 0 ? cannotDecide(input, rule) : decide(false, input, rule);
      }
      if (input.kind !== 'region') return cannotDecide(input, rule);
      const match = compareRegion(names, input.value);
      if (match === 'match') return { result: 'O', note: describeInput(input, rule) };
      // 지역 코드를 다 풀지 못했거나, 시·군을 고르지 않았으면 불일치로 단정하지 않는다
      if (match === 'unknown' || unresolved.length > 0) {
        return { result: '?', note: `${describeInput(input, rule)} · 시·군까지 확인이 필요해요` };
      }
      return decide(false, input, rule);
    }
    case 'is_true':
    case 'is_false': {
      if (input.kind !== 'boolean') return cannotDecide(input, rule);
      return decide(rule.operator === 'is_true' ? input.value : !input.value, input, rule);
    }
    default:
      return cannotDecide(input, rule);
  }
}

export interface RuleRow {
  /** 같은 정책 안에서 고유한 이름(표의 항목 칸) */
  item: string;
  /** 공고 기준 문구 */
  label: string;
  rules: EligibilityRule[];
  outcome: RuleOutcome;
}

function itemName(rule: EligibilityRule): string {
  return rule.operator === 'age_between' ? '연령' : rule.fieldName;
}

function sortedRules(rules: EligibilityRule[]): EligibilityRule[] {
  return [...rules].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

/** 규칙을 표의 줄로 묶어 판정한다. OR묶음은 한 줄이 된다 */
export function evaluateRuleRows(
  rules: EligibilityRule[],
  inputs: RuleInputs,
  regionNames: Record<string, string> = {}
): RuleRow[] {
  const groups: EligibilityRule[][] = [];
  const groupIndex = new Map<string, number>();
  for (const rule of sortedRules(rules)) {
    if (rule.anyOfGroup === null) {
      groups.push([rule]);
      continue;
    }
    const found = groupIndex.get(rule.anyOfGroup);
    if (found === undefined) {
      groupIndex.set(rule.anyOfGroup, groups.length);
      groups.push([rule]);
    } else {
      groups[found].push(rule);
    }
  }

  const usedNames = new Map<string, number>();
  return groups.map((members) => {
    const outcomes = members.map((rule) => evaluateRule(rule, inputs[inputKeyOf(rule)], regionNames));
    let outcome: RuleOutcome;
    if (members.length === 1) {
      outcome = outcomes[0];
    } else {
      const notes = members
        .map((rule, i) => `${itemName(rule)}: ${outcomes[i].note}`)
        .join(' / ');
      if (outcomes.some((o) => o.result === 'O')) {
        outcome = { result: 'O', note: notes };
      } else if (outcomes.every((o) => o.result === 'X')) {
        outcome = {
          result: 'X',
          note: notes,
          reason: `다음 중 하나는 맞아야 해요: ${members.map((r) => r.label).join(' / ')}`,
        };
      } else {
        outcome = { result: '?', note: notes };
      }
    }

    const baseName = Array.from(new Set(members.map(itemName))).join(' / ');
    const count = (usedNames.get(baseName) ?? 0) + 1;
    usedNames.set(baseName, count);
    return {
      item: count === 1 ? baseName : `${baseName} (${count})`,
      label: members.map((r) => r.label).join(' 또는 '),
      rules: members,
      outcome,
    };
  });
}

function basisOf(parts: {
  sourceQuote: string | null;
  sourceTitle: string | null;
  sourceLocator: string | null;
}): string {
  const where = [parts.sourceTitle, parts.sourceLocator].filter(Boolean).join(' · ');
  const quote = parts.sourceQuote ? `“${parts.sourceQuote}”` : '';
  return [quote, where || '공고 원문'].filter(Boolean).join(' · ');
}

function row(
  item: string,
  officialRule: string,
  userMatchNote: string,
  result: CriteriaResult,
  basis: string,
  reason?: string,
  sources: PolicyCriteriaRow['sources'] = []
): PolicyCriteriaRow {
  return { item, officialRule, userMatchNote, result, status: CRITERIA_STATUS_LABEL[result], reason, basis, sources };
}

/** 근거 원문 링크(같은 주소는 한 번만, http(s)만) */
function sourceLinksOf(parts: { sourceTitle: string | null; sourceUrl: string | null }[]): PolicyCriteriaRow['sources'] {
  return uniqueLinks(parts.map((p) => ({ label: p.sourceTitle ?? '근거 원문', url: p.sourceUrl })), 3);
}

const RELATION_NOTE: Record<PolicyRelation['relation'], string> = {
  '병행 제한': '함께 받을 수 없어요',
  '병행 가능': '함께 받을 수 있어요',
  '조건부 병행': '조건을 맞추면 함께 받을 수 있어요',
  선행조건: '',
  '추가 확인': '함께 받을 수 있는지 확인이 필요해요',
};

function relationRow(relation: PolicyRelation, index: number): PolicyCriteriaRow {
  const head =
    relation.relation === '선행조건'
      ? relation.direction === 'needs'
        ? '이 정책을 받으려면 먼저 필요해요'
        : '이 정책이 먼저 있어야 받을 수 있어요'
      : RELATION_NOTE[relation.relation];
  const official = [`${relation.relation}: ${head}`, relation.conditionText]
    .filter(Boolean)
    .join(' · ');
  // 병행 가능만 사용자 입력과 무관하게 정해진다. 나머지는 상대 정책 수혜 여부를 모르므로 ?
  const result: CriteriaResult = relation.relation === '병행 가능' ? 'O' : '?';
  return row(
    `함께 받기 ${index + 1}: ${relation.otherPolicyTitle}`,
    official,
    result === 'O' ? '따로 확인할 것 없음' : '그 정책을 받고 있는지 확인해 주세요',
    result,
    basisOf(relation),
    undefined,
    sourceLinksOf([relation])
  );
}

const API_BASIS = '온통청년 API 값 · 원문 대조 전이라 판정에 쓰지 않아요';

/** 정책 상세의 '공고 기준과 나의 조건' 표 줄을 만든다 */
export function buildCriteriaRows(ruleSet: PolicyRuleSet, inputs: RuleInputs): PolicyCriteriaRow[] {
  const inputKeys = new Set(ruleSet.inputItems.map((item) => item.inputKey));
  const rows: PolicyCriteriaRow[] = evaluateRuleRows(ruleSet.rules, inputs, ruleSet.regionNames).map(
    (ruleRow) => {
      const missing = ruleRow.rules.filter((rule) => inputs[inputKeyOf(rule)] === undefined);
      let note = ruleRow.outcome.note;
      if (ruleRow.outcome.result === '?' && missing.length === ruleRow.rules.length) {
        note = missing.some((rule) => inputKeys.has(inputKeyOf(rule)))
          ? '아래 직접 입력에서 넣으면 그 자리에서 확인돼요'
          : '내 정보에 입력하면 확인돼요';
      }
      const basis = Array.from(new Set(ruleRow.rules.map(basisOf))).join(' / ');
      return row(ruleRow.item, ruleRow.label, note, ruleRow.outcome.result, basis, ruleRow.outcome.reason, sourceLinksOf(ruleRow.rules));
    }
  );

  if (ruleSet.rules.length === 0) {
    rows.push(
      row(
        '판정 규칙',
        '검수한 판정 규칙이 아직 없어요',
        '-',
        '?',
        '공고 원문을 확인해 주세요'
      )
    );
  }

  for (const hint of ruleSet.apiHints) {
    const myAge = hint.kind === 'age' ? inputs.birth_year : undefined;
    rows.push(
      row(
        hint.item,
        hint.text,
        myAge && myAge.kind === 'age' ? `만 ${myAge.min}세` : '-',
        '?',
        API_BASIS
      )
    );
  }

  if (ruleSet.documentNames.length > 0) {
    rows.push(
      row(
        '제출 서류',
        ruleSet.documentNames.join(', '),
        '전자지갑 연동 전 · 직접 준비',
        '?',
        '검수한 제출서류 목록'
      )
    );
  }

  ruleSet.relations.forEach((relation, index) => rows.push(relationRow(relation, index)));
  return rows;
}

/** 직접 입력 칸의 입력 방식을 규칙에서 만든다 */
export function inputSpecForRules(
  rules: EligibilityRule[],
  regionNames: Record<string, string> = {}
): DirectInputSpec {
  const first = sortedRules(rules)[0];
  const hint = first.question ?? `공고 기준: ${rules.map((r) => r.label).join(' / ')}`;
  const numeric = rules.find(
    (r) =>
      r.operator === 'between' ||
      r.operator === 'gte' ||
      r.operator === 'lte' ||
      r.operator === 'age_between' ||
      (r.operator === 'eq' && isNumber(r.value))
  );
  if (numeric) {
    return { kind: 'number', unit: numeric.unit ?? (numeric.operator === 'age_between' ? '세' : ''), hint };
  }
  if (first.choices && first.choices.length > 0) {
    return { kind: 'select', options: first.choices, hint };
  }
  if (first.operator === 'is_true' || first.operator === 'is_false' || typeof first.value === 'boolean') {
    return { kind: 'select', options: ['예', '아니오', UNKNOWN_CHOICE], hint };
  }
  if (first.operator === 'region_in') {
    const names = Array.from(new Set(rules.flatMap((r) => regionNamesOf(r, regionNames).names)));
    return { kind: 'select', options: [...names, OTHER_REGION_CHOICE, UNKNOWN_CHOICE], hint };
  }
  const values = Array.from(
    new Set(
      rules.flatMap((r) =>
        typeof r.value === 'string' ? [r.value] : (stringList(r.value) ?? [])
      )
    )
  );
  return { kind: 'select', options: [...values, OTHER_CHOICE, UNKNOWN_CHOICE], hint };
}

/** 직접 입력 칸의 글자를 규칙 입력값으로 바꾼다. 빈 값이면 undefined(미입력) */
export function parseRawInput(rule: EligibilityRule, raw: string): RuleInput | undefined {
  const text = raw.trim();
  if (!text) return undefined;
  if (text === UNKNOWN_CHOICE) return { kind: 'unknown' };

  const numericRule =
    rule.operator === 'between' ||
    rule.operator === 'gte' ||
    rule.operator === 'lte' ||
    rule.operator === 'age_between' ||
    (rule.operator === 'eq' && isNumber(rule.value));
  if (numericRule) {
    const found = text.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    if (!found) return { kind: 'unknown' };
    const value = Number(found[0]);
    return rule.operator === 'age_between'
      ? { kind: 'age', min: value, max: value }
      : { kind: 'number', value };
  }
  if (
    rule.operator === 'is_true' ||
    rule.operator === 'is_false' ||
    (rule.operator === 'eq' && typeof rule.value === 'boolean')
  ) {
    if (text === '예') return { kind: 'boolean', value: true };
    if (text === '아니오') return { kind: 'boolean', value: false };
    return { kind: 'unknown' };
  }
  return { kind: 'text', value: text };
}

/** 직접 입력 칸 하나의 결과. 같은 항목에 걸린 규칙을 모두 본다 */
export function evaluateFieldInput(
  rules: EligibilityRule[],
  raw: string,
  regionNames: Record<string, string> = {}
): { result: CriteriaResult; label: string } {
  if (!raw.trim()) return { result: '?', label: '미입력' };
  const outcomes = rules.map((rule) => ({
    rule,
    outcome: evaluateRule(rule, parseRawInput(rule, raw), regionNames),
  }));
  const failed = outcomes.find((o) => o.outcome.result === 'X' && o.rule.anyOfGroup === null);
  if (failed) {
    return { result: 'X', label: failed.outcome.reason ?? '입력값이 공고 기준에 맞지 않아요.' };
  }
  if (outcomes.every((o) => o.outcome.result === 'O')) {
    return { result: 'O', label: '입력값 기준 충족' };
  }
  if (outcomes.some((o) => o.outcome.result === 'X')) {
    // 묶음 안의 한 조건만 안 맞은 것이라 X로 단정하지 않는다
    return { result: '?', label: '이 항목은 해당 없음 · 같은 묶음의 다른 조건으로 충족할 수 있어요' };
  }
  return { result: '?', label: '판정할 수 없어요 · 공고를 확인해 주세요' };
}

/** 생활변화 가정 전후로 검수 완료 규칙의 판정이 어떻게 달라지는지 본다 */
export function analyzeRuleChange(
  policy: PolicyItem,
  ruleSet: PolicyRuleSet,
  before: UserProfile,
  after: LifeChangeScenario
): PolicyChangeImpact {
  if (ruleSet.rules.length === 0) {
    return {
      policy,
      changedTags: ['검수한 판정 규칙 없음'],
      impactSummary: '검수한 판정 규칙이 아직 없어 변화를 판단하지 않았어요. 공고 원문을 확인해 주세요.',
      impactTone: 'neutral',
    };
  }
  const beforeRows = evaluateRuleRows(ruleSet.rules, profileToInputs(before), ruleSet.regionNames);
  const afterRows = evaluateRuleRows(ruleSet.rules, scenarioToInputs(before, after), ruleSet.regionNames);
  const changes = afterRows
    .map((afterRow, i) => ({ afterRow, beforeResult: beforeRows[i].outcome.result }))
    .filter(({ afterRow, beforeResult }) => afterRow.outcome.result !== beforeResult);

  if (changes.length === 0) {
    return {
      policy,
      changedTags: ['검수한 조건 기준 변화 없음'],
      impactSummary: '가정한 변화로는 검수한 조건의 판정이 달라지지 않아요.',
      impactTone: 'neutral',
    };
  }
  const toX = changes.filter((c) => c.afterRow.outcome.result === 'X').length;
  const toO = changes.filter((c) => c.afterRow.outcome.result === 'O').length;
  return {
    policy,
    changedTags: changes.map(
      ({ afterRow, beforeResult }) => `${afterRow.item}: ${beforeResult} → ${afterRow.outcome.result}`
    ),
    impactSummary:
      toX > 0
        ? `맞지 않게 되는 조건이 ${toX}개 있어요. 공고 기준을 다시 확인해 주세요.`
        : toO > 0
          ? `새로 충족하는 조건이 ${toO}개 있어요. 나머지 조건도 확인해 주세요.`
          : `추가 확인이 필요한 조건이 ${changes.length}개 생겨요.`,
    impactTone: toX > 0 ? 'caution' : toO > 0 ? 'positive' : 'neutral',
  };
}
