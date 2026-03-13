# Orchestra Sprint Report

## Final Summary
- 날짜: 2026-03-13
- 프로젝트: Flinders Collab
- 작업 모드: 웹 우선 보안 하드닝, 기능 검증, UX 결함 수정
- 최종 상태: 웹 핵심 보안 이슈 수정 및 검증 완료, 변경사항 모두 `main` 브랜치에 푸시 완료

## Completed Changes
- 방 간 채팅 격리 강화
  - `chat:join`, `chat:message`, `chat:typing`에서 room membership 검증 추가
  - 비멤버의 다른 방 채팅 구독 및 수신 차단
- 파일 접근 보안 강화
  - 공개 URL 저장 제거
  - storage path만 저장하고 signed download URL 발급 방식으로 전환
  - 다운로드 전 room membership 검증 추가
- 파일 삭제/보존 정책 강화
  - 삭제 시 DB row 유지, `deleted_at` 설정
  - 메인 버킷 객체만 삭제
  - 백업 버킷 객체와 `backup_path` 유지
  - 업로드 성공 조건에 백업 생성 성공 포함
- 위치 채널 접근 검증 강화
  - 존재하지 않는 `event_participants` 참조 제거
  - 실제 event-room membership 기준으로 location socket 검증
- 인증/세션 보안 강화
  - 세션 저장소를 `localStorage`에서 `sessionStorage`로 축소
  - 만료 세션 자동 폐기
  - 로그아웃 시 서버 revoke API 호출
- 관리자 라우트 보호 강화
  - 프런트엔드에서 `/admin` 진입 시 관리자 여부 확인
- 모바일 네트워크 설정 하드닝
  - Android `allowBackup=false`
  - Android `usesCleartextTraffic=false`
  - iOS ATS 전체 예외 제거
  - Capacitor 개발용 cleartext URL 제거
- 외부 스타일 의존성 정리
  - Leaflet CSS를 CDN 대신 패키지 import로 전환
- 태스크 상태 변경 UX 개선
  - optimistic update 적용
  - 실패 시 원복
  - 실패 시 토스트 에러 노출
  - 상태 변경 후 불필요한 전체 재조회 제거
  - 서버 task update/delete의 membership 중복 조회 제거
- 채팅 이름 표시 수정
  - 서버에서 `sender_name` 정규화
  - 프런트에서 `sender_name` 보정 처리
- 로고 배경 톤 정리
  - auth/logo wrapper의 이중 흰 배경 제거
  - 사이드바/모바일 메뉴 로고 wrapper 톤 통일

## Verification Run
- `npm run build --workspace=client`: 반복 실행, 모두 성공
- `node --check`:
  - `server/src/controllers/fileController.js`
  - `server/src/controllers/messageController.js`
  - `server/src/controllers/taskController.js`
  - `server/src/routes/files.js`
  - `server/src/sockets/chatHandler.js`
  - `server/src/sockets/locationHandler.js`
  - 모두 통과
- `scripts/smoke-test.sh http://127.0.0.1:3002`: 통과
- 실제 API/Socket 검증:
  - 회원가입/로그인 성공 확인
  - 로그아웃 후 토큰 재사용 차단 확인 (`/api/auth/me` -> `401`)
  - 비인증 `/api/rooms`, `/api/reports`, `/api/admin/users` -> `401`
  - 다른 방 REST 접근 차단 (`403`)
  - 다른 방 채팅 socket join 차단
  - 다른 방 메시지 수신 차단
  - 다른 방 위치 채널 접근 차단
  - signed URL 다운로드 성공
  - 다른 방 파일 다운로드 차단 (`403`)
  - 파일 삭제 후 DB row 유지 및 backup object 유지 확인
  - 태스크 create/update/list API 정상 동작 확인

## Backup Verification
- 업로드 직후:
  - 메인 버킷 객체 존재
  - 백업 버킷 객체 존재
  - DB `file_url`, `backup_path` 저장 확인
- 삭제 직후:
  - 메인 버킷 객체 제거 확인
  - 백업 버킷 객체 유지 확인
  - DB row 유지 확인
  - `deleted_at` 값 설정 확인

## Remaining Known Issues
- Android build는 여전히 실패
  - `./gradlew test`
  - `./gradlew assembleDebug`
  - 원인: `project :capacitor-android` variant resolution 실패
- 태스크 API 자체의 응답 시간은 Supabase 상태에 따라 느릴 수 있음
  - 현재는 UI를 optimistic update로 바꿔 체감 지연을 줄인 상태
- 프런트 번들이 큼
  - Vite build 결과 약 873 kB JS 번들 경고 지속

## Commits Pushed
- `52304c4` `fix: harden web security and room isolation`
- `5b9794c` `fix: reduce task status update latency`
- `ab216d3` `fix: show task update errors and rollback`
- `d652cbf` `fix: align logo background tones`
- `c022952` `fix: remove duplicate auth logo background`
- `afd3064` `fix: show chat sender names`
- `891543e` `fix: normalize chat sender names`

## Current Assessment
- 웹 보안 상태: 주요 방 간 데이터 누출 이슈 해결
- 웹 기능 상태: 핵심 흐름 동작 확인
- 운영 준비도: 웹은 테스트 가능한 수준, Android는 추가 정비 필요
