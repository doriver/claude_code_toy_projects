const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'p2pchat_secret_key';

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '인증이 필요합니다.' });
  const payload = verifyToken(token);
  if (!payload) return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
  req.user = payload;
  next();
}

module.exports = { authMiddleware, verifyToken };
