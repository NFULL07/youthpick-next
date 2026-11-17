-- 청년픽 NEXT 2차 마이그레이션: 화면 연결에 필요한 칸 보강 (2026-11-17)
--
-- 첫 마이그레이션(20261117000000) 위에 더한다. 원칙은 같다:
-- 개인정보 값은 저장하지 않고, 판정 규칙·관계·제출서류는 검수 완료만 공개한다.

-- ---------------------------------------------------------------------------
-- 1. 정책: 분야를 어디서 정했는지 기록
-- ---------------------------------------------------------------------------
alter table public.policy add column category_basis text;

comment on column public.policy.category_basis is
  '분야(category)의 근거. "온통청년 API 대분류" 또는 "목적묶음 기준 잠정". 잠정은 확인 후 고친다';

-- ---------------------------------------------------------------------------
-- 2. 공고: 화면 표시에 쓰는 API 원문 칸
-- ---------------------------------------------------------------------------
alter table public.policy_notice
  add column api_category     text,
  add column api_subcategory  text,
  add column api_support_text text,
  add column api_summary      text;

comment on column public.policy_notice.api_category is 'API lclsfNm(정책 대분류). 필드명은 공개 코드 기준';
comment on column public.policy_notice.api_subcategory is 'API mclsfNm(정책 중분류)';
comment on column public.policy_notice.api_support_text is 'API plcySprtCn(지원 내용 원문). 원문 대조 전';
comment on column public.policy_notice.api_summary is 'API plcyExplnCn(정책 설명 원문). 응답에 있을 때만';

-- ---------------------------------------------------------------------------
-- 3. 개인화 항목: 어떤 서류로 확인하는지 (docs/data/doc_requirements_items_v1.csv)
-- ---------------------------------------------------------------------------
alter table public.personal_field
  add column check_documents text,
  add column check_content   text,
  add column caution         text,
  add column document_ids    text[] not null default '{}';

comment on column public.personal_field.check_documents is '이 항목을 확인할 서류·자료 이름';
comment on column public.personal_field.document_ids is 'document_catalog.id 목록';

-- ---------------------------------------------------------------------------
-- 4. 판정 규칙: 나이 연산자, 입력 질문, 표시 순서
-- ---------------------------------------------------------------------------
alter table public.eligibility_rule
  add column question   text,
  add column choices    jsonb,
  add column unit       text,
  add column sort_order integer not null default 0;

comment on column public.eligibility_rule.question is '사용자에게 물을 질문. 비어 있으면 label을 쓴다';
comment on column public.eligibility_rule.choices is '선택형 입력의 보기(문자열 배열). 비어 있으면 규칙 값에서 만든다';
comment on column public.eligibility_rule.unit is '숫자 입력의 단위(원, 시간, 개월 등)';

-- is_true·is_false 규칙은 값이 없다. REST로 넣을 때 JSON null이 SQL NULL로 들어오므로 NULL을 허용한다
alter table public.eligibility_rule alter column value drop not null;
alter table public.eligibility_rule alter column value drop default;

alter table public.eligibility_rule
  add constraint rule_choices_is_array check (choices is null or jsonb_typeof(choices) = 'array');

-- 연산자에 age_between(만 나이 범위) 추가
alter table public.eligibility_rule drop constraint eligibility_rule_operator_check;
alter table public.eligibility_rule add constraint eligibility_rule_operator_check check (operator in (
  'age_between', 'between', 'gte', 'lte', 'eq', 'in', 'not_in', 'region_in', 'is_true', 'is_false'
));

alter table public.eligibility_rule drop constraint rule_value_shape;
-- 값이 필요한 연산자는 값이 비어 있으면 거부한다(coalesce: NULL이면 통과가 아니라 거부)
alter table public.eligibility_rule add constraint rule_value_shape check (
  coalesce(
    case operator
      when 'age_between' then jsonb_typeof(value) = 'object' and (value ? 'min' or value ? 'max')
      when 'between'     then jsonb_typeof(value) = 'object' and (value ? 'min' or value ? 'max')
      when 'gte'         then jsonb_typeof(value) = 'number'
      when 'lte'         then jsonb_typeof(value) = 'number'
      when 'eq'          then jsonb_typeof(value) in ('string', 'number', 'boolean')
      when 'in'          then jsonb_typeof(value) = 'array' and jsonb_array_length(value) > 0
      when 'not_in'      then jsonb_typeof(value) = 'array' and jsonb_array_length(value) > 0
      when 'region_in'   then jsonb_typeof(value) = 'array' and jsonb_array_length(value) > 0
      else true
    end,
    false
  )
);

comment on column public.eligibility_rule.value is
  'age_between·between: {"min":19,"max":34} / in·not_in: 문자열 배열 / region_in: 지역 코드 배열 / eq: 값 하나 / is_true·is_false: null';

-- 초안 출처에 api_draft(API 값에서 기계적으로 만든 초안) 추가
alter table public.eligibility_rule drop constraint eligibility_rule_origin_check;
alter table public.eligibility_rule add constraint eligibility_rule_origin_check
  check (origin in ('manual', 'ai_draft', 'api_draft'));
alter table public.policy_relationship drop constraint policy_relationship_origin_check;
alter table public.policy_relationship add constraint policy_relationship_origin_check
  check (origin in ('manual', 'ai_draft', 'api_draft'));

comment on column public.eligibility_rule.origin is
  'manual: 사람이 작성 / ai_draft: AI 초안 / api_draft: API 값에서 만든 초안. 초안은 검수해 reviewed로 바꾸기 전에는 판정에 쓰지 않는다';

-- 검수 완료 규칙·관계는 어느 문서에서 나온 근거인지(source_document)도 연결해야 한다.
-- 화면은 조건마다 근거 문서를 함께 보여준다.
alter table public.eligibility_rule add constraint reviewed_rule_has_source_document check (
  review_status <> 'reviewed' or source_document_id is not null
);
alter table public.policy_relationship add constraint reviewed_relationship_has_source_document check (
  review_status <> 'reviewed' or relation = '추가 확인' or source_document_id is not null
);

-- 새로 만든 칸에도 쓰기 권한이 생기지 않게 다시 거둔다(테이블 단위 권한이라 변화는 없지만 명시)
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
