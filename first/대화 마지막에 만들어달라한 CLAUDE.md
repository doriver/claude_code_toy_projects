# P2P Chat Project

## 프로젝트 개요
Vanilla JS + Node.js 기반의 P2P 1:1 채팅 웹 애플리케이션.
WebRTC DataChannel로 직접 P2P 통신, WebSocket으로 시그널링 처리.

## 실행
```bash
npm start
# http://localhost:3000
```
> Node.js 22+ 필요 (`node:sqlite` 실험적 모듈 사용)

## 기술 스택
- **프론트엔드**: Vanilla JS, HTML, CSS (빌드 도구 없음)
- **백엔드**: Node.js + Express
- **WebSocket**: ws 라이브러리 (시그널링 전용)
- **P2P**: WebRTC DataChannel (브라우저 내장 API)
- **DB**: Node.js 내장 `node:sqlite` (Visual Studio 불필요)
- **인증**: JWT (jsonwebtoken) + bcryptjs

## 프로젝트 구조
```
server/
  index.js        # Express + WS 서버 진입점
  auth.js         # JWT 검증 미들웨어 (verifyToken, authMiddleware)
  db.js           # SQLite 초기화 및 쿼리 헬퍼
  signaling.js    # WebSocket 시그널링 핸들러
  routes/
    auth.js       # POST /api/register, POST /api/login
public/
  index.html      # 로그인/회원가입 페이지
  chat.html       # 채팅 메인 페이지
  css/style.css
  js/
    auth.js       # 로그인/회원가입 UI 로직
    signaling.js  # SignalingClient 클래스 (WebSocket 래퍼)
    chat.js       # WebRTC 연결 관리 + 채팅 UI
```

## 핵심 설계
- **시그널링 메시지 타입**: `user-list`, `call-request`, `call-response`, `offer`, `answer`, `ice-candidate`
- **WebSocket 인증**: 쿼리파라미터 `?token=<JWT>`
- **REST 인증**: `Authorization: Bearer <JWT>` 헤더
- **DB 파일**: 프로젝트 루트 `chat.db` (gitignore 권장)
- **JWT Secret**: 환경변수 `JWT_SECRET` (기본값: `p2pchat_secret_key`)

## 주의사항
- `better-sqlite3` 사용 불가 (네이티브 빌드 → Visual Studio 필요)
- WebRTC는 로컬 네트워크에서만 동작; 외부망은 TURN 서버 필요
- `node:sqlite`는 실험적 기능 → 경고 메시지 정상
