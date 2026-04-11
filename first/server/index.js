const http = require('http');
const express = require('express');
const path = require('path');
const authRoutes = require('./routes/auth');
const { setupSignaling } = require('./signaling');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api', authRoutes);

const server = http.createServer(app);
setupSignaling(server);

server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
