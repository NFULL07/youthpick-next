import type { DirectInputItem, RequirementDoc } from '../data/docRequirementTypes';

/**
 * Supabase의 검수 완료 판정 규칙을 화면에서 다루는 형식.
 * DB 칸 설명: docs/handoff/supabase_schema.md
 */
export type RuleOperator =
  | 'age_between'
  | 'between'
  | 'gte'
  | 'lte'
  | 'eq'
  | 'in'
  | 'not_in'
  | 'region_in'
  | 'is_true'
  | 'is_false';

export interface EligibilityRule {
  id: number;
  ruleKey: string;
  /** personal_field.id */
  fieldId: string;
  fieldName: string;
  operator: RuleOperator;
  value: unknown;
  /** 같은 값끼리는 하나만 충족하면 된다(OR). null이면 반드시 충족(AND) */
  anyOfGroup: string | null;
  label: string;
  failReason: string | null;
  question: string | null;
  choices: string[] | null;
  unit: string | null;
  sortOrder: number;
  sourceQuote: string | null;
  sourceLocator: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
}

export type RelationKind = '병행 제한' | '병행 가능' | '조건부 병행' | '선행조건' | '추가 확인';

export interface PolicyRelation {
  relation: RelationKind;
  otherPolicyId: string;
  otherPolicyTitle: string;
  /** 선행조건일 때: 이 정책이 상대 정책을 먼저 필요로 하면 'needs', 반대면 'needed_by' */
  direction: 'needs' | 'needed_by' | null;
  conditionText: string | null;
  sourceQuote: string | null;
  sourceLocator: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
}

/** 온통청년 API 값. 원문 대조 전이라 판정에 쓰지 않고 참고로만 보여준다 */
export interface ApiHint {
  kind: 'age' | 'restriction' | 'documents';
  item: string;
  text: string;
  minAge?: number;
  maxAge?: number;
}

/**
 * 규칙의 입력값을 담는 칸 이름. 보통은 항목ID와 같다.
 * '특화 대상 해당 여부'는 한 정책에 서로 다른 질문이 여러 개 있을 수 있어(예: 쉐어하우스 여부, 예외 대상 여부)
 * 질문 문구마다 칸을 따로 둔다. 질문이 같으면 같은 칸을 쓴다(같은 답을 여러 묶음에서 씀).
 */
export function inputKeyOf(rule: Pick<EligibilityRule, 'fieldId' | 'question'>): string {
  return rule.fieldId === 'special_target_status' && rule.question
    ? `${rule.fieldId}::${rule.question}`
    : rule.fieldId;
}

/** 직접 입력 항목에 규칙을 붙인 것. 입력값은 화면 메모리에서만 쓴다 */
export interface RuleInputItem extends DirectInputItem {
  /** 입력값 칸 이름(inputKeyOf). 화면 값·가상 지갑 값도 이 이름으로 담는다 */
  inputKey: string;
  rules: EligibilityRule[];
  /** 이 항목을 확인할 서류(발급처·경로 안내용) */
  docs: RequirementDoc[];
  regionNames: Record<string, string>;
}

export interface PolicyRuleSet {
  /** 규칙이 연결된 대표 공고 이름 */
  noticeTitle: string;
  rules: EligibilityRule[];
  relations: PolicyRelation[];
  apiHints: ApiHint[];
  /** 검수 완료 제출서류 이름 */
  documentNames: string[];
  /** 지역 코드 -> 화면 지역 이름('충청남도 천안시') */
  regionNames: Record<string, string>;
  /** '내 정보'로 채울 수 없어 정책 상세에서 직접 입력받는 항목 */
  inputItems: RuleInputItem[];
}

/** 규칙에 넣는 입력값. 항목이 없으면(미입력) 판정은 ? */
export type RuleInput =
  | { kind: 'age'; min: number; max: number }
  | { kind: 'number'; value: number }
  | { kind: 'text'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'region'; value: string }
  | { kind: 'unknown' };

export type RuleInputs = Record<string, RuleInput | undefined>;
