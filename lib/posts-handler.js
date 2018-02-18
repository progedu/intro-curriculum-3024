// 厳密モード
'use strict';
// jadeモジュール呼び出し
const jade = require('jade');
// cookiesモジュール呼び出し
const Cookies = require('cookies');
// 自作のhandler-utilモジュール呼び出し
const util = require('./handler-util.js');
// 自作のpostモジュール呼び出し
const Post = require('./post.js');
// Cookie値のキーとして利用する文字列
const trackingIdKey = 'tracking_id';
// 投稿された内容
// const contents = [];
/**
 * /postsのURLにリクエストがあった場合に実行する関数
 * リクエストしたHTTPメソッドによって処理を分岐する
 * @param {IncomingMessage} req 
 * @param {ServerResponse} res 
 */
function handle(req, res) {
  // Cookie情報を管理するcookiesオブジェクトを生成する（まだ付与はしない）
  const cookies = new Cookies(req, res);
  // 必要に応じてCookieを付与する
  addTrackingCookie(cookies);
  switch (req.method) {
    // GETメソッドでアクセスされた場合は投稿フォームを表示する
    case 'GET':
      // 'hi'と書き出して終了
      // res.end('hi');
      /**
       * レスポンスヘッダにステータスコードとヘッダ情報を書き出す
       * 第一引数：ステータスコード(200は成功)
       * 第二引数：ヘッダ情報のオブジェクト
       */
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      // jadeファイルに渡す変数情報{jadeでの変数名: jsでの変数名}
      // let jadeOptions = { posts: posts };
      /** 
       * jadeファイルをhtml形式に変換する
       * 第一引数：jadeファイルのアドレス
       * 第二引数：変数情報のオブジェクト
      */
      // let html = jade.renderFile('./views/posts.jade', jadeOptions);
      // jadeから変換されたHTMLを書き出して終了
      // res.end(html);
      /**
       * すべての投稿データをidの降順に受け取る
       * （最新の投稿から受け取る）
       */
      let posts = Post.findAll({ order: 'id DESC' });
      // console.log(posts);
      /**
       * postsを展開してjadeテンプレートを適用して書き出す関数。
       * 書き出し終了処理も行う。
       * @param {Promise} posts 
       */
      let writeHtml = function (posts) {
        // jadeファイルに渡す変数情報{jadeでの変数名: jsでの変数名}
        let jadeOptions = {
          posts: posts,
          user: req.user
        };
        /** 
         * jadeファイルをhtml形式に変換する
         * 第一引数：jadeファイルのアドレス
         * 第二引数：変数情報のオブジェクト
        */
        let html = jade.renderFile('./views/posts.jade', jadeOptions);
        // jadeから変換されたHTMLを書き出して終了
        res.end(html);
        // 閲覧ユーザー情報を標準出力に書き出す
        console.info(
          `閲覧されました： user: ${req.user},` +
          `trackingId: ${cookies.get(trackingIdKey)},` +
          `UserAgent: ${req.headers['user-agent']},` +
          `remoteAddress: ${req.connection.remoteAddress}`
        );
      };
      // エラーが出ていなければwriteHtml()関数を実行する
      posts.then(writeHtml);
      break;
    // POSTメソッドでアクセスされた場合は書き込み処理を行う
    case 'POST':
      // POSTされたデータを受け取る配列（分割されて送信されることがあるため）
      let body = [];
      // データが送られてくると'data'イベントが起こるので、bodyにデータを格納していく
      req.on('data', (chunk) => {
        body.push(chunk);
      });
      /** 
       * 投稿とリダイレクトを行う処理
      */
      let postAndRedirect = function () {
        // 配列を結合して、文字列に変換する
        body = Buffer.concat(body).toString();
        // URIエンコードされた形でデータが送信されてくるのでデコードしてやる
        const decoded = decodeURIComponent(body);
        // 'content={投稿内容}'の形式になっているので、{投稿内容}の部分だけを取り出す
        const content = decoded.split('content=')[1];
        // 標準出力にログを書き出す
        console.info('投稿されました: ' + content);
        // ログに投稿内容を追加
        // contents.push(content);
        // これまでの投稿内容を標準出力に書き出す
        // console.info('投稿された全内容：' + contents);
        // リダイレクトを行う
        //handleRedirectPosts(req, res);
        /**
         * Postモデルを生成する(DBにも反映する)
         * 第一引数：投稿する内容のデータを持つオブジェクト
         */
        let post = Post.create({
          content: content,
          trackingCookie: cookies.get(trackingIdKey),
          postedBy: req.user
        });
        /**
         * then()はエラーが出てないなら順次処理を行うぐらいの意味？
         * 普通はチェーン的に使うようだ
         * 第一引数：　実行する処理
         */
        post.then(handleRedirectPosts(req, res))
      };
      // データをすべて受け取ると'end'イベントが起こるので、リダイレクトとログ処理を行う
      req.on('end', postAndRedirect);
      break;
    // POST, GET以外のメソッドでアクセスされた場合
    default:
      // handler-utilモジュールでBadRequest処理を行う
      util.handleBadRequest(req, res);
      break;
  }
}

/**
 * 投稿を削除する関数
 * @param {IncomingMessage} req 
 * @param {ServerResponse} res 
 */
function handleDelete(req, res) {
  // HTTPメソッドにより処理を振り分ける
  switch (req.method) {
    // POSTのみ受け付ける
    case 'POST':
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      });
      /** 
       * 実際に投稿を削除する処理
      */
      let deleteFunc = function () {
        // 配列を結合して、文字列に変換する
        body = Buffer.concat(body).toString();
        // URIエンコードされた形でデータが送信されてくるのでデコードしてやる
        const decoded = decodeURIComponent(body);
        // 'id={id}'の形式になっているのでsplitして取り出す
        const id = decoded.split('id=')[1];
        // 投稿を特定して取得する
        let post = Post.findById(id);
        /**
         * 実際に実際に投稿を削除する処理
         * @param {*} post sequelizeのModel
         */
        let del = function (post) {
          // もう一度閲覧中ユーザーと投稿したユーザーが同一かを確認する
          if (req.user === post.postedBy) {
            // 投稿削除
            post.destroy();
            // 削除処理が完了した旨を標準出力に書き出し
            console.info(
              `削除されました: user: ${req.user}, ` +
              `remoteAddress: ${req.connection.remoteAddress}, ` +
              `userAgent: ${req.headers['user-agent']} `
            );
          }
          // /postsにリダイレクト
          handleRedirectPosts(req, res);
        }
        /**
         * postが正常に取得できていればdel()関数を実行する
         * 第一引数：実行するCB関数
         * 　　CB関数の引数１：Bluebird<any>　よくわからん。sequelize.Model
         */
        post.then(function (arg) { del(arg) });
      }
      req.on('end', deleteFunc);
      break;
    // POST以外はBadRequest処理を行う 
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

/**
 * 生成されたcookiesにCookie情報を付与する
 * @param {CookiesFunction} cookies 
 */
function addTrackingCookie(cookies) {
  // cookiesにCookieが設定されていない場合
  if (!cookies.get(trackingIdKey)) {
    // ランダムな整数値を返す
    const trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    // 現在時刻の24時間後のミリ秒形式の日付を取得する
    const tomorrow = new Date(new Date().getTime() + (1000 * 60 * 60 * 24));
    /**
     * Cookie情報をセットする
     * 第一引数：Cookie値のキーとして使用する文字列
     * 第二引数：Cookie値
     * 第三引数：Cookie情報のオプションデータのオブジェクト
     * 　　expires：Cookieの有効期限
     */
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
  }
}

/**
 * リダイレクト処理の実装
 * @param {IncomingMessage} req 
 * @param {ServerResponse} res 
 */
function handleRedirectPosts(req, res) {
  // レスポンスヘッダにステータスコードと'Location'プロパティをセットすることでリダイレクトを実現する
  // 同じURLにリダイレクトを行う場合はステータスコード303を使用する
  res.writeHead(303, {
    'Location': '/posts'
  });
  // 書き出し終了
  res.end();
}

// このモジュールに関数を登録する
module.exports = {
  handle: handle,
  handleDelete: handleDelete
};