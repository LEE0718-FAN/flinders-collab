# 스프린트 진행 보고서

**프로젝트**: Flinders University Team Collaboration App  
**날짜**: 2026-04-02  
**프로젝트 매니저**: 비서 (Claude Opus 4.6)

---

## 프로젝트 구조 요약

- **모노레포**: `client/` (React/Vite PWA) + `server/` (Node.js/Express)
- **DB**: Supabase (PostgreSQL + Auth + Storage)
- **배포**: Render (`render.yaml`)

---

## Sprint Overview

- **날짜**: 2026-04-02
- **모니터링 상태**: 비서 직접 구현 완료 (에이전트 미가동으로 인해)
- **빌드 상태**: 성공 (3.53s)

---

## 완료된 작업

### 1. Sign Up CTA 가시성 개선 (먹물이 임무 대행)
- **파일**: `client/src/components/auth/LoginForm.jsx`
- **내용**: 
  - pulse 애니메이션 glow 배경 추가
  - 버튼 padding 증가 (py-3.5/py-4)
  - font-bold로 강화
  - shadow-xl + 더 강한 그림자
  - hover:scale 효과 추가

### 2. 사이드바별 독립 온보딩 튜토리얼 (꼬물이 임무 대행)
- **수정 파일 4개**:
  - `client/src/components/OnboardingTour.jsx` — `!isTester` 조건 제거 → 모든 사용자에게 표시
  - `client/src/pages/TimetablePage.jsx` — OnboardingTour 추가 (2단계: 소개 + 클래스메이트 채팅 설명)
  - `client/src/pages/FlindersSocialPage.jsx` — OnboardingTour 추가 (2단계: 위치 공유 설명 + 캠퍼스 떠나면 삭제 경고)
  - `client/src/pages/DeadlinesPage.jsx` — OnboardingTour tourId 업데이트 + 설명 개선
- **기존 커버리지**: DashboardPage (WelcomeTutorial + PageTour로 Create/Join Room 이미 설명 중)

### 3. NEW 뱃지 크기 축소 (쫄깃이 임무 대행)
- **파일**: `client/src/layouts/MainLayout.jsx`
- **내용**:
  - badgeLabel (NEW!) 전용 작은 스타일: h-[16px], text-[8px], px-1.5
  - badgeCount (숫자) 전용 기존 크기 유지
  - gap 2→1.5로 축소
  - shrink-0 추가로 이름 짤림 방지

### 4. 뱃지 버그 수정 (쫄깃이 임무 대행)
- **서버 수정**: `server/src/controllers/activityController.js`
  - `getUnreadActivityCounts`에 userId 파라미터 추가
  - messages → `.neq('user_id', userId)` (본인 메시지 제외)
  - files → `.neq('uploaded_by', userId)` (본인 업로드 제외)
  - events → `.neq('created_by', userId)` (본인 이벤트 제외)
  - tasks → `.neq('assigned_by', userId)` (본인 할당 제외)
- **클라이언트 수정**: `client/src/layouts/MainLayout.jsx`
  - `handleRoomActivityVisited`에서 `announcementUnreadCounts`도 함께 클리어
  - 방문 시 모든 뱃지(활동 + 공지) 동시 제거

---

## 전체 진행률

- **Sign Up CTA 개선**: 100%
- **사이드바 온보딩**: 100%
- **NEW 뱃지 축소**: 100%
- **뱃지 버그 수정**: 100%
- **전체 진행률**: 100%
- **빌드**: 성공

*마지막 업데이트: 2026-04-02*
