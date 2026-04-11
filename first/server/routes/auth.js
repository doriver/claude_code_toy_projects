const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findUserByUsername } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'p2pchat_secret_key';

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }
  if (username.length < 2 || password.length < 4) {
    return res.status(400).json({ error: '아이디 2자 이상, 비밀번호 4자 이상이어야 합니다.' });
  }
  try {
    const existing = findUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    createUser(username, passwordHash);
    res.json({ message: '회원가입 성공' });
  } catch (err) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }
  try {
    const user = findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
