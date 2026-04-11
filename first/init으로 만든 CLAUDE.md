# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# 서버 실행 (Node.js 22 내장 SQLite 사용 — --experimental-sqlite 필수)
npm start
# 또는 직접 실행
node --experimental-sqlite server/index.js
```

서버는 기본 포트 `3000`에서 실행됩니다. `PORT` 환경변수로 변경 가능합니다.

## Architecture

Express + WebSocket 단일 HTTP 서버. 인증(REST)과 P2P 시그널링(WebSocket)이 같은 포트를 공유합니다.

### 흐름 요약

1. **인증**: 클라이언트 → `POST /api/register` or `/api/login` → JWT 반환 → `localStorage` 저장
2. **WebSocket 연결**: `ws://localhost:3000?token=<JWT>` — 서버에서 토큰 검증 후 `username → ws` 맵에 등록
3. **P2P 연결 수립**:
   - Caller: 사용자 클릭 → `call-request` → 상대 수락 → `call-response` → `offer` 생성 전송
   - Callee: `offer` 수신 → `answer` 전송 → ICE candidate 교환 → DataChannel 개방
4. **채팅**: 시그널링 서버를 거치지 않고 WebRTC DataChannel로 직접 전송

### 핵심 파일

| 파일 | 역할 |
|------|------|
| `server/index.js` | Express + WS 서버 통합 진입점 |
| `server/signaling.js` | WebSocket 핸들러, `clients` Map(username→ws), 메시지 중계 |
| `server/routes/auth.js` | `/api/register`, `/api/login` |
| `server/db.js` | `node:sqlite` (Node.js 22 실험적 내장 모듈), users 테이블 |
| `server/auth.js` | `verifyToken()` + Express `authMiddleware` |
| `public/js/chat.js` | WebRTC 핵심 — `RTCPeerConnection`, DataChannel, 시그널링 메시지 처리 |
| `public/js/signaling.js` | `SignalingClient` 클래스 — WebSocket 연결 및 이벤트 라우팅 |

### WebSocket 메시지 타입

서버는 `to` 필드를 보고 대상 클라이언트에게 메시지를 중계합니다 (relay only).

`call-request` · `call-response` · `offer` · `answer` · `ice-candidate` · `user-list`(서버→전체 브로드캐스트)

### 주요 제약

- `better-sqlite3` 미사용 (네이티브 빌드 필요). `node:sqlite`는 Node.js v22.5.0+에서만 사용 가능하며 실험적 플래그 필요
- JWT secret은 `JWT_SECRET` 환경변수 (미설정 시 하드코딩된 기본값 사용 — 프로덕션 부적합)
- 외부망 P2P는 TURN 서버 없이 불가 (현재 Google STUN만 설정됨)
