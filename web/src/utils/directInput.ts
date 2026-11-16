import { DIRECT_INPUT_ITEMS, REQUIREMENT_DOCS } from '../data/docRequirements.generated';
import type { DirectInputItem, RequirementDoc } from '../data/docRequirementTypes';
import type { CriteriaResult, PolicyItem } from '../types/policy';

export const DIRECT_INPUT_NOTICE =
  '입력한 값은 저장되지 않아요. 새로고침하거나 다른 화면으로 가면 지워져요.';

/** 정책에 연결된 직접 입력 항목 (확인서류표 번호 순) */
export function getDirectInputItemsForPolicy(policy: PolicyItem): DirectInputItem[] {
  const ids = new Set(policy.directInputFieldIds ?? []);
  return DIRECT_INPUT_ITEMS.filter((item) => ids.has(item.fieldId)).sort(
    (a, b) => a.number - b.number
  );
}

export function getDocsForItem(item: DirectInputItem): RequirementDoc[] {
  return item.docIds
    .map((id) => REQUIREMENT_DOCS.find((doc) => doc.id === id))
    .filter((doc): doc is RequirementDoc => Boolean(doc));
}

/**
 * 직접 입력 항목의 표시 결과.
 * 검수된 판정 규칙이 연결되기 전이므로 값이 있어도 O/X를 만들지 않고 ?로 둔다.
 */
export function getDirectInputResult(value: string | undefined): {
  result: CriteriaResult;
  label: string;
} {
  if (!value || !value.trim()) {
    return { result: '?', label: '미입력' };
  }
  return { result: '?', label: '직접 입력함 · 판정 규칙 연결 전' };
}
