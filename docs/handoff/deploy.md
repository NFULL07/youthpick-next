# 배포 순서 (2026-11-22)

정리: Claude(Cowork). 실행: 김주완. 키·URL 값은 이 문서에 적지 않는다(이름만).

## 0. 먼저 (VS Code)

1. `feature/crosscheck-fixes` PR을 main에 병합 (PR #14 포함)
2. 원격 DB 적재: `python pipeline/load_supabase.py --raw data_raw/policies_all.json --collected-on 2026-11-09 --prune`
   - `--prune`은 CSV에 없는 규칙(11/20에 넣은 API 초안 28행 가운데 지금 CSV에 없는 행)을 지운다
   - 끝나면 규칙 160행(검수 완료 84, 2026-11-23). 검수 완료 14개 정책(A1 A4 B3 C1 C2, D4 E1 E3 E4 E5 F1 F2 G1 H1)에 화면 O/X가 나온다

## 1. Cloudflare (Worker 프로젝트 `youthpick-next`, 대시보드)

2026-11-22에 Pages가 아니라 **Worker**로 만들어 GitHub(`NFULL07/youthpick-next`, main)와 연결했다. 그대로 쓴다.
`web/wrangler.jsonc`가 정적 파일(`./dist`)만 올리는 설정이고, 이름을 Worker 이름 `youthpick-next`와 맞췄다.

1. Workers & Pages > youthpick-next > **Settings** > 오른쪽 목록 **Builds**
2. Build configuration
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy` (기본값 그대로)
   - Root directory: `web`
3. 같은 Builds 영역의 **Build variables and secrets** (Settings 맨 위 'Runtime variables and secrets'가 아님. Vite는 빌드 때 값을 넣는다)
   - `VITE_SUPABASE_URL`: `web/.env.local`의 값
   - `VITE_SUPABASE_ANON_KEY`: `web/.env.local`의 값 (공개 키 sb_publishable_ 또는 anon만. service_role·sb_secret_ 금지)
   - `VITE_AI_NAVIGATOR`: `live` (AI 키를 넣기 전이면 빼 둔다. 빼면 예시 응답)
   - Node 버전 변수는 넣지 않았다. Workers Builds 기본은 Node 24(Cloudflare 변경 기록 2026-07-30)이고 `web/package.json`은 Node 22 이상이면 된다. 첫 빌드 기록에서 Node 버전을 보고, 22보다 낮으면 `NODE_VERSION` = `22`를 Build variables에 넣는다
4. 설정은 **다음 빌드**부터 적용된다. main에 병합(push)하면 빌드가 돈다. Deployments 탭에서 빌드 기록·오류를 본다
5. 주소: Overview에 'No URLs enabled'면 Domains 탭에서 workers.dev 주소를 켠다. 주소 모양은 `https://youthpick-next.<계정 하위 도메인>.workers.dev`
6. 환경 변수를 바꾸면 다시 빌드해야 화면에 반영된다

## 2. Supabase 비밀값 (대시보드: Edge Functions > Secrets)

배포: 개인 Anthropic 키 (주완 결정 2026-11-23. 화면의 개인정보 안내도 받는 곳을 Anthropic으로 적는다)

| 이름 | 값 |
|---|---|
| `AI_PROVIDER` | `anthropic` |
| `AI_API_KEY` | 개인 Anthropic 키 (채팅·저장소에 붙여 넣지 않는다) |
| `AI_MODEL` | `claude-sonnet-5-5` |
| `ALLOWED_ORIGINS` | `https://<배포 주소>,http://localhost:3000` (끝에 / 없이) |
| `AI_API_URL` | **지운다** (게이트웨이 주소. anthropic이면 쓰지 않음) |

- 실험실 게이트웨이(`AI_PROVIDER=openai`, `AI_API_URL=https://gateway.aitestbed.kr/v1`, `AI_MODEL=gpt-6.1-sol`)는 Supabase 서버에서 연결되지 않아(2026-11-23 진단, `ai_navigator.md`) 배포에 쓰지 않는다. 노트북 개발·시험용으로만 둔다
- 공급사를 바꾸면 `web/src/components/PrivacyNotice.tsx`의 `AI_COMPANY`도 같이 바꾼다(화면 문구의 받는 곳)

- **AI 키를 넣기 전에** Anthropic 콘솔에서 월 사용 한도를 먼저 정한다(크레딧을 넣은 만큼이 상한). 함수 주소를 누가 부르든 이 키의 비용이 나간다. 함수 주소는 누구나 부를 수 있고(JWT 검사 꺼짐), ALLOWED_ORIGINS는 브라우저 밖의 요청을 막지 못한다. 함수 안의 제한은 주소(IP)별 분당 5회뿐

## 3. 확인

- 배포 주소 접속: 정책 목록이 Supabase 데이터로 나오는지(예시 데이터 안내가 없는지)
- 가상 지갑 켜기 -> 정책 상세의 직접 입력 칸이 채워지는지
- AI 내비게이터 > 외부 공고 찾기: 결과가 출처 링크와 함께 나오는지, 오류면 Supabase Edge Functions 로그에서 상태 코드 확인
- 390px(휴대폰) 화면에서 가로로 넘치지 않는지
