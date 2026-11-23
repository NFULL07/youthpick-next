# AI 내비게이터 외부 공고 탐색 (2026-11-21)

정리: Claude(Cowork). 결정: 김주완. 상태: Edge Function 배포됨(2026-11-22, OpenAI 호환 공급사 지원 포함). AI 키·모델 비밀값 입력 전(입력 전에는 함수가 503 '키 연결 전'을 돌려준다).

## 결론 (2026-11-23)

- 모두의 AI 실험실 게이트웨이는 **Supabase 서버에서 연결되지 않는다**(아래 진단 1~3차: 14개 지역 모두 TCP 443 실패, 같은 서버에서 api.openai.com은 정상). 노트북(Windows)에서는 된다. 막는 위치·이유는 미확인
- 그래서 실험실 크레딧은 **노트북 개발용**(정답셋 라벨, 교차검증, 코딩 도구)으로 쓴다(주완 결정 2026-11-23)
- 배포 사이트의 AI 공고 찾기는 둘 중 하나(주완 결정 대기)
  - 개인 Anthropic 키: 비밀값 `AI_PROVIDER=anthropic`, `AI_API_KEY`, `AI_MODEL`(예: `claude-sonnet-5-5`). 이 경로는 아직 실제로 한 번도 호출하지 않았다 → 넣은 뒤 1회 시험 필요
    - 비용 추정(측정 아님): 공식 가격(2026-11-23 문서) Sonnet 5.5 입력 $2·출력 $10 / 100만 토큰, 웹 검색 1,000회당 $10. 입력 3만~6만 토큰(노트북 게이트웨이 측정값을 빌림), 검색 1~5회면 1회 약 $0.09~0.19
  - 예시 모드: Supabase 비밀값 `AI_API_KEY` 삭제(함수가 바로 503), Cloudflare 빌드 변수 `VITE_AI_NAVIGATOR` 삭제(화면이 '예시 · 실제 공고 아님'만 보여 줌)
- 지금 비밀값은 게이트웨이(`AI_PROVIDER=openai`)로 되어 있어, 화면에서 누르면 약 130초 뒤 실패한다 → 위 둘 중 하나로 바꿔야 한다

## 배포 기록 (2026-11-22)

- `ai-navigator` 배포: Supabase MCP로 올림, 버전 1, **verify_jwt = false**
  - 이유: 화면은 공개 키(sb_publishable_)를 `apikey` 헤더로만 보낸다. 새 공개 키는 JWT가 아니어서 JWT 검사를 켜면 요청이 막힌다
  - CLI로 다시 배포할 때도 반드시 `supabase functions deploy ai-navigator --no-verify-jwt` (빼면 JWT 검사가 켜져 화면 호출이 막힘)
  - 함수 안의 보호는 정해진 칸만 받기와 주소(IP)별 분당 5회뿐이다(같은 함수 인스턴스 안에서만 셈)
  - ALLOWED_ORIGINS는 브라우저 응답 설정(CORS)에만 쓰인다. 다른 사이트의 브라우저 요청은 사전 확인(preflight)에서 막히지만, 브라우저가 아닌 곳(curl 등)에서 직접 부르는 요청은 막지 못한다
  - JWT 검사를 켜도 크게 나아지지 않는다: 공개 키는 배포된 화면 코드에 들어 있어 누구나 볼 수 있다
  - 그래서 **AI 키를 넣기 전에 사용 한도를 반드시 건다**(Anthropic 콘솔, 또는 실험실 크레딧 자체가 상한). 시연 뒤 계속 쓰면 로그인 사용자만 부르게 하거나 하루 전체 호출 수 제한을 둔다(VS Code 검토 의견, 2026-11-22)
- 그래서 함수는 **웹 검색 결과에 실제로 나온 주소의 공고만** 화면에 보낸다(`keepSearchedOnly`). 검색을 안 했으면 결과는 0개
  - Anthropic 형식: `web_search_tool_result` 결과와 `citations` 주소
  - OpenAI 형식: `message.annotations`의 `url_citation` 주소. 검색 도구가 붙이는 `utm_*` 값은 떼고 비교·표시
- 공급사 두 가지를 비밀값 `AI_PROVIDER`로 고른다(코드는 같음)
  - `openai`: OpenAI 호환 chat/completions + `web_search_options`. **모두의 AI 실험실 게이트웨이 + `gpt-6.1-sol`** (주완 결정 2026-11-22: 실험실 크레딧만 쓰기)
  - `anthropic`(기본): Anthropic messages + `web_search` 도구. 개인 Anthropic 키가 있을 때
- 실험실 게이트웨이 시험(VS Code, 2026-11-22, 모델 31개)
  - `gpt-6.1-sol` + `web_search_options`: 200, `url_citation` 있음(주소 끝에 `utm_source=openai`) → 실제 웹 검색
  - `claude-opus-5-5` + `web_search_options` 또는 messages `web_search` 도구: 200이지만 검색 흔적 없음, 모델이 기억으로 쓴 주소를 냄
  - `gemini-4-argon` + `web_search_options`: 200, 인용 없음. `tools: google_search`: 500(LiteLLM이 지원하지 않는 도구)
  - 게이트웨이는 LiteLLM으로 요청을 OpenAI 형식으로 바꿔 전달하는 것으로 보임(오류 문구 기준)
- 첫 실제 호출(2026-11-22 23:38, 함수 버전 5): 502, 90초 시간 제한에 걸림(로그 `TimeoutError 90003ms`)
- 같은 지시문을 노트북에서 게이트웨이로 직접 잰 결과(각 1회, 경향만):

  | 설정 | 걸린 초 | 입력/출력 토큰 | 검색 주소만 남긴 뒤 |
  |---|---|---|---|
  | 최대 5개, max_tokens 4000 | 27.5 | 62,835 / 1,335 | 1 |
  | 최대 3개, 1500 | 26.9 | 36,738 / 1,086 | 0 (모델이 적은 주소가 인용 주소와 달랐음) |
  | 최대 3개, 1500, reasoning_effort low | **19.8** | 29,675 / 708 | 1 |
  | 최대 3개, 1500, search_context_size low | 38.1 | 58,635 / 1,185 | 1 |

  → 함수에 '최대 3개, max_tokens 1500, reasoning_effort low'를 넣고 시간 제한을 140초로(Edge Function 한도 150초), 화면 대기는 150초로 올림(버전 6)
  → 주소 비교 때 `www.`, 쿼리 값 순서, 끝의 `/` 차이는 같은 페이지로 봄. 지시문에 '검색 결과에서 연 주소를 그대로 적는다'를 넣음
  → 함수에서 90초를 넘긴 원인(게이트웨이 순간 지연인지, Supabase에서 게이트웨이로 가는 연결인지)은 미확인. 버전 6으로 다시 불러 확인
  → 천안 장학금은 대부분 시청(.go.kr) 공고라 외부 공고만 남기면 1개 안팎. 입력 토큰이 요청당 3만~6만이라 크레딧 소모에 주의
- 함수 버전 7로 다시 2회 호출(2026-11-23 0시): 둘 다 502, 약 130초 뒤 `TypeError`(연결 끊김)
- 임시 진단 함수 `ai-gateway-diag`(2026-11-23 00:27, 주완 허락): Supabase 서울(ap-northeast-2), 나가는 IP 3.34.49.172
  - 외부 사이트(ipify) 0.3초 정상, 게이트웨이 `GET /models` 30초 무응답, 짧은 대화 60초 무응답
  - → **Supabase(AWS) 서버에서는 실험실 게이트웨이에 연결되지 않음.** 노트북(Windows)에서는 정상. 게이트웨이의 IP 허용 목록·방화벽으로 짐작(미확인)
- 2차 진단(2026-11-23 00:37, 키 없이 단계별): 게이트웨이 IP 180.210.77.62
  | 단계 | Supabase(서울) | 노트북 |
  |---|---|---|
  | DNS | 성공 7ms | 성공 |
  | TCP 443 / 80 | **실패**(10초 무응답) | 성공 |
  | HTTPS GET /v1/models(인증 없음) | 실패(15초) | 401, server uvicorn, 0.7초 |
  | 대조: api.openai.com 443, api.anthropic.com | 성공 3ms, 401 201ms | |
  - → 게이트웨이 방화벽이 Supabase(AWS) IP의 연결을 받지 않음(TCP 단계). 키·인증·지시문·모델 문제 아님. 게이트웨이 쪽 허용이 있어야 해결
  - 진단 함수는 410만 돌려주는 빈 함수로 바꿔 둠(외부 요청 없음)
- 3차 진단(2026-11-23 01:36, 주완 허락, 키 없이): Supabase Edge Function 14개 지역 전부에서 같은 시험(`forceFunctionRegion`으로 지역 지정, 응답의 `SB_REGION`으로 실행 지역 확인)
  - 서울, 도쿄, 싱가포르, 시드니, 뭄바이, 미국 4곳(버지니아, 캘리포니아, 오리건, 캐나다), 유럽 4곳(프랑크푸르트, 아일랜드, 런던, 파리), 상파울루
  - 14곳 모두 나가는 IP가 달랐고(AWS), 14곳 모두 게이트웨이 TCP 443 실패(8초 무응답), `GET /v1/models` 실패(12초). 대조 api.openai.com 443은 14곳 모두 성공(2~14ms)
  - → Supabase 지역을 바꿔도 안 됨. 막는 위치(게이트웨이 서버인지 그 앞 네트워크인지)와 이유는 미확인. Cloudflare Workers 등 다른 서버는 시험 안 함
  - 진단 함수는 다시 410 빈 함수로 되돌림(버전 6, 410 응답 확인)
- 처리위탁: 실험실 게이트웨이를 쓰면 AI에 보내는 항목(시·군, 상태, 나이대, 관심 분야, 짧은 질문)이 게이트웨이 운영 쪽과 OpenAI로 간다. 고지 범위는 CLAUDE.md 8장 미확인 항목
- 비밀값은 Supabase 화면(Edge Functions > Secrets)에서 주완이 직접 넣는다(`deploy.md` 2장)
- 아직 안 한 것: 실제 AI 호출(키 입력 후), 응답 시간, 결과 품질(주소가 실제 공고 글인지)

## 무엇을 하나

- 정부 공고(온통청년)는 판정 규칙으로 O/X/?를 낸다.
- 그 밖의 민간·재단·기업·대학 공고는 AI가 요청 때마다 웹에서 찾는다. 미리 모아 DB에 넣지 않는다.
- 결과는 검수 전 정보라 O/X로 판정하지 않는다. 'AI 추천 · 조건 확인 필요(?)'와 출처 링크, 공고에서 확인할 조건만 보여 준다.

## 보내는 값과 보내지 않는 값 (CLAUDE.md 2·3장)

| 보냄 | 보내지 않음 |
|---|---|
| 주민등록 시·군, 학교 소재 시·군 | 읍·면·동 이하 주소, 학교 이름 |
| 현재 상태(재학·구직 등), 나이대(5세 단위) | 정확한 나이·생년월일 |
| 관심 분야, 짧은 질문(100자, 연락처·주민번호·이메일 모양은 거부) | 공고별 일시 입력 49개(성적·소득·지원구간 등), 수집 제외 6개 |

검사 규칙은 `supabase/functions/_shared/navigatorProtocol.ts` 한 곳에 있고 화면과 함수가 같이 쓴다.

## 파일

- `supabase/functions/_shared/navigatorProtocol.ts` 요청 형식·검사, 프롬프트, 결과 정리(https 출처만, .go.kr 제외, 최대 5개)
- `supabase/functions/ai-navigator/index.ts` Edge Function (Deno). 키·모델이 없으면 503 '키 연결 전'
- `web/src/ai/navigatorClient.ts` 화면 쪽 요청·예시 응답
- `web/src/components/ExternalNoticeFinder.tsx` AI 내비게이터 창의 '외부 공고 찾기 (AI)' 탭

## 확인한 것 (2026-11-21, 클라우드)

- 화면: lint, 테스트(외부 공고 7개 포함 81개), build 통과. 1280·390px에서 탭·예시 결과·개인정보 거부 확인
- 함수: `deno check` 통과. 키 없이 실행해 검사 거부(받지 않는 칸, 동 단위 주소, 전화번호), 키 없음 503, 가짜 모델 응답 정리(.go.kr·주소 없는 항목 제거) 확인
- 실제 AI 호출: 미실행(키 없음)

## 키를 받은 뒤 할 일 (주완)

1. 모델과 비용 한도 정하기. Claude 웹 검색 도구는 문서 기준 검색 1,000회당 10달러 + 토큰 요금(2026-11-21 문서 확인). 함수는 요청 1번에 검색을 최대 5번 쓴다.
2. 비밀값 넣기 (값은 저장소·채팅에 남기지 않는다)
   ```
   supabase secrets set ANTHROPIC_API_KEY=... AI_MODEL=... ALLOWED_ORIGINS=https://(배포 주소),http://localhost:3000
   ```
   선택: `AI_WEB_SEARCH_TOOL`(기본 web_search_20250305. 문서에 20260209, 20260318 버전도 있음), `AI_API_VERSION`(기본 2023-06-01)
3. 배포: `supabase functions deploy ai-navigator`
   - 화면은 공개 키(sb_publishable_)를 apikey 헤더로 보낸다. 새 키는 JWT가 아니어서 함수의 JWT 검사와 맞지 않을 수 있다 → 배포 때 확인하고 필요하면 `--no-verify-jwt`로 배포 (미확인)
   - 남용 막기: 함수 안에서 주소(IP)별 분당 5회 제한과 ALLOWED_ORIGINS만 있다. 시연 뒤 계속 쓰면 더 강한 보호가 필요하다
4. 화면 켜기: `web/.env.local`에 `VITE_AI_NAVIGATOR=live` (Supabase 주소·공개 키는 이미 있음)
5. 실제 결과 3~5건을 열어 출처가 공고를 말하는지 확인하고, 틀린 결과가 나오면 프롬프트를 고친다

## 미확인

- 모델·공급사, 1회 요청 비용, 응답 시간
- Edge Function에서 새 공개 키(sb_publishable_)로 호출할 때의 JWT 검사 설정
- AI가 찾은 결과의 정확도(사람이 확인하기 전까지 '조건 확인 필요'로만 표시)
