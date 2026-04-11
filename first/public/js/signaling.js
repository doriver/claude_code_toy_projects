class SignalingClient {
  constructor(token) {
    this.token = token;
    this.handlers = {};
    this.ws = null;
  }

  connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}?token=${this.token}`);

    this.ws.addEventListener('open', () => {
      console.log('[WS] 연결됨');
    });

    this.ws.addEventListener('message', (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      const handler = this.handlers[msg.type];
      if (handler) handler(msg);
    });

    this.ws.addEventListener('close', (e) => {
      console.warn('[WS] 연결 종료:', e.code, e.reason);
      if (e.code === 4001) {
        localStorage.clear();
        location.href = '/';
      }
    });
  }

  on(type, handler) {
    this.handlers[type] = handler;
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
