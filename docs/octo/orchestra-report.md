# Orchestra Sprint Report

## Sprint Overview
- 프로젝트: Flinders Collab
- 날짜: 2026-03-13
- PM CLI/Model: Codex
- 모드: 모니터링 및 리뷰 전용
- 현재 사이클: 초기 구조 파악 + 전체 코드 감사 + 빌드 검증

## Project Structure Summary
- 루트는 npm workspaces 기반이며 `client`(React 18 + Vite + Tailwind + Capacitor)와 `server`(Express + Socket.IO + Supabase)로 분리되어 있습니다.
- 데이터 계층은 `supabase/migrations`의 SQL 마이그레이션으로 관리되며, Auth/DB/Storage는 Supabase를 사용합니다.
- 서버는 정적 빌드 서빙, REST API, WebSocket을 모두 담당합니다.
- 모바일은 Capacitor Android/iOS 셸이 포함되어 있습니다.

## Verification Performed
- 설정 및 구조 검토: `package.json`, `render.yaml`, `client/vite.config.js`, `client/capacitor.config.json`, `server/src/config.js`
- 서버 핵심 흐름 검토: 인증, 방, 이벤트, 파일, 위치, 메시지, 리포트, 소켓
- 클라이언트 핵심 흐름 검토: 로그인/회원가입, 대시보드, 방 화면, 채팅, 파일, 위치, 관리자 화면
- 스키마/정책 검토: Supabase migration 전반
- 빌드 검증: `npm run build --workspace=client` 성공

## Agent Monitoring

### 먹물이
- 워크트리: `/tmp/octo-orch-1773150898424-0-1773375140892`
- 최근 커밋: 5개 확인
- 언커밋 변경: 없음
- 리뷰 메모: 현재 worktree diff 없음

### 꼬물이
- 워크트리: `/tmp/octo-orch-1773150898424-1-1773375141617`
- 최근 커밋: 5개 확인
- 언커밋 변경: 없음
- 리뷰 메모: 현재 worktree diff 없음

### 쫄깃이
- 워크트리: `/tmp/octo-orch-1773150898424-2-1773375142298`
- 최근 커밋: 5개 확인
- 언커밋 변경: 없음
- 리뷰 메모: 현재 worktree diff 없음

### 다리왕
- 워크트리: `/tmp/octo-orch-1773150898424-3-1773375142976`
- 최근 커밋: 5개 확인
- 언커밋 변경: 없음
- 리뷰 메모: 현재 worktree diff 없음

### 뿜뿜이
- 워크트리: `/tmp/octo-orch-1773150898424-4-1773375143651`
- 최근 커밋: 5개 확인
- 언커밋 변경: 없음
- 리뷰 메모: 현재 worktree diff 없음

## Conflict Check
- 에이전트 간 현재 미커밋 충돌은 없습니다.
- 다만 현재 조회된 최근 커밋 해시가 모든 워크트리에서 동일하여, 실제 분리 작업 상태인지 추가 확인이 필요합니다.

## Code Review Findings

### Critical
- 채팅 소켓 방 입장 검증이 없습니다. 임의 사용자가 `chat:join`에 아무 `roomId`나 넣어도 해당 room broadcast를 수신할 수 있어, 합법 사용자가 메시지를 보낼 때 대화 내용이 노출됩니다. 근거: `server/src/sockets/chatHandler.js:14-18`, `server/src/sockets/chatHandler.js:58-59`
- 파일 업로드가 `getPublicUrl()`로 공개 URL을 저장합니다. 저장 버킷이 public이면 방 멤버 권한과 무관하게 URL만 알면 파일 접근이 가능해질 수 있습니다. 민감한 과제 파일/문서에 부적절합니다. 근거: `server/src/controllers/fileController.js:67-80`
- 모바일 네이티브 설정이 개발용 평문 트래픽 허용 상태입니다. Android는 `usesCleartextTraffic="true"`, iOS는 `NSAllowsArbitraryLoads=true`, Capacitor는 `http://10.0.2.2:3001`과 `cleartext: true`를 사용합니다. 프로덕션 배포 시 MITM 위험이 큽니다. 근거: `client/android/app/src/main/AndroidManifest.xml:18-25`, `client/ios/App/App/Info.plist:27-31`, `client/capacitor.config.json:5-8`

### High
- 위치 소켓 로직이 존재하지 않는 `event_participants` 테이블을 조회합니다. 현재 스키마에는 해당 테이블이 없어 실시간 위치 socket flow는 실패합니다. REST 위치 API와 구현 기준도 불일치합니다. 근거: `server/src/sockets/locationHandler.js:33-50`, `supabase/migrations/001_initial_schema.sql`
- 인증 세션을 `localStorage`에 그대로 저장하고, 만료/리프레시 처리 없이 복원합니다. XSS 한 번이면 액세스 토큰과 리프레시 토큰이 그대로 탈취됩니다. 또한 만료된 세션도 UI에서 복원될 수 있습니다. 근거: `client/src/lib/auth-token.js:3-31`, `client/src/hooks/useAuth.js:9-17`, `client/src/hooks/useAuth.js:26-44`, `client/src/hooks/useAuth.js:65-82`
- 로그아웃이 서버의 세션 폐기 API를 호출하지 않고 클라이언트 저장소만 지웁니다. 탈취된 토큰이나 다른 기기 세션은 그대로 유효할 수 있습니다. 근거: `client/src/hooks/useAuth.js:87-90`, `server/src/controllers/authController.js:89-101`
- 관리자 페이지 라우트가 프런트엔드에서 관리자 여부를 검사하지 않습니다. 일반 로그인 사용자도 `/admin`으로 진입할 수 있고, 서버가 막더라도 민감한 관리 UI와 동작이 노출됩니다. 근거: `client/src/App.jsx:60-62`

### Medium
- 태스크 권한이 주석/의도보다 넓습니다. 현재는 일반 방 멤버도 `title`, `due_date`, `priority`를 수정할 수 있고, 삭제도 assignee에게 허용됩니다. 업무 위변조나 권한 혼선 위험이 있습니다. 근거: `server/src/controllers/taskController.js:88-139`, `server/src/controllers/taskController.js:162-204`
- 채팅 페이징 파라미터가 프런트/백엔드 간 불일치합니다. 클라이언트는 `cursor`, 서버는 `before`를 기대하므로 무한 스크롤/이전 메시지 로딩이 동작하지 않습니다. 근거: `client/src/services/chat.js:3-6`, `server/src/controllers/messageController.js:9-30`
- `apiUrl()` 헬퍼를 만들어 놓고 실제 서비스 호출은 모두 상대 경로 `/api/...`를 직접 사용합니다. 같은 origin이 아닌 배포나 앱 셸 환경에서 API 오동작 가능성이 남아 있습니다. 근거: `client/src/lib/api.js:1-13`, `client/src/services/auth.js:1-24`, `client/src/services/rooms.js:3-48`
- 외부 CDN 스타일시트(`unpkg`)를 SRI 없이 직접 로드합니다. 공급망 무결성 측면에서 좋지 않고, 네트워크 차단 시 지도 UI가 깨질 수 있습니다. 근거: `client/index.html:8`
- Android 앱이 `allowBackup="true"` 상태입니다. 디바이스 백업 경로를 통한 앱 데이터 노출 범위를 검토해야 합니다. 근거: `client/android/app/src/main/AndroidManifest.xml:18-19`

### Low
- 프런트 빌드는 성공했지만 JS 번들이 871 kB로 커서 모바일 초기 로딩에 부담이 큽니다.
- 디자인은 전반적으로 일관성이 있지만, 실제 `Inter` 폰트를 로드하지 않아 의도한 타이포그래피가 보장되지 않습니다. 근거: `client/src/index.css`
- 관리자/리포트 화면에서 에러를 대부분 침묵 처리하고 있어 실패 원인 파악이 어렵습니다.

## Functional Coverage Snapshot
- 회원가입/로그인: 서버 API는 존재하며 클라이언트도 연결되어 있습니다. 다만 세션 보안/만료 처리가 미흡합니다.
- 방 생성/참여: 코드상 기본 플로우는 연결되어 있습니다.
- 일정: CRUD 엔드포인트와 UI는 존재합니다.
- 실시간 채팅: 기본 전송은 가능해 보이나, 소켓 구독 권한 검증 부재가 심각합니다.
- 파일 업로드/삭제: 동작 경로는 있으나 공개 URL 저장 방식이 보안상 취약합니다.
- 실시간 위치: REST API는 존재하지만 socket 실시간 반영 경로는 현재 구현 불일치로 실패 가능성이 높습니다.
- 관리자 기능: 서버 측 권한 검사는 있으나 프런트 경로 보호는 부족합니다.

## Quality Assessment
- 아키텍처 방향은 명확하고, 서버/클라이언트/모바일 셸/DB가 모두 연결된 형태입니다.
- 그러나 보안 경계가 REST보다 소켓과 모바일 설정에서 약하고, 일부 기능은 계약 불일치가 남아 있습니다.
- 현재 상태는 데모 또는 내부 시험 수준으로는 가능하나, 외부 배포 전 보안 하드닝이 필수입니다.

## Risk Assessment
- 가장 큰 리스크는 채팅 데이터 노출, 공개 파일 URL, 모바일 평문 통신 허용입니다.
- 다음 리스크는 위치 실시간 기능 불능 가능성, 토큰 저장/로그아웃 처리 미흡, 과도한 태스크 수정 권한입니다.
- 운영 배포 전에는 HTTPS/WSS 강제, socket membership 검증, private bucket + signed URL, 세션 전략 재정비가 필요합니다.

## External Reports
- `docs/octo/octo-report-anchor.md`: 없음
- `docs/octo/octo-report-kelp.md`: 없음
- `docs/octo/octo-report-crab.md`: 없음
- `docs/octo/octo-report-shell.md`: 없음
- `docs/octo/octo-report-wave.md`: 없음

## Overall Progress Estimate
- 기능 구현 완성도: 80%
- 배포 준비도: 55%
- 보안/운영 준비도: 40%
- 종합 추정: 65%
