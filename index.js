const express = require('express');
const path = require('path');
const ytsr = require('ytsr')
const session = require('express-session');
const bodyParser = require('body-parser');
const ytpl = require('ytpl')
const app = express();
const PORT = process.env.PORT || 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to check if the user is logged in
const loginCheck = function(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Login Page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Login Processing
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Here you would typically check against a database
  // For simplicity, we're using hardcoded credentials
  if (username === 'misa' && password === 'misa') {
    req.session.userId = username;
    res.redirect('/');
  } else {
    res.render('login', { error: 'パスワードまたはユーザーネームが違います。' });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});
// home.html を返すルート定義
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/home.html');
});

app.get('/apis', async (req, res) => {
    const searchQuery = req.query.q;

    try {
        const searchResults = await ytsr(searchQuery);
        res.json(searchResults.items); // JSON形式で返す
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '検索中にエラーが発生しました' });
    }
});

// サーバーを開始
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});