# 배포 순서 (2026-11-22)

정리: Claude(Cowork). 실행: 김주완. 키·URL 값은 이 문서에 적지 않는다(이름만).

## 0. 먼저 (VS Code)

1. `feature/crosscheck-fixes` PR을 main에 병합 (PR #14 포함)
2. 원격 DB 적재: `python pipeline/load_supabase.py --raw data_raw/policies_all.json --collected-on 2026-11-09 --prune`
   - `--prune`은 CSV에 없는 규칙(11/20에 넣은 API 초안 28행 가운데 지금 CSV에 없는 행)을 지운다
   - 끝나면 규칙 153행(검수 완료 0)이라 화면의 O/X는 아직 안 나온다. 사람 검수 반영 뒤 다시 적재한다

## 1. Cloudflare Pages (대시보드)

1. Workers & Pages > Create application > Pages > Connect to Git
2. GitHub > Install & Authorize (저장소 `NFULL07/youthpick-next`만 허용해도 됨) > Begin setup
3. Set up builds and deployments
   - Project name: 주소가 `<이름>.pages.dev`가 된다 (기본은 저장소 이름)
   - Production branch: `main`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory (advanced) > Path: `web`
   - Environment variables:
     - `VITE_SUPABASE_URL`: `web/.env.local`의 값
     - `VITE_SUPABASE_ANON_KEY`: `web/.env.local`의 값 (공개 키 sb_publishable_ 또는 anon만. service_role·sb_secret_ 금지)
     - `VITE_AI_NAVIGATOR`: `live` (AI 키를 넣기 전이면 빼 둔다. 빼면 예시 응답)
     - `NODE_VERSION`: `22` (package.json engines가 Node 22 이상)
4. Save and Deploy. 끝나면 `https://<이름>.pages.dev` 주소가 나온다
5. 환경 변수를 나중에 바꾸면 Deployments에서 다시 배포해야 화면에 반영된다(Vite가 빌드 때 값을 넣음)

## 2. Supabase 비밀값 (대시보드: Edge Functions > Secrets)

| 이름 | 값 |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic 콘솔에서 만든 키 (채팅·저장소에 붙여 넣지 않는다) |
| `AI_MODEL` | `claude-sonnet-5-5` |
| `ALLOWED_ORIGINS` | `https://<이름>.pages.dev,http://localhost:3000` |

- Anthropic 콘솔에서 월 사용 한도를 먼저 걸어 둔다(누구나 호출할 수 있는 주소)

## 3. 확인

- 배포 주소 접속: 정책 목록이 Supabase 데이터로 나오는지(예시 데이터 안내가 없는지)
- 가상 지갑 켜기 -> 정책 상세의 직접 입력 칸이 채워지는지
- AI 내비게이터 > 외부 공고 찾기: 결과가 출처 링크와 함께 나오는지, 오류면 Supabase Edge Functions 로그에서 상태 코드 확인
- 390px(휴대폰) 화면에서 가로로 넘치지 않는지
