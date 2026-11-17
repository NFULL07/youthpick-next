# Impeccable 검사 기록 (1차)

- 검사 날짜: 2026-11-16
- 기준 커밋
  - 수정 전(before): `main` `8016cbf` (PR #2, #4 병합 직후)
  - 수정 후(after): `chore/impeccable` `4748198` (`8016cbf` + 아래 수정 2건)
  - 폰트 변경 후: `chore/impeccable` `affac77` (본문 글꼴을 Pretendard로 변경, 김주완 결정)
- 도구: `impeccable` 4.9.2 (npx). 엔진은 `@impeccable/cli-windows-x64` 0.1.25. 화면 검사는 PC에 설치된 Chrome을 사용

## 파일

| 파일 | 내용 |
|---|---|
| `before_source.txt` / `after_source.txt` | 소스 검사 (`web/src`, 정규식만) |
| `before_page.txt` | 첫 화면 한 주소만 검사 (참고용, after 없음) |
| `before_pages.txt` / `after_pages.txt` | 화면 8개 검사 |
| `after_font_source.txt` | 폰트 변경(`affac77`) 후 소스 검사. 발견 0건이라 안내 문구만 있음 |

`before_source.txt`는 PowerShell `*>`로 저장한 UTF-16 파일을 UTF-8로 바꾼 것입니다. 그래서 첫 줄에 PowerShell이 붙인 `NativeCommandError` 표시가 있고, 안내 문구의 화살표(→)가 `??`로 바뀌어 있습니다. 검사 내용에는 영향이 없습니다.

## 사용한 명령

저장소 맨 위에서 실행했습니다. 화면 검사 전에 다른 터미널에서 `cd web` → `npm run dev`로 개발 서버(http://localhost:3000)를 켰습니다.

```bash
# 소스 검사
npx impeccable detect web/src > docs/reviews/impeccable/after_source.txt 2>&1

# 화면 검사 (주소 8개를 한 번에)
npx impeccable detect "http://localhost:3000/#home" "http://localhost:3000/#policies" \
  "http://localhost:3000/#detail/1" "http://localhost:3000/#detail/9" "http://localhost:3000/#switch" \
  "http://localhost:3000/#apply" "http://localhost:3000/#profile" "http://localhost:3000/#wallet" \
  > docs/reviews/impeccable/after_pages.txt 2>&1
```

- 화면별 주소(`#policies` 등)를 넣으면 화면마다 따로 검사됩니다. 결과가 화면마다 다르게 나오는 것으로 확인했습니다.
- 문제가 발견되면 종료 코드가 2입니다.
- PowerShell에서 파일로 저장할 때는 `>` 대신 `*>`를 써야 안내 문구까지 저장됩니다. 이때 파일은 UTF-16이 됩니다.

## 결과 (규칙별 건수)

| 규칙 | 검사 | 수정 전 | 수정 후 | 처리 |
|---|---|:---:|:---:|---|
| `skipped-heading` | 화면 | 1 | 0 | 수정: 정책 찾기 목록 제목 `strong` → `h2` (h1 → h2 → h3) |
| `first-viewport-column-overflow` | 화면 | 2 | 0 | 수정: 상세 화면 사이드바를 lg 이상에서 sticky |
| `nested-cards` | 화면 | 5 | 5 | 그대로 (취향 규칙) |
| `cream-palette` | 화면 | 8 | 8 | 그대로 (취향 규칙) |
| `overused-font` | 소스 | 1 | 1 → 0 | 1차에서는 그대로. 이후 본문 글꼴을 Plus Jakarta Sans·Noto Sans KR → Pretendard로 변경해 0 (`affac77`, 김주완 결정) |
| 합계 | 화면 / 소스 | 16 / 1 | 13 / 0 | |

**취향 규칙 2개(`nested-cards`, `cream-palette`)는 이해찬 판단 대기.** 오류가 아니라 "AI가 만든 티가 나는 디자인"을 가리키는 규칙이라, UI·UX 담당 판단 후 고칠지 정합니다. 세 번째 취향 규칙이던 `overused-font`는 김주완 결정으로 Pretendard로 바꿨습니다.

폰트 변경 후 확인: Chrome의 실제 렌더링 글꼴을 확인해 제목·본문·버튼은 Pretendard Variable, 영문 라벨(`.font-mono-num`)은 JetBrains Mono인 것을 봤습니다. 360·390·768·1280px × 8개 화면에서 가로 넘침이 없습니다. Pretendard는 jsDelivr(`pretendard@1.3.9`)에서 불러옵니다.

수정 후 추가 확인:
- `npm run lint`, `npm test`(28/28), `npm run build` 통과
- 360·390·768·1280px에서 정책 찾기·상세 1·상세 9 가로 넘침 없음(헤드리스 Chrome 측정)
- 상세 사이드바는 1024px 이상에서만 sticky, 800px(1열)에서는 그대로인 것 확인

## 한계

- **빈 상태만 검사**: 저장된 데이터가 없는 새 브라우저로 검사했습니다. 그래서 신청 준비 화면은 빈 화면 상태로 검사됐습니다.
- **열어야 보이는 창은 미검사**: AI 내비게이터 패널, 정책 비교표 창, 지역 선택 창은 검사하지 않았습니다.
- **검사 폭 미표시**: 결과에 검사한 화면 크기가 나오지 않습니다. 모바일 폭 결과는 따로 확인해야 합니다.
- **소스 검사는 정규식만**: 작은 글자·낮은 대비처럼 페이지를 띄워야 하는 규칙은 소스 검사에서 돌지 않습니다(도구 안내 문구).

## 작성 구분

- 검수·판단: 김주완 (고칠 규칙 2개 선정, 폰트 Pretendard 결정, 나머지 취향 규칙 보류)
- AI 생성: 검사 실행, 수정 코드, 이 기록은 Claude Code가 작성
