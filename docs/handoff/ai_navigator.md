# AI 내비게이터 외부 공고 탐색 (2026-11-21)

정리: Claude(Cowork). 결정: 김주완. 상태: Edge Function 배포됨(2026-11-22). AI 키·모델 비밀값 입력 전(입력 전에는 함수가 503 '키 연결 전'을 돌려준다).

## 배포 기록 (2026-11-22)

- `ai-navigator` 배포: Supabase MCP로 올림, 버전 1, **verify_jwt = false**
  - 이유: 화면은 공개 키(sb_publishable_)를 `apikey` 헤더로만 보낸다. 새 공개 키는 JWT가 아니어서 JWT 검사를 켜면 요청이 막힌다
  - CLI로 다시 배포할 때도 반드시 `supabase functions deploy ai-navigator --no-verify-jwt` (빼면 JWT 검사가 켜져 화면 호출이 막힘)
  - 대신 함수 안의 보호: 정해진 칸만 받기, 주소(IP)별 분당 5회, ALLOWED_ORIGINS. 누구나 호출할 수 있는 주소라 AI 요금 한도를 Anthropic 콘솔에서 걸어 둔다
- 모델: `claude-sonnet-5-5` (주완 결정. 입력 100만 토큰당 2달러, 출력 10달러. Claude 문서 2026-11-22 확인). 웹 검색 도구를 이 모델이 받는지는 문서에서 확인하지 못함 → 첫 실제 호출로 확인
- 비밀값은 Supabase 화면(Edge Functions > Secrets)에서 주완이 직접 넣는다: `ANTHROPIC_API_KEY`, `AI_MODEL`, `ALLOWED_ORIGINS`(배포 주소, 쉼표로 여러 개)
- 아직 안 한 것: 실제 AI 호출(키 입력 후), 응답 JSON이 여러 글 조각으로 나뉘어 올 때 정리가 되는지 확인

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
