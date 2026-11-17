import type { PolicyItem } from '../types/policy';

/**
 * Supabase 테이블 행(화면이 읽는 칸만). 칸 설명: docs/handoff/supabase_schema.md
 * 사용자 값은 들어 있지 않다. 모두 공개 정책 데이터다.
 */
export interface PolicyRow {
  id: string;
  name: string;
  agency: string | null;
  selection: string;
  region_level: string | null;
  category: string | null;
  target_summary: string | null;
  residence_requirement: string | null;
  benefit_text: string | null;
}

export interface NoticeRow {
  id: number;
  notice_key: string;
  policy_id: string;
  source_kind: string;
  title: string;
  operator_label: string | null;
  apply_start: string | null;
  apply_end: string | null;
  apply_period_original: string | null;
  apply_status_original: string | null;
  api_min_age: number | null;
  api_max_age: number | null;
  api_restriction_text: string | null;
  api_documents_text: string | null;
  api_support_text: string | null;
  api_summary: string | null;
  current_year_unconfirmed: boolean;
  collected_on: string | null;
}

export interface RuleRow {
  id: number;
  notice_id: number;
  rule_key: string;
  field_id: string;
  operator: string;
  value: unknown;
  any_of_group: string | null;
  label: string;
  fail_reason: string | null;
  question: string | null;
  choices: unknown;
  unit: string | null;
  sort_order: number | null;
  source_document_id: number | null;
  source_quote: string | null;
  source_locator: string | null;
  review_status: string;
}

export interface RelationshipRow {
  id: number;
  notice_a_id: number;
  notice_b_id: number;
  relation: string;
  condition_text: string | null;
  source_document_id: number | null;
  source_quote: string | null;
  source_locator: string | null;
  review_status: string;
}

export interface DocumentRequirementRow {
  id: number;
  notice_id: number;
  document_id: string | null;
  name: string;
  required: string;
  review_status: string;
}

export interface SourceDocumentRow {
  id: number;
  policy_id: string;
  url: string;
  title: string | null;
}

export interface PersonalFieldRow {
  id: string;
  name: string;
  storage_class: string;
  check_documents: string | null;
  check_content: string | null;
  caution: string | null;
  document_ids: string[] | null;
}

export interface DocumentCatalogRow {
  id: string;
  name: string;
  issuer: string | null;
  issue_path: string | null;
  checkable_content: string | null;
  e_cert_support: string | null;
  kakao_list: string | null;
  naver_list: string | null;
  wallet_external: boolean;
  limits: string | null;
}

export interface RegionRow {
  code: string;
  name: string;
  parent_code: string | null;
  level: string;
}

export interface CatalogRows {
  policy: PolicyRow[];
  policy_notice: NoticeRow[];
  eligibility_rule: RuleRow[];
  policy_relationship: RelationshipRow[];
  document_requirement: DocumentRequirementRow[];
  source_document: SourceDocumentRow[];
  personal_field: PersonalFieldRow[];
  document_catalog: DocumentCatalogRow[];
  region: RegionRow[];
}

export const CATALOG_TABLES: readonly (keyof CatalogRows)[] = [
  'policy',
  'policy_notice',
  'eligibility_rule',
  'policy_relationship',
  'document_requirement',
  'source_document',
  'personal_field',
  'document_catalog',
  'region',
];

export interface CatalogStats {
  policyCount: number;
  reviewedRuleCount: number;
  relationCount: number;
  /** 공고 데이터 수집일 중 가장 늦은 날(YYYY-MM-DD) */
  collectedOn: string | null;
}

/** demo: 시연용 예시 / supabase: 방금 받은 데이터 / cache: 이 브라우저에 받아 둔 데이터 */
export type CatalogSource = 'demo' | 'supabase' | 'cache';

export interface PolicyCatalog {
  source: CatalogSource;
  policies: PolicyItem[];
  /** 화면 맨 위 안내 문구 */
  notice: string;
  stats: CatalogStats | null;
}
