# Supabase 스키마와 적재 (v0.1, 2026-11-17)

작성: Claude(Cowork), 주완 요청 · 상태: **코드 작성과 로컬 검증 완료, 원격 Supabase에는 아직 적용 안 함**

> 앞 단계 문서: `docs/handoff/supabase_setup.md` (설계 방향, 데이터 현황, 품질 문제 1~10). 공통 규칙은 `CLAUDE.md`.

## 0. 이 브랜치에 들어 있는 것

| 파일 | 내용 |
|---|---|
| `supabase/migrations/20261117000000_init_policy_schema.sql` | 테이블 10개, 제약조건, 트리거, RLS |
| `supabase/checks/schema_checks.sql` | 적용 후 점검 11개. 점검용 행을 넣고 마지막에 rollback |
| `pipeline/load_supabase.py` | CSV와 API 원본을 Supabase에 넣는 적재 스크립트(표준 라이브러리만) |
| `pipeline/tests/test_load_supabase.py` | 적재 스크립트 테스트 4개 |
| `.env.example` | 필요한 환경변수 이름(값 없음) |

만들지 않은 것: 사용자 프로필 테이블(저장 방식 결정 전), 임베딩 칸(모델 미정), 판정 규칙·정책 관계·제출서류 **내용**(사람이 검수해서 넣음).

## 1. 테이블

| 테이블 | 한 행 | 공개 읽기(anon) | 채우는 방법 |
|---|---|---|---|
| `region` | 지역 코드 하나 (충남 44, 천안 44130·44131·44133, 아산 44200) | 전부 | 마이그레이션에 포함 |
| `personal_field` | 개인화 항목 **정의** 하나 (69개, 값 아님) | 전부 | 적재 스크립트 |
| `document_catalog` | 확인 서류 하나 (39종, 지갑 밖 14종 표시) | 전부 | 적재 스크립트 |
| `policy` | 정책 하나 (후보 41건: 1차안 28, 예비 10, 제외 3) | 전부 | 적재 스크립트 |
| `policy_notice` | 공고 한 건 (1차안 28건 -> 공고 33건: API 26 + API에 없음 7) | 전부 | 적재 스크립트 |
| `source_document` | 근거 문서 URL 하나 | 전부 | 적재 스크립트(정책후보표 URL), 이후 수기 |
| `eligibility_rule` | 공고의 조건 하나 | **검수 완료만** | 사람이 검수해서 입력 |
| `policy_relationship` | 두 공고 사이 관계 하나 (5종) | **검수 완료만** | 사람이 검수해서 입력 |
| `document_requirement` | 공고별 제출서류 하나 | **검수 완료만** | 사람이 검수해서 입력 |
| `api_policy_raw` | 온통청년 API 레코드 원본 하나 | **읽기 불가** | 적재 스크립트(service_role) |

쓰기는 모든 테이블에서 service_role만 된다(anon·authenticated는 RLS와 권한 회수로 이중 차단).

DB가 직접 막는 규칙:

- 검수 완료(reviewed) 판정 규칙과 관계는 근거 원문 인용(source_quote), 검수자, 검수 시각이 있어야 한다. 금지 문구가 없다는 이유로 '병행 가능'을 검수 완료로 둘 수 없다.
- '추가 확인' 관계는 인용 대신 확인할 내용(condition_text)이 있어야 하고, '조건부 병행'은 조건이 있어야 한다.
- 수집 제외 항목(주민등록번호 등 6개)은 판정 규칙에 쓸 수 없다(트리거).
- 연산자에 맞지 않는 값 모양은 거부(between은 `{"min","max"}`, in·region_in은 배열 등).
- 방향이 없는 관계는 작은 공고 id를 a에 둬서 같은 관계가 두 줄로 생기지 않는다. 선행조건만 방향이 있다(a가 b를 먼저 필요로 함).

## 2. 판정 규칙 한 줄의 모양

```text
notice_id   : 어느 공고의 조건인지
rule_key    : 공고 안에서 고유한 이름 (age, resident_region ...)
field_id    : personal_field.id (birth_year, resident_sigungu ...)
operator    : between | gte | lte | eq | in | not_in | region_in | is_true | is_false
value       : between {"min":19,"max":34} / region_in ["44130","44131","44133"] / eq "대학 재학"
any_of_group: 같은 값끼리는 하나만 충족하면 됨(OR). 비어 있으면 반드시 충족(AND)
label       : 화면 문구 "만 19~34세"
fail_reason : X일 때 보여줄 이유
source_quote: 근거 원문 인용 (검수 완료면 필수)
review_status: draft -> reviewed (화면에는 reviewed만)
```

미입력이면 X가 아니라 ?로 두는 것, ?를 O·X로 바꾸지 않는 것은 화면의 판정 엔진이 지킨다(CLAUDE.md 4장).

## 3. 품질 문제 1~10 처리 (supabase_setup.md 3장)

| 번호 | 문제 | 처리 |
|---|---|---|
| 1 | 천안 코드 44130 / 44131·44133 혼용 | `region` 표와 `zip_codes` 배열 보관. 천안 사용자는 세 코드 모두와 대조(규칙 `region_in`) |
| 2 | 연령 플래그와 값 불일치 | `api_min_age`·`api_max_age`에 값만 보관, 플래그는 안 씀. 0은 원문 대조 전까지 단정하지 않음 |
| 3 | 소득 코드 '무관'인데 문구에 소득 기준 | `income_text_conflict` 표시(문자열 기준, 사람이 다시 봄). 소득 코드만으로 O 처리 금지 |
| 4 | 묶음 레코드(인재육성사업 추진) | A2·B2·B3가 같은 plcyNo로 각각 공고를 가짐, `is_bundle_record` 표시 |
| 5 | 한 정책에 레코드 여러 개 | 레코드마다 공고 한 건(A1 2건, C1 2건, F1 2건, F2 2건, G2 2건) |
| 6 | API 기간·상태와 원문 불일치(D4, D5) | API 기간(`apply_start`·`apply_end`)과 원문 기간(`apply_period_original`)을 따로 보관. 원문 우선 |
| 7 | 이전 연도 레코드만 있음 | `current_year_unconfirmed` 표시(D2, E5, G2) |
| 8 | C2 매칭 확인 필요 | `match_status = '매칭(확인 필요)'` |
| 9 | F2 소득 문구 혼재 | 원문 칸(`api_extra_qualification`, `api_income_text`)에 보관. 규칙 검수 때 정리 |
| 10 | C3 새 제한 문구 | `api_restriction_text`에 보관. 관계 검수 때 근거로 사용 |

## 4. 원격 Supabase에 적용하는 방법 (셋 중 하나)

먼저 Supabase 대시보드에서 청년픽용 새 프로젝트를 만든다(서울, 무료 플랜). DB 비밀번호는 저장소에 넣지 않는다.

1. **SQL 편집기**: 마이그레이션 파일 내용을 그대로 붙여 넣고 실행. 가장 빠름.
2. **Supabase CLI**: `npx supabase init`(config.toml 생성) -> `npx supabase link --project-ref <프로젝트 ref>` -> `npx supabase db push`.
3. **Claude(Cowork)의 Supabase 연결**: 프로젝트를 만든 뒤 적용을 요청.

1·3번으로 적용했다면 나중에 CLI를 쓸 때 `supabase migration repair`로 적용 기록을 맞춘다.

## 5. 적재

```text
# 저장소 맨 위 폴더에서. data_raw/는 Git에 올라가지 않는다
python pipeline/load_supabase.py --raw data_raw/policies_all.json --dry-run    # 미리보기, 네트워크 안 씀
python pipeline/load_supabase.py --raw data_raw/policies_all.json              # 실제 적재 (.env 필요)
python pipeline/load_supabase.py --skip-raw --sql-out data_raw/load.sql        # 원본 없이 SQL 파일로 (SQL 편집기용)
```

- 필요한 값: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (환경변수 또는 저장소 맨 위 `.env`). service_role 키는 이 스크립트에서만 쓴다.
- 다시 실행해도 같은 행이 두 번 생기지 않는다(키 기준 upsert).
- 실행하면 건수와 검증 결과를 먼저 출력한다. 후보별 매칭(개별 18·묶음 3·없음 7)이나 지갑 밖 서류 14종이 맞지 않으면 적재하지 않고 멈춘다.
- `policies_all.json`의 수집일은 폴더 이름(ythapi_YYYYMMDD)에서 읽는다. 다르면 `--collected-on 2026-11-09`.

## 6. 점검

적용과 적재 후 SQL 편집기에서 `supabase/checks/schema_checks.sql`을 실행한다. 결과 표의 passed가 11개 모두 true면 통과. 점검용 행은 rollback으로 지워진다.

## 7. 화면 연결 (다음 단계, 아직 안 함)

- 화면용 환경변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (anon 키만. service_role 키는 절대 넣지 않음)
- 조회 예시(supabase-js):

```ts
const { data: policies } = await supabase
  .from('policy')
  .select('*, policy_notice(*)')
  .eq('selection', '1차안');

// 검수 완료 규칙만 돌아온다(RLS)
const { data: rules } = await supabase
  .from('eligibility_rule')
  .select('*')
  .in('notice_id', noticeIds);
```

- 타입은 원격 적용 후 `npx supabase gen types typescript --project-id <ref>`로 만든다.
- `policy.category`(온통청년 5대 분야)는 비어 있다. 화면 분야 필터에 쓰려면 정책별로 확인해 채워야 한다.

## 8. 실행한 확인 (2026-11-17, 클라우드 환경)

| 확인 | 결과 |
|---|---|
| PostgreSQL 16에 Supabase 역할(anon, authenticated, service_role)을 흉내 내 마이그레이션 적용 | 오류 없음 |
| 점검 11개(`schema_checks.sql`) | 11/11 통과. 일부러 제약을 지운 DB에서는 해당 항목이 false로 나옴 |
| 적재 스크립트 테스트 4개 | 통과 |
| 적재 SQL을 같은 DB에 두 번 적용 | 정책 41, 공고 33, 서류 39(지갑 밖 14), 항목 69, 출처 59행. 두 번째 적용 후에도 같은 수 |
| 실제 `policies_all.json`으로 적재 | **미실행** (파일이 노트북에만 있음. 테스트는 매칭표 값으로 만든 레코드 24건으로 함) |
| 원격 Supabase 적용, `supabase db push`, 타입 생성 | **미실행** (프로젝트 없음, CLI 설치 불가 환경) |
| 소득 문구 충돌 표시가 기록된 51건과 맞는지 | **미실행** (실제 원본 필요. 적재 미리보기에 건수가 나옴) |

## 9. 미확인·결정 필요

- 사용자 프로필 저장: 서버 저장 + 로그인 / 시연까지 브라우저 저장 (주완 결정)
- 시연 정책 묶음과 그 판정 규칙 검수 (주완)
- 지역 코드는 공식 코드표로 재확인 필요
- Supabase가 해외 사업자라 개인정보처리방침에 처리위탁을 적어야 하는지(법률 검토)
