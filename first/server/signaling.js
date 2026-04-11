const { WebSocketServer } = require('ws');
const { parse } = require('url');
const { verifyToken } = require('./auth');

// username -> WebSocket 맵
const clients = new Map();

function broadcastUserList() {
  const userList = Array.from(clients.keys());
  const msg = JSON.stringify({ type: 'user-list', users: userList });
  for (const ws of clients.values()) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

function setupSignaling(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const { query } = parse(req.url, true);
    const payload = verifyToken(query.token);
    if (!payload) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    const { username } = payload;

    // 중복 접속 시 기존 연결 종료
    if (clients.has(username)) {
      clients.get(username).close(4002, 'Replaced by new connection');
    }
    clients.set(username, ws);
    broadcastUserList();

    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }

      const { type, to, ...rest } = msg;
      const validTypes = ['offer', 'answer', 'ice-candidate', 'call-request', 'call-response'];
      if (!validTypes.includes(type) || !to) return;

      const targetWs = clients.get(to);
      if (targetWs && targetWs.readyState === targetWs.OPEN) {
        targetWs.send(JSON.stringify({ type, from: username, ...rest }));
      }
    });

    ws.on('close', () => {
      if (clients.get(username) === ws) {
        clients.delete(username);
        broadcastUserList();
      }
    });
  });
}

module.exports = { setupSignaling };
