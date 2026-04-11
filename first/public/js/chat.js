// 인증 확인
const token = localStorage.getItem('token');
const myUsername = localStorage.getItem('username');
if (!token || !myUsername) { location.href = '/'; }

document.getElementById('my-username').textContent = myUsername;
document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.clear();
  location.href = '/';
});

// ── 시그널링 ──
const signaling = new SignalingClient(token);
signaling.connect();

// ── 상태 ──
let currentPeer = null;       // 현재 채팅 상대
let pc = null;                // RTCPeerConnection
let dc = null;                // RTCDataChannel
let pendingCaller = null;     // 수락 대기 중인 요청자

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// ── DOM 요소 ──
const usersContainer = document.getElementById('users-container');
const emptyState = document.getElementById('empty-state');
const chatPanel = document.getElementById('chat-panel');
const peerAvatar = document.getElementById('peer-avatar');
const peerNameEl = document.getElementById('peer-name');
const connStatus = document.getElementById('conn-status');
const messagesEl = document.getElementById('messages');
const msgInput = document.getElementById('msg-input');
const btnSend = document.getElementById('btn-send');
const modalOverlay = document.getElementById('modal-overlay');
const modalMsg = document.getElementById('modal-msg');
const btnAccept = document.getElementById('btn-accept');
const btnReject = document.getElementById('btn-reject');

// ── 사용자 목록 업데이트 ──
signaling.on('user-list', ({ users }) => {
  usersContainer.innerHTML = '';
  users.filter(u => u !== myUsername).forEach(username => {
    const item = document.createElement('div');
    item.className = 'user-item' + (username === currentPeer ? ' active' : '');
    item.dataset.username = username;
    item.innerHTML = `
      <div class="avatar">${username[0].toUpperCase()}</div>
      <span class="username">${username}</span>
      <span class="status-dot"></span>
    `;
    item.addEventListener('click', () => requestChat(username));
    usersContainer.appendChild(item);
  });
});

// ── 채팅 요청 보내기 ──
function requestChat(username) {
  if (username === currentPeer) return;
  closeConnection();
  signaling.send({ type: 'call-request', to: username });
  showChatPanel(username);
  setStatus('요청 중...');
}

// ── 수신: 채팅 요청 ──
signaling.on('call-request', ({ from }) => {
  pendingCaller = from;
  modalMsg.textContent = `${from} 님이 채팅을 요청했습니다.`;
  modalOverlay.classList.add('show');
});

btnAccept.addEventListener('click', async () => {
  modalOverlay.classList.remove('show');
  if (!pendingCaller) return;
  signaling.send({ type: 'call-response', to: pendingCaller, accepted: true });
  showChatPanel(pendingCaller);
  // Callee는 offer를 기다림 (initiator가 offer 생성)
  pendingCaller = null;
});

btnReject.addEventListener('click', () => {
  modalOverlay.classList.remove('show');
  if (pendingCaller) {
    signaling.send({ type: 'call-response', to: pendingCaller, accepted: false });
    pendingCaller = null;
  }
});

// ── 수신: call-response ──
signaling.on('call-response', async ({ from, accepted }) => {
  if (from !== currentPeer) return;
  if (!accepted) {
    setStatus('거절됨');
    return;
  }
  // 수락됨 → Caller가 offer 생성
  await startConnection(true);
});

// ── WebRTC 연결 시작 ──
async function startConnection(isInitiator) {
  pc = new RTCPeerConnection(STUN);

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      signaling.send({ type: 'ice-candidate', to: currentPeer, candidate });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') {
      setStatus('연결됨', true);
    } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
      setStatus('연결 끊김');
      setInputEnabled(false);
    }
  };

  if (isInitiator) {
    dc = pc.createDataChannel('chat');
    setupDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    signaling.send({ type: 'offer', to: currentPeer, sdp: offer });
  } else {
    pc.ondatachannel = ({ channel }) => {
      dc = channel;
      setupDataChannel(dc);
    };
  }
}

// ── 수신: offer ──
signaling.on('offer', async ({ from, sdp }) => {
  if (from !== currentPeer) return;
  if (!pc) await startConnection(false);
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  signaling.send({ type: 'answer', to: currentPeer, sdp: answer });
});

// ── 수신: answer ──
signaling.on('answer', async ({ from, sdp }) => {
  if (from !== currentPeer || !pc) return;
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
});

// ── 수신: ICE candidate ──
signaling.on('ice-candidate', async ({ from, candidate }) => {
  if (from !== currentPeer || !pc) return;
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.warn('ICE 추가 실패:', e);
  }
});

// ── DataChannel 설정 ──
function setupDataChannel(channel) {
  channel.onopen = () => {
    setStatus('연결됨', true);
    setInputEnabled(true);
  };
  channel.onclose = () => {
    setStatus('연결 끊김');
    setInputEnabled(false);
  };
  channel.onmessage = ({ data }) => {
    appendMessage(data, false);
  };
}

// ── 메시지 전송 ──
btnSend.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !dc || dc.readyState !== 'open') return;
  dc.send(text);
  appendMessage(text, true);
  msgInput.value = '';
}

// ── UI 헬퍼 ──
function showChatPanel(username) {
  currentPeer = username;
  emptyState.style.display = 'none';
  chatPanel.style.display = 'flex';
  peerAvatar.textContent = username[0].toUpperCase();
  peerNameEl.textContent = username;
  messagesEl.innerHTML = '';
  setInputEnabled(false);
  setStatus('연결 중...');

  document.querySelectorAll('.user-item').forEach(el => {
    el.classList.toggle('active', el.dataset.username === username);
  });
}

function setStatus(text, connected = false) {
  connStatus.textContent = text;
  connStatus.className = 'connection-status' + (connected ? ' connected' : '');
}

function setInputEnabled(enabled) {
  msgInput.disabled = !enabled;
  btnSend.disabled = !enabled;
  if (enabled) msgInput.focus();
}

function appendMessage(text, isMine) {
  const div = document.createElement('div');
  div.className = 'message ' + (isMine ? 'mine' : 'theirs');
  const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = `${escapeHtml(text)}<div class="msg-time">${time}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function closeConnection() {
  if (dc) { dc.close(); dc = null; }
  if (pc) { pc.close(); pc = null; }
  currentPeer = null;
}
