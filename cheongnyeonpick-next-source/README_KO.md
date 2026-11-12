# 청년픽 NEXT 전체 소스코드

현재 배포한 5번째 버전의 전체 HTML·CSS·JavaScript 소스입니다.

- 배포 주소: https://cheongnyeonpick-next-clean.bakedbiscuit.chatgpt.site/#home
- 소스 버전: f5ff2c64e1122226b54ee03b627094ecab4063c9
- 방식: 별도 빌드가 필요 없는 HTML / CSS / JavaScript

## 실행 방법

1. ZIP 파일의 압축을 풉니다.
2. 압축을 푼 프로젝트 폴더에서 아래 명령으로 로컬 서버를 실행합니다. Python 3가 필요합니다.

```bash
python -m http.server 8000 --directory dist
```

3. 브라우저에서 http://localhost:8000/#home 을 엽니다.

VS Code의 Live Server를 사용하는 경우에는 dist/index.html을 열고 Live Server로 실행해도 됩니다.

## 파일 구성

- dist/index.html: 기본 HTML 구조와 CSS·JavaScript 연결
- dist/assets/base.css: 공통 UI 스타일
- dist/assets/base.js: 정책 예시 데이터, 라우팅, 프로필, 준비 점검 등의 기본 동작
- dist/wallet.css: 전자지갑과 내비게이터 스타일
- dist/wallet.js: 전자지갑 문서 안내, 검색·기록, 내비게이터 기본 동작
- dist/assets/redesign.css: 최종 키치 디자인과 반응형 스타일
- dist/assets/redesign.js: 전체 개편 화면, 정책 비교, 준비 일정, 직접 문서 보관, 내비게이터 확장
- DESIGN_NOTES.md: 레퍼런스 적용 방향과 구현·검증 범위
- .openai/hosting.json: 기존 사이트 배포 설정
- SOURCE_INFO.json: 소스 버전과 원본 파일 해시

CSS와 JavaScript는 index.html에 지정된 순서대로 불러옵니다. 같은 이름의 함수가 나중에 확장되는 구조이므로 연결 순서를 유지하세요.

## 현재 구현 범위

- 홈, 정책 검색·필터·저장·비교와 상세 조건, 생활변화 가정 비교
- 준비 점검, 목표일, 제출 여부 본인 확인 기록
- 내 정보 우측 전자지갑, 서류 안내·검색·확인 기록
- 문서 직접 보관·다운로드·정책 연결·보관 해제·복원
- 우측 하단 AI 내비게이터 아이콘, 대화 패널과 화면 이동

프로필·준비 상태는 브라우저 저장소, 직접 추가한 파일은 IndexedDB에 저장합니다. 다른 기기와 자동 동기화되지 않으며 브라우저 데이터를 지우면 보관 내용이 삭제될 수 있습니다.

정책 3개는 시연 예시입니다. 실제 정책 공고, 카카오·네이버 지갑 인증·연동, 서류 발급·기관 제출, 실시간 생성형 AI는 연결되지 않았습니다. AI 내비게이터는 규칙에 따른 시연 응답입니다.

저장소 이력이나 접근용 인증 정보는 이 전달 파일에 포함하지 않았습니다.
