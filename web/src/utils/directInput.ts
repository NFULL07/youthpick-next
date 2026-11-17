import { DIRECT_INPUT_SPECS, type DirectInputSpec } from '../data/directInputSpec';
import { DIRECT_INPUT_ITEMS, REQUIREMENT_DOCS } from '../data/docRequirements.generated';
import type { DirectInputItem, RequirementDoc } from '../data/docRequirementTypes';
import type { CriteriaResult, PolicyItem } from '../types/policy';
import { evaluateFieldInput, inputSpecForRules } from './ruleEngine';
import type { RuleInputItem } from './ruleTypes';

function isRuleItem(item: DirectInputItem | undefined): item is RuleInputItem {
  return Boolean(item) && Array.isArray((item as Partial<RuleInputItem>).rules);
}

export const DIRECT_INPUT_NOTICE =
  '입력한 값은 저장되지 않아요. 새로고침하거나 다른 화면으로 가면 지워져요.';

/** 정책에 연결된 직접 입력 항목 (확인서류표 번호 순) */
export function getDirectInputItemsForPolicy(policy: PolicyItem): DirectInputItem[] {
  // Supabase 정책: 검수 완료 규칙 가운데 '내 정보'로 채울 수 없는 항목
  if (policy.ruleSet) {
    return policy.ruleSet.inputItems;
  }
  const ids = new Set(policy.directInputFieldIds ?? []);
  return DIRECT_INPUT_ITEMS.filter((item) => ids.has(item.fieldId)).sort(
    (a, b) => a.number - b.number
  );
}

export function getDocsForItem(item: DirectInputItem): RequirementDoc[] {
  if (isRuleItem(item)) {
    return item.docs;
  }
  return item.docIds
    .map((id) => REQUIREMENT_DOCS.find((doc) => doc.id === id))
    .filter((doc): doc is RequirementDoc => Boolean(doc));
}

/** 직접 입력 칸의 입력 방식. 정해 둔 방식이 없으면 규칙에서 만든다 */
export function getInputSpec(item: DirectInputItem): DirectInputSpec | undefined {
  const known = DIRECT_INPUT_SPECS[item.fieldId];
  if (known || !isRuleItem(item)) {
    return known;
  }
  return inputSpecForRules(item.rules, item.regionNames);
}

/**
 * 직접 입력 항목의 표시 결과.
 * 검수 완료 규칙이 붙은 항목은 입력값으로 그 자리에서 판정한다(값은 어디에도 남기지 않음).
 * 규칙이 없는 항목은 값이 있어도 O/X를 만들지 않고 ?로 둔다.
 */
export function getDirectInputResult(
  value: string | undefined,
  item?: DirectInputItem
): {
  result: CriteriaResult;
  label: string;
} {
  if (isRuleItem(item)) {
    return evaluateFieldInput(item.rules, value ?? '', item.regionNames);
  }
  if (!value || !value.trim()) {
    return { result: '?', label: '미입력' };
  }
  return { result: '?', label: '직접 입력함 · 판정 규칙 연결 전' };
}
