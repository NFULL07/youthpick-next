-- 청년픽 NEXT 스키마 점검 (마이그레이션 적용 후 Supabase SQL 편집기에서 실행)
-- 점검용 행을 넣었다가 마지막에 rollback 하므로 DB에 아무것도 남지 않는다.
-- 결과 표의 passed가 모두 true면 통과. (마이그레이션 2개를 모두 적용한 뒤 실행)

begin;

-- 점검용 데이터 (ID는 실제 데이터와 겹치지 않게 zz_, Z98·Z99 사용)
insert into public.personal_field (id, name, storage_class) values
  ('zz_check_age', '점검용 항목', '기본 저장'),
  ('zz_check_excluded', '점검용 수집 제외 항목', '수집 제외');
insert into public.policy (id, name, selection) values
  ('Z98', '점검용 정책 A', '제외'),
  ('Z99', '점검용 정책 B', '제외');
insert into public.policy_notice (notice_key, policy_id, source_kind, match_status, title) values
  ('Z98:manual', 'Z98', 'manual', 'API에 없음', '점검용 공고 A'),
  ('Z99:manual', 'Z99', 'manual', 'API에 없음', '점검용 공고 B');

insert into public.source_document (policy_id, url) values ('Z98', 'https://example.org/zz-check');

create temp table _ids on commit drop as
  select (select id from public.policy_notice where notice_key = 'Z98:manual') as a,
         (select id from public.policy_notice where notice_key = 'Z99:manual') as b,
         (select id from public.source_document where policy_id = 'Z98') as s;
create temp table _result (check_name text, passed boolean) on commit drop;
grant select on _ids to anon, authenticated;
grant insert, select on _result to anon, authenticated;

insert into public.eligibility_rule (notice_id, rule_key, field_id, operator, value, label)
  select a, 'zz_draft', 'zz_check_age', 'age_between', '{"min":19,"max":34}', '점검 초안' from _ids;
insert into public.eligibility_rule (notice_id, rule_key, field_id, operator, value, label,
                                     source_document_id, source_quote, reviewed_by, reviewed_at, review_status)
  select a, 'zz_reviewed', 'zz_check_age', 'age_between', '{"min":19,"max":34}', '점검 검수 완료',
         s, '점검용 인용', '점검', now(), 'reviewed' from _ids;
-- 값이 없는 연산자(is_true)는 값 없이 들어가야 한다
insert into public.eligibility_rule (notice_id, rule_key, field_id, operator, value, label)
  select a, 'zz_bool', 'zz_check_age', 'is_true', null, '점검 예·아니오' from _ids;

-- 1) 데이터 규칙 (관리자 권한)
do $$
declare a bigint; b bigint; s bigint;
begin
  select _ids.a, _ids.b, _ids.s into a, b, s from _ids;

  begin
    insert into public.eligibility_rule (notice_id, rule_key, field_id, operator, value, label,
                                         source_quote, reviewed_by, reviewed_at, review_status)
    values (a, 'zz_no_source', 'zz_check_age', 'gte', '19', 'x', '점검용 인용', '점검', now(), 'reviewed');
    insert into _result values ('검수 완료 규칙은 근거 문서가 연결돼야 함', false);
  exception when check_violation then
    insert into _result values ('검수 완료 규칙은 근거 문서가 연결돼야 함', true);
  end;

  begin
    insert into public.eligibility_rule (notice_id, rule_key, field_id, operator, value, label)
    values (a, 'zz_null_value', 'zz_check_age', 'in', null, 'x');
    insert into _result values ('값이 필요한 연산자는 빈 값 거부', false);
  exception when check_violation then
    insert into _result values ('값이 필요한 연산자는 빈 값 거부', true);
  end;

  begin
    insert into public.eligibility_rule (notice_id, rule_key, field_id, operator, value, label, source_document_id, review_status, reviewed_by, reviewed_at)
    values (a, 'zz_no_quote', 'zz_check_age', 'gte', '19', 'x', s, 'reviewed', '점검', now());
    insert into _result values ('검수 완료 규칙은 근거 인용이 있어야 함', false);
  exception when check_violation then
    insert into _result values ('검수 완료 규칙은 근거 인용이 있어야 함', true);
  end;

  begin
    insert into public.eligibility_rule (notice_id, rule_key, field_id, operator, value, label)
    values (a, 'zz_excluded', 'zz_check_excluded', 'eq', '"x"', 'x');
    insert into _result values ('수집 제외 항목은 판정 규칙에 못 씀', false);
  exception when raise_exception then
    insert into _result values ('수집 제외 항목은 판정 규칙에 못 씀', true);
  end;

  begin
    insert into public.eligibility_rule (notice_id, rule_key, field_id, operator, value, label)
    values (a, 'zz_shape', 'zz_check_age', 'between', '19', 'x');
    insert into _result values ('연산자에 맞지 않는 값 모양은 거부', false);
  exception when check_violation then
    insert into _result values ('연산자에 맞지 않는 값 모양은 거부', true);
  end;

  begin
    insert into public.policy_relationship (notice_a_id, notice_b_id, relation, review_status, reviewed_by, reviewed_at)
    values (least(a, b), greatest(a, b), '병행 가능', 'reviewed', '점검', now());
    insert into _result values ('근거 없는 병행 가능은 검수 완료로 못 둠', false);
  exception when check_violation then
    insert into _result values ('근거 없는 병행 가능은 검수 완료로 못 둠', true);
  end;

  begin
    insert into public.policy_relationship (notice_a_id, notice_b_id, relation, source_quote)
    values (greatest(a, b), least(a, b), '병행 제한', '점검용 인용');
    insert into _result values ('방향 없는 관계는 한 줄만(작은 id가 a)', false);
  exception when check_violation then
    insert into _result values ('방향 없는 관계는 한 줄만(작은 id가 a)', true);
  end;

  begin
    insert into public.policy_notice (notice_key, policy_id, source_kind, match_status, title)
    values ('Z98:bad', 'Z98', 'api', '매칭', 'x');
    insert into _result values ('API 공고는 plcyNo가 있어야 함', false);
  exception when check_violation then
    insert into _result values ('API 공고는 plcyNo가 있어야 함', true);
  end;
end $$;

-- 2) 공개 읽기 권한 (anon = 로그인하지 않은 화면)
set local role anon;
insert into _result
  select 'anon은 검수 완료 규칙만 봄',
         (select count(*) from public.eligibility_rule where rule_key like 'zz_%') = 1
         and exists (select 1 from public.eligibility_rule where rule_key = 'zz_reviewed');
insert into _result
  select 'anon은 정책·공고를 읽을 수 있음',
         exists (select 1 from public.policy where id = 'Z98')
         and exists (select 1 from public.policy_notice where notice_key = 'Z98:manual');
do $$
begin
  begin
    insert into public.policy (id, name, selection) values ('Z97', 'x', '제외');
    insert into _result values ('anon은 정책을 쓸 수 없음', false);
  exception when insufficient_privilege then
    insert into _result values ('anon은 정책을 쓸 수 없음', true);
  end;
  begin
    perform 1 from public.api_policy_raw limit 1;
    insert into _result values ('anon은 API 원본을 읽을 수 없음', false);
  exception when insufficient_privilege then
    insert into _result values ('anon은 API 원본을 읽을 수 없음', true);
  end;
end $$;
reset role;

set local role authenticated;
do $$
begin
  begin
    delete from public.policy where id = 'Z98';
    insert into _result values ('authenticated는 정책을 지울 수 없음', false);
  exception when insufficient_privilege then
    insert into _result values ('authenticated는 정책을 지울 수 없음', true);
  end;
end $$;
reset role;

select check_name, passed from _result order by passed, check_name;

rollback;
