'use strict';
const pug = require('pug');
const Cookies = require('cookies');
const util = require('./handler-util');
const Post = require('./post');

const trackingIdKey = 'tracking_id';//変更後対応しやすいようにIDはここで代入


function handle(req, res) {
  const cookies = new Cookies(req, res);//POSTにアクセスあったらクッキーオブジェクトをつくる
  addTrackingCookie(cookies);//クッキー付与する関数

  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      //DBから全部取ってきたら、データである posts を渡す。引数に{order:[['id', 'DESC']]}入れたらID大きい順（最新のが上に表示できる）
      Post.findAll({order:[['id', 'DESC']]}).then((posts) => {
        res.end(pug.renderFile('./views/posts.pug', {
          posts: posts,
          user: req.user
        }));
        console.info(
          `閲覧されました：user: ${req.user}, ` +
          `トラッキングID: ${cookies.get(trackingIdKey) } ,` +
          `IPアドレス: ${req.connection.remoteAddress},` +
          `userAgent: ${req.headers['user-agent']} `
        );
      });
      break;
    case 'POST':
      //TODO POSTの処理
      let body = '';//文字列として
      req.on('data',(chank) => {//細切れデータが送られてきたら受け取って
        body = body + chank;//どんどん足していく。文字列連結
      }).on('end', () => {//送り終わったら
        const decoded = decodeURIComponent(body);
        const content = decoded.split('content=')[1];//配列にして文字部分だけ取る。
        console.info('投稿されました:' + content);
        
        Post.create({//データベースに保存する処理
          content: content,
          trackingCookie: cookies.get(trackingIdKey),
          postedBy:　req.user
        }).then(() => {
          handleRedirectPosts(req, res);//投稿が完了し、DB保存できたらリダイレクトする
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

//削除の処理
//DBからデータもらったらURI エンコードをデコードして、（配列挟んで文字列切り抜きして）投稿の IDを取得。
//DBでID検索したら、本人か確認できた時だけ投稿を消す。消したらリダイレクト。
function handleDelete(req, res) {
  switch (req.method) {
    case 'POST':
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        const decoded = decodeURIComponent(body);//文字化けをなくす
        const id = decoded.split('id=')[1];
        Post.findByPk(id).then((post) => {
          if (req.user === post.postedBy) {
            post.destroy().then(() => {
              console.info(
                `削除されました: user: ${req.user}, ` +
                `remoteAddress: ${req.connection.remoteAddress}, ` +
                `userAgent: ${req.headers['user-agent']} `
              );
              handleRedirectPosts(req, res);
            });
          }
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break; 
  }
}


//クッキー持ってないときに、クッキー付与する関数。もってたら何もしない
//0 以上 1 未満のランダムな小数（擬似乱数）に整数の最大値をかけ、Math.floor 関数で小数点以下を切り捨てたもの
//今＋（1秒＊60秒＊60分＊24時間）＝24時間後が期限
//ガード句を使ってもいい
function addTrackingCookie(cookies) {
  if (!cookies.get(trackingIdKey)) {
    const trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
  }
}

function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}


module.exports = {
  handle,
  handleDelete
};