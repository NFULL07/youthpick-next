import {
  POLICY_CATEGORIES,
  type PolicyCategory,
  type PolicyItem,
  type RecruitmentStatus,
} from '../types/policy';
import { PROFILE_SUPPLIED_FIELDS } from '../utils/ruleEngine';
import type {
  ApiHint,
  EligibilityRule,
  PolicyRelation,
  RelationKind,
  RuleInputItem,
  RuleOperator,
} from '../utils/ruleTypes';
import type {
  CatalogRows,
  CatalogStats,
  DocumentCatalogRow,
  NoticeRow,
  PersonalFieldRow,
  PolicyRow,
  RegionRow,
  RuleRow,
} from './catalogTypes';
import { DIRECT_INPUT_ITEMS } from './docRequirements.generated';
import type { RequirementDoc } from './docRequirementTypes';

/**
 * Supabase에서 받은 행을 화면의 정책 목록(PolicyItem)으로 바꾼다.
 * - 판정 규칙·관계·제출서류는 검수 완료만 쓴다(RLS가 걸러 주지만 여기서도 한 번 더 거른다).
 * - 값이 없으면 그럴듯한 값으로 채우지 않고 '공고에서 확인'으로 둔다.
 * - API 값(연령 등)은 참고로만 붙이고 판정에 쓰지 않는다.
 */

const OPERATORS: readonly RuleOperator[] = [
  'age_between', 'between', 'gte', 'lte', 'eq', 'in', 'not_in', 'region_in', 'is_true', 'is_false',
];
const RELATIONS: readonly RelationKind[] = ['병행 제한', '병행 가능', '조건부 병행', '선행조건', '추가 확인'];

const REGION_LEVEL_NAMES: Record<string, string[]> = {
  중앙: ['전국'],
  충남: ['충청남도'],
  천안: ['충청남도 천안시'],
  아산: ['충청남도 아산시'],
};

const ACCENT_BY_CATEGORY: Record<PolicyCategory, PolicyItem['accentTheme']> = {
  일자리: 'lime',
  주거: 'peach',
  '교육·직업훈련': 'lavender',
  '금융·복지·문화': 'sage',
  '참여·기반': 'lavender',
};

function isCategory(value: string | null): value is PolicyCategory {
  return value !== null && (POLICY_CATEGORIES as readonly string[]).includes(value);
}

/** 오늘 날짜(YYYY-MM-DD, 한국 시간) */
export function toDateKey(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * 공고의 모집 상태. 원문 기준 상태(정책후보표)를 우선하고,
 * '접수중'은 API 접수 종료일이 지났으면 마감으로 본다. 그 밖에는 단정하지 않는다.
 */
export function noticeStatus(notice: NoticeRow, today: string): RecruitmentStatus {
  const original = notice.apply_status_original;
  if (original === '마감') return '마감';
  if (notice.current_year_unconfirmed) return '공고 확인 필요';
  if (original === '접수중') {
    return notice.apply_end && today > notice.apply_end ? '마감' : '모집 중';
  }
  if (original === '상시·수시') return '모집 중';
  return '공고 확인 필요';
}

function formatDate(value: string): string {
  const [y, m, d] = value.split('-');
  return `${y}.${Number(m)}.${Number(d)}`;
}

function deadlineLabel(notice: NoticeRow | undefined): string {
  if (!notice) return '접수기간은 공고에서 확인';
  const period =
    notice.apply_period_original ??
    (notice.apply_start && notice.apply_end
      ? `${formatDate(notice.apply_start)}~${formatDate(notice.apply_end)} (API 기준)`
      : null);
  if (!period) return '접수기간은 공고에서 확인';
  return notice.current_year_unconfirmed ? `2026년 운영 여부 미확인 · ${period}` : period;
}

/** 지역 코드 -> 화면 지역 이름. 자치구는 화면 지역 목록에 없어 상위 시 이름으로 바꾼다 */
export function buildRegionNames(regions: RegionRow[]): Record<string, string> {
  const byCode = new Map(regions.map((r) => [r.code, r]));
  const nameOf = (region: RegionRow, depth = 0): string | null => {
    if (depth > 3) return null;
    if (region.level === '시도') return region.name;
    const parent = region.parent_code ? byCode.get(region.parent_code) : undefined;
    if (!parent) return null;
    const parentName = nameOf(parent, depth + 1);
    if (!parentName) return null;
    return region.level === '자치구' ? parentName : `${parentName} ${region.name}`;
  };
  const names: Record<string, string> = {};
  for (const region of regions) {
    const name = nameOf(region);
    if (name) names[region.code] = name;
  }
  return names;
}

function toRule(
  row: RuleRow,
  fields: Map<string, PersonalFieldRow>,
  sources: Map<number, { url: string; title: string | null }>
): EligibilityRule | null {
  if (row.review_status !== 'reviewed') return null;
  if (!(OPERATORS as readonly string[]).includes(row.operator)) return null;
  const field = fields.get(row.field_id);
  // 수집 제외 항목으로 만든 규칙은 쓰지 않는다(DB도 막지만 한 번 더 확인)
  if (!field || field.storage_class === '수집 제외') return null;
  const source = row.source_document_id !== null ? sources.get(row.source_document_id) : undefined;
  const choices =
    Array.isArray(row.choices) && row.choices.every((c) => typeof c === 'string')
      ? (row.choices as string[])
      : null;
  return {
    id: row.id,
    ruleKey: row.rule_key,
    fieldId: row.field_id,
    fieldName: field.name,
    operator: row.operator as RuleOperator,
    value: row.value,
    anyOfGroup: row.any_of_group,
    label: row.label,
    failReason: row.fail_reason,
    question: row.question,
    choices,
    unit: row.unit,
    sortOrder: row.sort_order ?? 0,
    sourceQuote: row.source_quote,
    sourceLocator: row.source_locator,
    sourceTitle: source?.title ?? null,
    sourceUrl: source?.url ?? null,
  };
}

function toRequirementDoc(row: DocumentCatalogRow): RequirementDoc {
  return {
    id: row.id,
    name: row.name,
    issuer: row.issuer ?? '',
    issuePath: row.issue_path ?? '',
    checkableContent: row.checkable_content ?? '',
    govCertSupport: row.e_cert_support ?? '',
    kakaoList: row.kakao_list ?? '',
    naverList: row.naver_list ?? '',
    relatedItemNumbers: [],
    limits: row.limits ?? '',
    walletExternal: row.wallet_external,
  };
}

function buildInputItems(
  rules: EligibilityRule[],
  fields: Map<string, PersonalFieldRow>,
  documents: Map<string, DocumentCatalogRow>,
  regionNames: Record<string, string>
): RuleInputItem[] {
  const byField = new Map<string, EligibilityRule[]>();
  for (const rule of rules) {
    if (PROFILE_SUPPLIED_FIELDS.includes(rule.fieldId)) continue;
    byField.set(rule.fieldId, [...(byField.get(rule.fieldId) ?? []), rule]);
  }
  return Array.from(byField.entries()).map(([fieldId, fieldRules]) => {
    const known = DIRECT_INPUT_ITEMS.find((item) => item.fieldId === fieldId);
    const field = fields.get(fieldId);
    const docIds = known?.docIds ?? field?.document_ids ?? [];
    const docs = docIds
      .map((id) => documents.get(id))
      .filter((doc): doc is DocumentCatalogRow => Boolean(doc))
      .map(toRequirementDoc);
    const base = known ?? {
      number: 0,
      label: field?.name ?? fieldId,
      fieldId,
      storage: field?.storage_class ?? '공고별 일시 입력',
      docsLabel: field?.check_documents ?? '공고에서 확인',
      issuer: '',
      checkMethod: '',
      checkContent: field?.check_content ?? '공고가 요구하는 기준으로 확인해 주세요.',
      caution: field?.caution ?? '공고 원문의 기준을 확인해 주세요.',
      docIds,
    };
    return { ...base, rules: fieldRules, docs, regionNames };
  });
}

function buildApiHints(notice: NoticeRow | undefined, hasAgeRule: boolean, hasDocuments: boolean): ApiHint[] {
  if (!notice || notice.source_kind !== 'api') return [];
  const hints: ApiHint[] = [];
  const min = notice.api_min_age ?? 0;
  const max = notice.api_max_age ?? 0;
  // 0은 값 없음. 최소 1세는 조건이 아니다
  if (!hasAgeRule && (min > 1 || max > 0)) {
    const text = min > 1 && max > 0 ? `만 ${min}~${max}세` : max > 0 ? `만 ${max}세 이하` : `만 ${min}세 이상`;
    hints.push({ kind: 'age', item: '연령 (API 참고)', text, minAge: min > 1 ? min : undefined, maxAge: max > 0 ? max : undefined });
  }
  if (notice.api_restriction_text?.trim()) {
    hints.push({ kind: 'restriction', item: '참여 제한 (API 참고)', text: notice.api_restriction_text.trim() });
  }
  if (!hasDocuments && notice.api_documents_text?.trim()) {
    hints.push({ kind: 'documents', item: '제출 서류 (API 참고)', text: notice.api_documents_text.trim() });
  }
  return hints;
}

const STATUS_RANK: Record<RecruitmentStatus, number> = { '모집 중': 2, '공고 확인 필요': 1, 마감: 0 };

/** 정책의 대표 공고: 검수 완료 규칙이 있는 공고 > 모집 중 > 접수 종료일이 늦은 공고 */
function pickNotice(notices: NoticeRow[], ruleCount: Map<number, number>, today: string): NoticeRow | undefined {
  return [...notices].sort((a, b) => {
    const rules = Number((ruleCount.get(b.id) ?? 0) > 0) - Number((ruleCount.get(a.id) ?? 0) > 0);
    if (rules !== 0) return rules;
    const status = STATUS_RANK[noticeStatus(b, today)] - STATUS_RANK[noticeStatus(a, today)];
    if (status !== 0) return status;
    return (b.apply_end ?? '').localeCompare(a.apply_end ?? '') || a.id - b.id;
  })[0];
}

function compareIds(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true });
}

export function buildPolicies(rows: CatalogRows, now: Date): { policies: PolicyItem[]; stats: CatalogStats } {
  const today = toDateKey(now);
  const fields = new Map(rows.personal_field.map((f) => [f.id, f]));
  const documents = new Map(rows.document_catalog.map((d) => [d.id, d]));
  const sources = new Map(rows.source_document.map((s) => [s.id, { url: s.url, title: s.title }]));
  const regionNames = buildRegionNames(rows.region);
  const noticeById = new Map(rows.policy_notice.map((n) => [n.id, n]));
  const policyById = new Map(rows.policy.map((p) => [p.id, p]));

  const rulesByNotice = new Map<number, EligibilityRule[]>();
  for (const ruleRow of rows.eligibility_rule) {
    const rule = toRule(ruleRow, fields, sources);
    if (rule) rulesByNotice.set(ruleRow.notice_id, [...(rulesByNotice.get(ruleRow.notice_id) ?? []), rule]);
  }
  const ruleCount = new Map(Array.from(rulesByNotice.entries()).map(([id, list]) => [id, list.length]));

  const shown = rows.policy
    .filter((p): p is PolicyRow & { category: PolicyCategory } => p.selection === '1차안' && isCategory(p.category))
    .sort((a, b) => compareIds(a.id, b.id));

  const relationsByPolicy = new Map<string, PolicyRelation[]>();
  let relationCount = 0;
  for (const rel of rows.policy_relationship) {
    if (rel.review_status !== 'reviewed' || !(RELATIONS as readonly string[]).includes(rel.relation)) continue;
    const a = noticeById.get(rel.notice_a_id);
    const b = noticeById.get(rel.notice_b_id);
    const policyA = a ? policyById.get(a.policy_id) : undefined;
    const policyB = b ? policyById.get(b.policy_id) : undefined;
    if (!policyA || !policyB || policyA.id === policyB.id) continue;
    relationCount += 1;
    const source = rel.source_document_id !== null ? sources.get(rel.source_document_id) : undefined;
    const common = {
      relation: rel.relation as RelationKind,
      conditionText: rel.condition_text,
      sourceQuote: rel.source_quote,
      sourceLocator: rel.source_locator,
      sourceTitle: source?.title ?? null,
      sourceUrl: source?.url ?? null,
    };
    const directed = rel.relation === '선행조건';
    const add = (self: PolicyRow, other: PolicyRow, direction: PolicyRelation['direction']) => {
      const list = relationsByPolicy.get(self.id) ?? [];
      if (list.some((r) => r.otherPolicyId === other.id && r.relation === common.relation)) return;
      relationsByPolicy.set(self.id, [
        ...list,
        { ...common, otherPolicyId: other.id, otherPolicyTitle: other.name, direction },
      ]);
    };
    add(policyA, policyB, directed ? 'needs' : null);
    add(policyB, policyA, directed ? 'needed_by' : null);
  }

  const policies = shown.map((policy, index): PolicyItem => {
    const notices = rows.policy_notice.filter((n) => n.policy_id === policy.id);
    const notice = pickNotice(notices, ruleCount, today);
    const rules = notice ? (rulesByNotice.get(notice.id) ?? []) : [];
    const documentNames = notice
      ? rows.document_requirement
          .filter((d) => d.notice_id === notice.id && d.review_status === 'reviewed')
          .map((d) => (d.required === '필수' ? d.name : `${d.name}(${d.required})`))
      : [];
    const hasAgeRule = rules.some((r) => r.operator === 'age_between');

    const checklist = [
      {
        id: `${policy.id}-c1`,
        title: '공식 공고·모집 상태 확인',
        detail: '시행기관의 최신 공고에서 접수기간과 대상을 확인',
        tag: '직접 점검',
      },
      {
        id: `${policy.id}-c2`,
        title: '조건표의 ? 항목 확인',
        detail: '정책 상세의 조건표에서 ?로 남은 항목을 공고와 대조',
        tag: '직접 점검',
      },
      ...(documentNames.length > 0
        ? documentNames.map((name, i) => ({
            id: `${policy.id}-d${i + 1}`,
            title: `${name} 준비`,
            detail: '발급처와 유효기간을 공고 기준으로 확인',
            tag: '할 일',
          }))
        : [
            {
              id: `${policy.id}-c3`,
              title: '제출 서류 확인',
              detail: '공고의 제출 서류 목록을 확인하고 준비',
              tag: '할 일',
            },
          ]),
    ];

    return {
      id: policy.id,
      pickNumber: `PICK ${String(index + 1).padStart(2, '0')}`,
      title: policy.name,
      agencyLabel: policy.agency ?? notice?.operator_label ?? '운영기관은 공고에서 확인',
      category: policy.category,
      accentTheme: ACCENT_BY_CATEGORY[policy.category],
      recruitmentStatus: notice ? noticeStatus(notice, today) : '공고 확인 필요',
      deadlineLabel: deadlineLabel(notice),
      shortDescription: policy.target_summary ?? notice?.api_summary ?? '대상은 공고에서 확인해 주세요.',
      supportSummary: policy.benefit_text ?? notice?.api_support_text ?? '지원 내용은 공고에서 확인해 주세요.',
      keyCheckHint: policy.residence_requirement ?? '거주·소속 요건은 공고에서 확인해 주세요.',
      badgeText: '추가 확인',
      targetRegions: REGION_LEVEL_NAMES[policy.region_level ?? ''] ?? [],
      targetStatuses: [],
      minAge: notice?.api_min_age ?? 0,
      maxAge: notice?.api_max_age ?? 0,
      requiredDocs: documentNames.length > 0 ? documentNames : ['공고에서 확인'],
      checklist,
      dataSource: 'supabase',
      ruleSet: {
        noticeTitle: notice?.title ?? policy.name,
        rules,
        relations: relationsByPolicy.get(policy.id) ?? [],
        apiHints: buildApiHints(notice, hasAgeRule, documentNames.length > 0),
        documentNames,
        regionNames,
        inputItems: buildInputItems(rules, fields, documents, regionNames),
      },
    };
  });

  const collected = rows.policy_notice
    .map((n) => n.collected_on)
    .filter((d): d is string => Boolean(d))
    .sort();
  return {
    policies,
    stats: {
      policyCount: policies.length,
      reviewedRuleCount: policies.reduce((sum, p) => sum + (p.ruleSet?.rules.length ?? 0), 0),
      relationCount,
      collectedOn: collected.length > 0 ? collected[collected.length - 1] : null,
    },
  };
}
