# 청년픽 NEXT 화면 (web)

React + TypeScript + Vite 앱입니다. 패키지 설치는 **npm** 하나로 통일합니다(`package-lock.json` 기준).

## 준비

- Node.js 22 이상 (확인한 버전: 24.13.0)

## 명령

`web/` 폴더에서 실행합니다.

| 할 일 | 명령 |
|---|---|
| 설치 | `npm ci` (lock 파일 그대로 설치. 패키지를 추가·변경할 때만 `npm install`) |
| 개발 서버 | `npm run dev` -> http://localhost:3000 |
| 타입 검사 | `npm run lint` |
| 테스트 | `npm test` (`src/**/*.test.ts`, Node 내장 테스트 러너 + tsx) |
| 배포용 빌드 | `npm run build` -> `dist/` |

bun, yarn, pnpm lock 파일은 커밋하지 않습니다.
