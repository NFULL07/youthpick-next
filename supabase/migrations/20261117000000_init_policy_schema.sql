-- 청년픽 NEXT 첫 스키마: 정책 쪽 데이터 (2026-11-17)
--
-- 이 마이그레이션에 없는 것
-- - 사용자 프로필 테이블: 저장 방식(서버 저장 + 로그인 / 시연은 브라우저 저장) 결정 전이라 만들지 않는다.
-- - 임베딩(pgvector) 칸: 모델과 벡터 차원이 정해지지 않아 만들지 않는다.
--
-- 공통 규칙 (CLAUDE.md 3·4장)
-- - 개인정보 값은 이 스키마의 어떤 테이블에도 저장하지 않는다. personal_field는 항목 "정의"만 담는다.
-- - 판정 규칙·정책 관계는 사람이 검수한 것(reviewed)만 화면에 공개한다. 초안(draft)은 공개 읽기에서 보이지 않는다.
-- - 검수 완료 행은 근거 원문 인용이 있어야 한다. 금지 문구가 없다는 이유로 '병행 가능'을 만들지 않는다.
-- - 공개 읽기는 anon·authenticated, 쓰기는 service_role(적재 스크립트)만.

-- ---------------------------------------------------------------------------
-- 공통: updated_at 자동 갱신
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. 지역 코드
-- ---------------------------------------------------------------------------
create table public.region (
  code        text primary key check (code ~ '^[0-9]{2,5}$'),
  name        text not null,
  parent_code text references public.region (code),
  level       text not null check (level in ('시도', '시군구', '자치구')),
  note        text
);

comment on table public.region is '지역 코드. 온통청년 API zipCd와 같은 코드 체계. 공식 코드표로 재확인 필요';

insert into public.region (code, name, parent_code, level, note) values
  ('44',    '충청남도',      null,    '시도',   'zipCd 앞 두 자리 기준'),
  ('44130', '천안시',        '44',    '시군구', '천안시 단독 정책은 이 코드만 쓰는 경우가 많음'),
  ('44131', '천안시 동남구', '44130', '자치구', '광역·전국 정책은 구 코드를 씀. 천안 사용자는 44130·44131·44133 모두와 대조'),
  ('44133', '천안시 서북구', '44130', '자치구', '광역·전국 정책은 구 코드를 씀. 천안 사용자는 44130·44131·44133 모두와 대조'),
  ('44200', '아산시',        '44',    '시군구', null);

-- ---------------------------------------------------------------------------
-- 2. 개인화 항목 정의 (값이 아니라 정의만. docs/data/personal_fields_v0_3.csv)
-- ---------------------------------------------------------------------------
create table public.personal_field (
  id            text primary key check (id ~ '^[a-z][a-z0-9_]*$'),
  name          text not null,
  category      text,
  storage_class text not null check (storage_class in (
    '기본 저장', '기본 저장(선택)', '시스템 생성',
    '공고별 일시 입력', '공고별 일시 입력(보류)', '수집 제외'
  )),
  input_method  text,
  note          text
);

comment on table public.personal_field is '개인화 항목 69개의 정의. 사용자 값은 저장하지 않는다';
comment on column public.personal_field.storage_class is '수집 제외 항목은 판정 규칙에 쓸 수 없다(트리거로 막음)';

-- ---------------------------------------------------------------------------
-- 3. 서류 목록 (docs/data/doc_requirements_docs_v1.csv)
-- ---------------------------------------------------------------------------
create table public.document_catalog (
  id                text primary key check (id ~ '^D[0-9]{2}$'),
  name              text not null,
  issuer            text,
  issue_path        text,
  checkable_content text,
  e_cert_support    text,
  kakao_list        text,
  naver_list        text,
  wallet_external   boolean not null default false,
  limits            text
);

comment on table public.document_catalog is '확인 서류 39종. wallet_external: 카카오·네이버 공개목록 모두 미확인(지갑 밖 서류)';

-- ---------------------------------------------------------------------------
-- 4. 정책 (연도와 무관한 정책 단위. 후보 ID A1~H1, X1~X10, Z1~Z3)
-- ---------------------------------------------------------------------------
create table public.policy (
  id                    text primary key check (id ~ '^[A-Z][0-9]{1,2}$'),
  name                  text not null,
  agency                text,
  selection             text not null check (selection in ('1차안', '예비', '제외')),
  purpose_group         text,
  region_level          text check (region_level in ('중앙', '충남', '천안', '아산')),
  category              text check (category in ('일자리', '주거', '교육·직업훈련', '금융·복지·문화', '참여·기반')),
  target_summary        text,
  residence_requirement text,
  benefit_type          text,
  benefit_text          text,
  verification_level    text,
  review_status         text not null default '검수 전',
  recheck_note          text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.policy is '정책 단위. 정책 목록은 확정 전(1차안 28, 예비 10, 제외 3)';
comment on column public.policy.category is '온통청년 5대 분야. 확인 전이면 비워 둔다';

create trigger policy_set_updated_at before update on public.policy
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. 공고 (특정 연도·회차·운영 주체의 공고 한 건)
-- ---------------------------------------------------------------------------
create table public.policy_notice (
  id                       bigint generated always as identity primary key,
  notice_key               text not null unique,
  policy_id                text not null references public.policy (id) on delete cascade,
  plcy_no                  text check (plcy_no is null or plcy_no ~ '^[0-9]{20}$'),
  source_kind              text not null check (source_kind in ('api', 'manual')),
  match_status             text not null check (match_status in ('매칭', '매칭(확인 필요)', '묶음 레코드', 'API에 없음')),
  title                    text not null,
  operator_label           text,
  region_label             text,
  zip_codes                text[] not null default '{}',
  notice_year              integer check (notice_year between 2000 and 2100),
  apply_period_type        text,
  apply_start              date,
  apply_end                date,
  apply_period_original    text,
  apply_status_original    text,
  api_min_age              integer,
  api_max_age              integer,
  api_income_code          text,
  api_income_text          text,
  income_text_conflict     boolean not null default false,
  api_school_codes         text[],
  api_job_codes            text[],
  api_special_codes        text[],
  api_marriage_code        text,
  api_major_codes          text[],
  api_extra_qualification  text,
  api_restriction_text     text,
  api_documents_text       text,
  apply_url                text,
  ref_url                  text,
  is_bundle_record         boolean not null default false,
  current_year_unconfirmed boolean not null default false,
  api_last_modified        text,
  review_note              text,
  collected_on             date,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint notice_api_has_plcy_no check (source_kind <> 'api' or plcy_no is not null),
  constraint notice_period_order check (apply_start is null or apply_end is null or apply_start <= apply_end)
);

create index policy_notice_policy_id_idx on public.policy_notice (policy_id);
create index policy_notice_plcy_no_idx on public.policy_notice (plcy_no);

comment on table public.policy_notice is '공고 한 건. 한 정책에 연도·회차·운영 주체별로 여러 건(A1 등록금·생활비, C1 국토부·충남, F1 1차·2차 등)';
comment on column public.policy_notice.notice_key is '적재 키. API 공고는 {정책ID}:{plcyNo}, API에 없는 공고는 {정책ID}:manual';
comment on column public.policy_notice.apply_start is 'API 신청기간. 원문과 다르면 apply_period_original(원문 기준)을 우선한다';
comment on column public.policy_notice.apply_period_original is '원문 기준 접수기간(정책후보표). API 값과 다를 수 있음(D4, D5)';
comment on column public.policy_notice.api_min_age is 'API sprtTrgtMinAge 값 그대로. sprtTrgtAgeLmtYn 플래그는 값과 맞지 않아 쓰지 않는다. 0은 원문 대조 전까지 제한 없음으로 단정하지 않는다';
comment on column public.policy_notice.income_text_conflict is '소득 코드는 무관인데 문구에 소득 기준이 보임. 소득 코드만으로 O 처리 금지';
comment on column public.policy_notice.is_bundle_record is '여러 사업이 한 API 레코드에 묶여 있음(예: 인재육성사업 추진). 정책별로 나눠 공고를 둔다';
comment on column public.policy_notice.current_year_unconfirmed is '2026년 레코드가 없음(이전 연도 자료만). 2026 운영 여부 미확인으로 표시';

create trigger policy_notice_set_updated_at before update on public.policy_notice
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. 근거 문서 (공고·첨부·FAQ·보도)
-- ---------------------------------------------------------------------------
create table public.source_document (
  id                 bigint generated always as identity primary key,
  policy_id          text not null references public.policy (id) on delete cascade,
  notice_id          bigint references public.policy_notice (id) on delete set null,
  url                text not null check (url ~ '^https?://'),
  title              text,
  verification_level text,
  retrieved_on       date,
  note               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (policy_id, url)
);

create index source_document_notice_id_idx on public.source_document (notice_id);

comment on table public.source_document is '근거 문서. verification_level: 공고원문(2026) / 기관 안내·보도 / 2차출처 / 이전 연도 자료만';

create trigger source_document_set_updated_at before update on public.source_document
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. 판정 규칙 (공고에 연결된 조건 하나)
-- ---------------------------------------------------------------------------
create table public.eligibility_rule (
  id                 bigint generated always as identity primary key,
  notice_id          bigint not null references public.policy_notice (id) on delete cascade,
  rule_key           text not null,
  field_id           text not null references public.personal_field (id),
  operator           text not null check (operator in (
    'between', 'gte', 'lte', 'eq', 'in', 'not_in', 'region_in', 'is_true', 'is_false'
  )),
  value              jsonb not null default 'null'::jsonb,
  any_of_group       text,
  label              text not null,
  fail_reason        text,
  source_document_id bigint references public.source_document (id) on delete restrict,
  source_quote       text,
  source_locator     text,
  origin             text not null default 'manual' check (origin in ('manual', 'ai_draft')),
  review_status      text not null default 'draft' check (review_status in ('draft', 'reviewed', 'rejected')),
  reviewed_by        text,
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (notice_id, rule_key),
  constraint rule_value_shape check (
    case operator
      when 'between'   then jsonb_typeof(value) = 'object' and (value ? 'min' or value ? 'max')
      when 'gte'       then jsonb_typeof(value) = 'number'
      when 'lte'       then jsonb_typeof(value) = 'number'
      when 'eq'        then jsonb_typeof(value) in ('string', 'number', 'boolean')
      when 'in'        then jsonb_typeof(value) = 'array' and jsonb_array_length(value) > 0
      when 'not_in'    then jsonb_typeof(value) = 'array' and jsonb_array_length(value) > 0
      when 'region_in' then jsonb_typeof(value) = 'array' and jsonb_array_length(value) > 0
      else true
    end
  ),
  constraint reviewed_rule_has_evidence check (
    review_status <> 'reviewed' or (
      source_quote is not null and length(btrim(source_quote)) > 0
      and reviewed_by is not null and reviewed_at is not null
    )
  )
);

create index eligibility_rule_notice_id_idx on public.eligibility_rule (notice_id);

comment on table public.eligibility_rule is '판정 규칙. 화면(공개 읽기)에는 reviewed만 보인다. 미입력은 X가 아니라 ?로 처리하는 것은 화면 판정 엔진의 몫';
comment on column public.eligibility_rule.any_of_group is '같은 값을 가진 규칙끼리는 하나만 충족하면 된다(OR). 비어 있으면 반드시 충족(AND)';
comment on column public.eligibility_rule.value is 'between: {"min":19,"max":34} / in·not_in·region_in: 배열 / eq: 값 하나 / is_true·is_false: null';
comment on column public.eligibility_rule.origin is 'ai_draft는 AI가 만든 초안. 사람이 검수해 reviewed로 바꾸기 전에는 판정에 쓰지 않는다';

create trigger eligibility_rule_set_updated_at before update on public.eligibility_rule
  for each row execute function public.set_updated_at();

-- 수집 제외 항목은 판정 규칙에 쓸 수 없다
create or replace function public.block_excluded_field_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.personal_field f
    where f.id = new.field_id and f.storage_class = '수집 제외'
  ) then
    raise exception '수집 제외 항목(%)은 판정 규칙에 쓸 수 없습니다', new.field_id;
  end if;
  return new;
end;
$$;

create trigger eligibility_rule_block_excluded_field
  before insert or update of field_id on public.eligibility_rule
  for each row execute function public.block_excluded_field_rule();

-- ---------------------------------------------------------------------------
-- 8. 정책 관계 (두 공고 사이 관계 한 건)
-- ---------------------------------------------------------------------------
create table public.policy_relationship (
  id                 bigint generated always as identity primary key,
  notice_a_id        bigint not null references public.policy_notice (id) on delete cascade,
  notice_b_id        bigint not null references public.policy_notice (id) on delete cascade,
  relation           text not null check (relation in ('병행 제한', '병행 가능', '조건부 병행', '선행조건', '추가 확인')),
  condition_text     text,
  source_document_id bigint references public.source_document (id) on delete restrict,
  source_quote       text,
  source_locator     text,
  origin             text not null default 'manual' check (origin in ('manual', 'ai_draft')),
  review_status      text not null default 'draft' check (review_status in ('draft', 'reviewed', 'rejected')),
  reviewed_by        text,
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (notice_a_id, notice_b_id, relation),
  constraint relationship_distinct check (notice_a_id <> notice_b_id),
  -- 방향이 없는 관계는 작은 id를 a에 둬서 같은 관계가 두 줄로 생기지 않게 한다. 선행조건은 a가 b를 먼저 필요로 함
  constraint relationship_order check (relation = '선행조건' or notice_a_id < notice_b_id),
  constraint reviewed_relationship_has_evidence check (
    review_status <> 'reviewed' or (
      reviewed_by is not null and reviewed_at is not null and (
        (relation <> '추가 확인' and source_quote is not null and length(btrim(source_quote)) > 0)
        or (relation = '추가 확인' and condition_text is not null and length(btrim(condition_text)) > 0)
      )
    )
  ),
  constraint conditional_relationship_has_condition check (
    relation <> '조건부 병행' or (condition_text is not null and length(btrim(condition_text)) > 0)
  )
);

create index policy_relationship_notice_a_idx on public.policy_relationship (notice_a_id);
create index policy_relationship_notice_b_idx on public.policy_relationship (notice_b_id);

comment on table public.policy_relationship is '정책 관계 5종. 검수 완료(병행 가능 포함)는 근거 원문 인용 필수. 추가 확인은 확인할 내용(condition_text) 필수';

create trigger policy_relationship_set_updated_at before update on public.policy_relationship
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. 공고별 제출서류
-- ---------------------------------------------------------------------------
create table public.document_requirement (
  id                 bigint generated always as identity primary key,
  notice_id          bigint not null references public.policy_notice (id) on delete cascade,
  document_id        text references public.document_catalog (id),
  name               text not null,
  required           text not null default '필수' check (required in ('필수', '해당자', '선택')),
  note               text,
  source_document_id bigint references public.source_document (id) on delete restrict,
  review_status      text not null default 'draft' check (review_status in ('draft', 'reviewed', 'rejected')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (notice_id, name)
);

create index document_requirement_notice_id_idx on public.document_requirement (notice_id);

comment on table public.document_requirement is '공고별 제출서류. 화면에는 reviewed만 보인다';

create trigger document_requirement_set_updated_at before update on public.document_requirement
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. 온통청년 API 원본 (공개 읽기 없음. 적재 스크립트·AI 배치가 service_role로 사용)
-- ---------------------------------------------------------------------------
create table public.api_policy_raw (
  plcy_no       text primary key check (plcy_no ~ '^[0-9]{20}$'),
  plcy_nm       text,
  zip_codes     text[] not null default '{}',
  payload       jsonb not null,
  last_modified text,
  collected_on  date not null,
  loaded_at     timestamptz not null default now()
);

create index api_policy_raw_zip_codes_idx on public.api_policy_raw using gin (zip_codes);

comment on table public.api_policy_raw is '온통청년 API 응답 레코드 원본(개인정보 없음). 필드명은 공식 명세가 아니라 공개 코드 기준';

-- ---------------------------------------------------------------------------
-- 접근 권한 (RLS)
-- ---------------------------------------------------------------------------
alter table public.region               enable row level security;
alter table public.personal_field       enable row level security;
alter table public.document_catalog     enable row level security;
alter table public.policy               enable row level security;
alter table public.policy_notice        enable row level security;
alter table public.source_document      enable row level security;
alter table public.eligibility_rule     enable row level security;
alter table public.policy_relationship  enable row level security;
alter table public.document_requirement enable row level security;
alter table public.api_policy_raw       enable row level security;

create policy "공개 읽기" on public.region           for select to anon, authenticated using (true);
create policy "공개 읽기" on public.personal_field   for select to anon, authenticated using (true);
create policy "공개 읽기" on public.document_catalog for select to anon, authenticated using (true);
create policy "공개 읽기" on public.policy           for select to anon, authenticated using (true);
create policy "공개 읽기" on public.policy_notice    for select to anon, authenticated using (true);
create policy "공개 읽기" on public.source_document  for select to anon, authenticated using (true);

create policy "검수 완료만 공개" on public.eligibility_rule
  for select to anon, authenticated using (review_status = 'reviewed');
create policy "검수 완료만 공개" on public.policy_relationship
  for select to anon, authenticated using (review_status = 'reviewed');
create policy "검수 완료만 공개" on public.document_requirement
  for select to anon, authenticated using (review_status = 'reviewed');

-- api_policy_raw: 정책을 만들지 않는다 -> anon·authenticated는 읽기도 불가

-- 쓰기 정책을 만들지 않았으므로 RLS가 쓰기를 막는다. 권한도 함께 거둬 이중으로 막는다
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.api_policy_raw from anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.block_excluded_field_rule() from public, anon, authenticated;
