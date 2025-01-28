const express = require('express');
const path = require('path');
const ytsr = require('ytsr');// youtube 検索
const session = require('express-session');
const youtubei = require('youtubei')
const bodyParser = require('body-parser');
const fs = require('fs')
const YouTubeJS = require('youtubei.js');
const https = require('https')
const ytpl = require('ytpl'); // プレイリストやチャンネルの表示
const axios = require('axios'); //便利
const compression = require("compression");
const app = express();
const cluster = require('cluster')
const os = require('os')
const ytdl = require("@distube/ytdl-core");
// 使用例
const PORT = process.env.PORT || 3000; //ポート
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));
app.set('view engine', 'ejs');
// /viewsを参照
app.set('views', path.join(__dirname, 'views'));
// チェック
const loginCheck = function(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
};
// サーバー起動前に YouTube.js を初期化
// サムネイルプロキシする
app.get('/vi/:id/:imageName', loginCheck,async (req, res) => {
    const { id, imageName } = req.params;
    const imageUrl = `https://img.youtube.com/vi/${id}/${imageName}`;

    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) {
        console.error(error);
        res.status(404).send('Image not found');
    }
});

// チャンネル画像
app.get('/chimg/:id/', loginCheck,async (req, res) => {
    const { id, imageName } = req.params;
    const imageUrl = `https://yt3.ggpht.com/${id}`;

    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) {
        console.error(error);
        res.status(404).send('Image not found');
    }
});
app.get('/watch/:id', loginCheck,async (req, res) => {
  const videoId = req.params.id;
  const apiUrl = `https://super-sixth-stilton.glitch.me/api/${videoId}`;

  try {
    const response = await axios.get(apiUrl);
    const videoData = response.data;
    res.render('nocookievideo', {
      videoId,
      videoViews: videoData.videoViews,
      title: videoData.title,
      videoDes: videoData.videoDes,
      channelId: videoData.channelId,
      channelName: videoData.channelName,
      likeCount: videoData.likeCount
    });
  } 
  catch (error) {
    console.error(error);
    res.status(500).send('Error fetching video data');
  }
});
app.get('/w/:id', loginCheck,async (req, res) => {
  const videoId = req.params.id;
  const apiUrl = `https://just-frequent-network.glitch.me/api/${videoId}`;

  try {
    const response = await axios.get(apiUrl);
    const videoData = response.data;
    res.render('video', {
      videoId,
      stream_url:videoData.stream_url,
      videoViews: videoData.videoViews,
      title: videoData.Title,
      videoDes: videoData.videoDes,
      channelId: videoData.channelId,
      channelName: videoData.channelName,
      likeCount: videoData.likeCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching video data');
  }
});
// コメント
app.get('/cm/:id', loginCheck,async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(`https://ytcomment.glitch.me/cm/${id}`);
    const comments = response.data.comments;
    res.render('comment', { comments }); // コメント読み取り
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching comments" });
  }
});
// ログインしたのか
const redirectIfLoggedIn = function(req, res, next) {
  if (req.session.userId) {
    res.redirect('/');
  } else {
    next();
  }
};
// ログインページ
app.get('/login', redirectIfLoggedIn, (req, res) => {
  res.render('login', { error: null });
});
async function getInstances() {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/Tenakskd/ytserver/refs/heads/main/comment.json');
    return response.data;
  } catch (error) {
    console.error('インスタンス情報の取得に失敗しました:', error.message);
    return [];
  }
}

async function getCommentData(instances, commentId) {
  for (const instance of instances) {
    try {
      const response = await axios.get(`${instance}/api/v1/comments/${commentId}`);
      return response.data;
    } catch (error) {
      console.error(`${instance}からのデータ取得に失敗しました:`, error.message);
    }
  }
  throw new Error('全てのインスタンスでデータの取得に失敗しました');
}
// ログインページに
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Here you would typically check against a database
  // For simplicity, we're using hardcoded credentials
  if (username === 'wakame02o' && password === 'yuki') {
    req.session.userId = username;
    res.redirect('/');
  } else {
    res.render('login', { error: 'パスワードまたはユーザーネームが違います。' });
  }
});

// ログアウト
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ホーム
app.get('/', loginCheck, (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

// 検索
app.get('/search', loginCheck, async (req, res) => {
  const searchQuery = req.query.q;
  const page = parseInt(req.query.page) || 1;
  const resultsPerPage = 40;

  try {
    const searchResults = await ytsr(searchQuery, { limit: resultsPerPage * page });
    const paginatedResults = searchResults.items.slice((page - 1) * resultsPerPage, page * resultsPerPage);
    res.render('quicksearch', { results: paginatedResults, query: searchQuery, page });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ytsr error' });
  }
});

// ytsr リスポンス
app.get('/apis', loginCheck,async (req, res) => {
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
