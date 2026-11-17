# pipeline/ : 데이터 수집·적재 스크립트

Python 3.10 이상, 표준 라이브러리만 쓴다(설치할 패키지 없음). 명령은 모두 **저장소 맨 위 폴더**(`C:\dev\youthpick-next`)에서 실행한다.

| 파일 | 하는 일 |
|---|---|
| `fetch_policies.py` | 온통청년 API에서 청년정책 전체를 받아 `data_raw/ythapi_<시각>/`에 저장하고 검증 |
| `load_supabase.py` | 받은 원본과 `docs/data/` CSV를 Supabase에 적재 (`--dry-run`이면 네트워크 안 씀) |
| `env_config.py` | 키 읽기 공통 코드 (환경변수 → `.env` 순서, 값은 출력하지 않음) |
| `rule_tables.py` | 판정 규칙·정책 관계·제출서류 CSV 읽기와 검사 (`load_supabase.py`가 씀) |
| `build_doc_requirements.py` | 확인서류표 CSV → 화면용 `web/src/data/docRequirements.generated.ts` |
| `tests/` | 단위 테스트. 실제 API·Supabase는 부르지 않는다 |

## 1. 키 넣기

키 이름은 `.env.example`에 있다. **값은 코드·커밋·문서·채팅에 붙여 넣지 않는다.**

방법 A (권장): `.env` 파일

```powershell
Copy-Item .env.example .env
notepad .env
```

메모장에서 `YTH_POLICY_KEY=` 뒤에 키를 붙여 넣고 저장한다. `.env`는 `.gitignore`에 있어 Git에 올라가지 않는다.

방법 B: 지금 열린 PowerShell 창에서만 쓰기

```powershell
$env:YTH_POLICY_KEY = "여기에_키"
```

창을 닫으면 사라진다. 이 명령은 PowerShell 입력 기록에 남으므로 공용 PC에서는 방법 A를 쓴다. 둘 다 있으면 환경변수가 먼저다.

Supabase 값 (적재할 때만 필요. Supabase 대시보드 Settings > API Keys)

| `.env` 이름 | 넣을 값 |
|---|---|
| `SUPABASE_URL` | 프로젝트 주소 (`https://....supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret key** (`sb_secret_...`). 예전 방식 프로젝트는 `service_role` 키. 화면에는 절대 넣지 않는다 |

화면용 Publishable key(`sb_publishable_...`)는 여기가 아니라 `web/.env.local`의 `VITE_SUPABASE_ANON_KEY`에 넣는다. Supabase 문서 기준으로 예전 `anon`·`service_role` 키는 2026년 말까지만 동작하므로 새 프로젝트는 새 키를 쓴다.

## 2. 수집 순서

```powershell
# 1) 키가 들어갔는지 확인 (값은 안 보이고 "설정됨 (.env)"처럼만 나온다)
python pipeline/fetch_policies.py --check-env

# 2) 한 페이지(100건)만 받아 보기. 결과 파일 이름은 policies_sample.json
python pipeline/fetch_policies.py --max-pages 1

# 3) 전체 수집 (11/9 기준 40페이지, 페이지 사이 0.5초씩 쉰다)
python pipeline/fetch_policies.py

# 4) 적재 미리보기. 3)이 끝날 때 폴더 이름까지 넣은 명령을 화면에 찍어 준다
python pipeline/load_supabase.py --raw data_raw/ythapi_YYYYMMDD_HHMM/policies_all.json --dry-run
```

- youthcenter.go.kr은 클라우드 환경에서 403으로 막힌 적이 있다. 수집은 노트북에서 한다.
- 결과는 실행할 때마다 새 폴더에 저장한다. 기존 `data_raw/policies_all.json`(11/9 수집본)은 건드리지 않는다. 새 수집본을 기준으로 쓸지는 주완이 정한다.

## 3. 결과 폴더

```
data_raw/ythapi_20261117_1530/
  raw/page_001.json ...   API 응답 원본 (응답에 키가 섞여 오면 *** 로 가림)
  policies_all.json       전체 정책 목록 (--max-pages로 멈추면 policies_sample.json)
  field_coverage.csv      필드별 채움 수, 자격조건 필드 표시
```

`data_raw/`는 Git에서 빠진다.

## 4. 검증과 종료 코드

수집이 끝나면 아래를 확인한다.

- 받은 건수와 API가 알려 준 전체 건수(`totCount`)가 같은지
- `plcyNo`가 비었거나 중복된 정책이 없는지
- 11/9 수집본의 필드 60개에서 새로 생기거나 빠진 필드가 있는지 (경고만. API 형식 변경 신호)

| 종료 코드 | 뜻 |
|---|---|
| 0 | 수집·검증 통과 |
| 1 | 검증 실패. 파일은 남기지만 적재에 쓰지 않는다 |
| 2 | 키 없음, 통신 오류, API 오류 응답. 받은 페이지까지는 `raw/`에 남는다 |

일시 오류(5xx, 시간 초과)는 3번까지 다시 시도한다. 4xx(키 오류, 접속 차단)는 다시 시도하지 않는다. 오류 메시지에는 키와 키가 들어간 주소를 넣지 않는다.

멈추는 경우(종료 코드 2): 같은 정책만 다시 돌려주는 페이지가 오면(API가 `pageNum`을 무시) 끝없이 부르지 않고 멈춘다. 1,000페이지를 넘겨 부르지 않는다. 응답이 JSON이 아니거나 UTF-8이 아니면(점검·차단 안내 페이지) 그 사실을 알리고 멈춘다.

옵션: `--page-size`(기본 100), `--sleep`(페이지 사이 대기 초, 기본 0.5), `--out-dir`(기본 `data_raw`).

## 5. 테스트

```powershell
python -m unittest discover -s pipeline/tests
```

수집 테스트는 `127.0.0.1` 가짜 서버로 페이지 넘김, 재시도, 오류 응답, 키 노출 여부를 확인한다.

## 6. 노트북 스크립트와 다른 점

`fetch_policies.py`는 노트북 `youthpick_fetch_policies.py`(11/9, 3,969건 수집)를 옮긴 것이다.

- 응답 구조를 추측해서 찾던 부분을 실제 구조(`result.youthPolicyList`, `result.pagging.totCount`)로 고정했다. 구조가 다르면 멈추고 알린다.
- 재시도, 건수·중복 검증, 필드 변경 경고, 키 가리기를 더했다.
- `policies_cn_national.csv`(지역 필터)와 후보 키워드 매칭은 옮기지 않았다. 이 스크립트는 수집만 한다.
- 11/9에 저장한 실제 응답 40페이지를 가짜 서버로 다시 돌려 확인했고, 결과가 `data_raw/policies_all.json`과 같았다(3,969건).
