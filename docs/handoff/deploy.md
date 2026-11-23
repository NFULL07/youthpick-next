# 배포 순서 (2026-11-22)

정리: Claude(Cowork). 실행: 김주완. 키·URL 값은 이 문서에 적지 않는다(이름만).

## 0. 먼저 (VS Code)

1. `feature/crosscheck-fixes` PR을 main에 병합 (PR #14 포함)
2. 원격 DB 적재: `python pipeline/load_supabase.py --raw data_raw/policies_all.json --collected-on 2026-11-09 --prune`
   - `--prune`은 CSV에 없는 규칙(11/20에 넣은 API 초안 28행 가운데 지금 CSV에 없는 행)을 지운다
   - 끝나면 규칙 160행(검수 완료 43, 2026-11-23). 검수 완료 5개 정책(A1 A4 B3 C1 C2)만 화면에 O/X가 나온다

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

실험실 크레딧으로 쓸 때 (주완 결정 2026-11-22)

| 이름 | 값 |
|---|---|
| `AI_PROVIDER` | `openai` |
| `AI_API_URL` | `https://gateway.aitestbed.kr/v1` |
| `AI_API_KEY` | 실험실 팀 공유 키 (채팅·저장소에 붙여 넣지 않는다) |
| `AI_MODEL` | `gpt-6.1-sol` (이 게이트웨이에서 웹 검색이 되는 모델. Claude·Gemini는 검색이 안 됨) |
| `ALLOWED_ORIGINS` | `https://<배포 주소>,http://localhost:3000` (끝에 / 없이) |

개인 Anthropic 키로 쓸 때: `AI_PROVIDER`를 빼거나 `anthropic`, `AI_API_KEY`(또는 `ANTHROPIC_API_KEY`) = Anthropic 키, `AI_MODEL` = `claude-sonnet-5-5` 또는 `claude-opus-5-5`, `AI_API_URL`은 쓰지 않음

- **AI 키를 넣기 전에** 사용 한도를 먼저 정한다(실험실 크레딧은 크레딧 자체가 상한, Anthropic 키는 콘솔 월 한도). 팀 공유 키라 남이 부르면 팀 크레딧이 줄어든다. 함수 주소는 누구나 부를 수 있고(JWT 검사 꺼짐), ALLOWED_ORIGINS는 브라우저 밖의 요청을 막지 못한다. 함수 안의 제한은 주소(IP)별 분당 5회뿐

## 3. 확인

- 배포 주소 접속: 정책 목록이 Supabase 데이터로 나오는지(예시 데이터 안내가 없는지)
- 가상 지갑 켜기 -> 정책 상세의 직접 입력 칸이 채워지는지
- AI 내비게이터 > 외부 공고 찾기: 결과가 출처 링크와 함께 나오는지, 오류면 Supabase Edge Functions 로그에서 상태 코드 확인
- 390px(휴대폰) 화면에서 가로로 넘치지 않는지
